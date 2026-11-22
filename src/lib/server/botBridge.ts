import type {
	BotCommand,
	BotPublicStats,
	GameCode,
	GameId,
	GuildDetails,
	ServerConfig,
	ServerSettings,
	ServerSnapshot,
	SupportedLanguage
} from '#lib/types.ts';
import {
	normalizeExternalCodes,
	redactPrivateStrings,
	signBotRequestHeaders,
	type RawExternalCode
} from './bridgeCrypto.ts';

const env = process.env;

const GAME_API_MAP: Record<GameId, string> = {
	genshin: 'genshin',
	hsr: 'hkrpg',
	zzz: 'nap'
};

const TRANSIENT_STATUS = new Set([502, 503, 504]);

function getBotBaseUrl(): string {
	const raw = env.MAIN_BOT_API_URL?.trim();
	if (!raw) {
		throw new Error('Bot API is not configured');
	}
	return raw.replace(/\/+$/, '');
}

export function createRedactedJsonResponse(data: unknown, init?: ResponseInit): Response {
	const body = redactPrivateStrings(data, env);
	const headers = new Headers(init?.headers);
	headers.set('Content-Type', 'application/json');
	headers.set('Cache-Control', headers.get('Cache-Control') || 'no-store');
	return new Response(body, { ...init, headers });
}

interface BotFetchOptions {
	method?: 'GET' | 'POST' | 'PUT';
	body?: unknown;
	actor?: string | null;
	signed?: boolean;
	timeoutMs?: number;
	retries?: number;
}

export async function fetchFromBot(endpoint: string, options: BotFetchOptions = {}): Promise<Response> {
	const baseUrl = getBotBaseUrl();
	const normalizedPath = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
	const url = `${baseUrl}${normalizedPath}`;
	const method = options.method ?? 'GET';
	const rawBody = options.body !== undefined ? JSON.stringify(options.body) : '';
	const timeoutMs = options.timeoutMs ?? 12_000;
	const maxAttempts = method === 'GET' ? (options.retries ?? 2) : 1;

	const secret = env.AUTH_BOT_SECRET?.trim() || '';
	const edgeSecret = env.VPS_EDGE_SECRET?.trim() || null;

	let lastError: unknown = null;

	for (let attempt = 0; attempt < maxAttempts; attempt++) {
		const headers: Record<string, string> =
			options.signed !== false && secret
				? signBotRequestHeaders({
						secret,
						method,
						path: normalizedPath,
						rawBody,
						actor: options.actor ?? null,
						edgeSecret
					})
				: {
						'Content-Type': 'application/json',
						...(edgeSecret ? { 'X-Edge-Secret': edgeSecret } : {})
					};

		try {
			const response = await fetch(url, {
				method,
				headers,
				body: method === 'GET' ? undefined : rawBody,
				cache: 'no-store',
				signal: AbortSignal.timeout(timeoutMs)
			});

			if (TRANSIENT_STATUS.has(response.status) && attempt + 1 < maxAttempts) {
				await new Promise((r) => setTimeout(r, 250 * (attempt + 1)));
				continue;
			}
			return response;
		} catch (err) {
			lastError = err;
			if (attempt + 1 < maxAttempts) {
				await new Promise((r) => setTimeout(r, 250 * (attempt + 1)));
				continue;
			}
		}
	}

	throw lastError instanceof Error ? lastError : new Error('Bot API unreachable');
}

export async function proxyBotJson(
	endpoint: string,
	options: BotFetchOptions = {}
): Promise<{ status: number; data: unknown }> {
	const res = await fetchFromBot(endpoint, options);
	const data = await res.json().catch(() => ({ error: 'Invalid bot response' }));
	return { status: res.status, data };
}

export async function fetchCodesForGame(game: GameId): Promise<GameCode[]> {
	// 1. Try bot per-game endpoint first (preserves HoYoLAB-merged codes)
	if (env.MAIN_BOT_API_URL?.trim()) {
		try {
			const res = await fetchFromBot(`/api/codes/${game}`, {
				signed: false,
				timeoutMs: 8000,
				retries: 2
			});
			if (res.ok) {
				const data = (await res.json()) as { codes?: RawExternalCode[] };
				if (Array.isArray(data.codes)) {
					return normalizeExternalCodes(data.codes, game);
				}
			}
		} catch {
			// Fall back to public API below
		}
	}

	// 2. Fallback to public code API
	const res = await fetch(`https://hoyo-codes.seria.moe/codes?game=${GAME_API_MAP[game]}`, {
		headers: { 'User-Agent': 'HoYo-Code-Sender-Dashboard/2.0' },
		signal: AbortSignal.timeout(8000)
	});
	if (!res.ok) {
		throw new Error(`Code API responded with status ${res.status}`);
	}
	const data = (await res.json()) as { codes?: RawExternalCode[] };
	if (!Array.isArray(data.codes)) {
		throw new Error('Invalid code API response');
	}
	return normalizeExternalCodes(data.codes, game);
}

export async function fetchAllCodes(): Promise<{
	codes: GameCode[];
	source: 'bot' | 'fallback';
	fetchedAt: string;
}> {
	// 1. Prefer unified single-round-trip /api/codes from updated VPS bot
	if (env.MAIN_BOT_API_URL?.trim()) {
		try {
			const res = await fetchFromBot('/api/codes', { signed: false, timeoutMs: 8000, retries: 2 });
			if (res.ok) {
				const data = (await res.json()) as {
					games?: Record<GameId, { codes?: RawExternalCode[] }>;
					fetchedAt?: string;
				};
				if (data.games) {
					const all: GameCode[] = [];
					for (const game of ['zzz', 'genshin', 'hsr'] as GameId[]) {
						const rows = data.games[game]?.codes;
						if (Array.isArray(rows)) {
							all.push(...normalizeExternalCodes(rows, game));
						}
					}
					if (all.length > 0) {
						return {
							codes: all,
							source: 'bot',
							fetchedAt: data.fetchedAt || new Date().toISOString()
						};
					}
				}
			}
		} catch {
			// Try per-game bot endpoints / public fallback below
		}
	}

	// 2. Per-game fetch (tries bot /api/codes/:game first, then seria.moe fallback)
	const results = await Promise.allSettled(
		(['zzz', 'genshin', 'hsr'] as GameId[]).map((game) => fetchCodesForGame(game))
	);

	const codes: GameCode[] = [];
	for (const r of results) {
		if (r.status === 'fulfilled') codes.push(...r.value);
	}

	return {
		codes,
		source: 'fallback',
		fetchedAt: new Date().toISOString()
	};
}

export async function fetchBotStats(): Promise<BotPublicStats | null> {
	if (!env.MAIN_BOT_API_URL?.trim() || !env.AUTH_BOT_SECRET?.trim()) return null;
	try {
		const res = await fetchFromBot('/api/bot/stats', { timeoutMs: 7000, retries: 2 });
		if (!res.ok) return null;
		const raw = (await res.json()) as Record<string, unknown>;
		const botUser = raw.botUser as Record<string, unknown> | undefined;
		const guildCount = Number(raw.guildCount || raw.servers || 0);
		return {
			guildCount,
			servers: guildCount,
			userCount: Number(raw.userCount || 0),
			channelCount: Number(raw.channelCount || 0),
			shardCount: Number(raw.shardCount || 1),
			ping: Number(raw.ping ?? -1),
			uptime: Number(raw.uptime || 0),
			status: Number(raw.status ?? 0),
			version: typeof raw.version === 'string' ? raw.version : '2.0.0',
			botUser: botUser
				? {
						username: String(botUser.username || 'HoYo Code Sender'),
						id: String(botUser.id || ''),
						avatar: typeof botUser.avatar === 'string' ? botUser.avatar : null
					}
				: null
		};
	} catch {
		return null;
	}
}

export async function fetchBotCommands(): Promise<BotCommand[]> {
	if (!env.MAIN_BOT_API_URL?.trim() || !env.AUTH_BOT_SECRET?.trim()) return [];
	try {
		const res = await fetchFromBot('/api/bot/commands', { timeoutMs: 7000, retries: 2 });
		if (!res.ok) return [];
		const raw = (await res.json()) as { commands?: BotCommand[] };
		return Array.isArray(raw.commands) ? raw.commands : [];
	} catch {
		return [];
	}
}

export async function fetchBotGuildIds(actor?: string | null): Promise<Set<string>> {
	if (!env.MAIN_BOT_API_URL?.trim() || !env.AUTH_BOT_SECRET?.trim()) return new Set();
	try {
		const res = await fetchFromBot('/api/bot/guilds', { actor, timeoutMs: 8000, retries: 2 });
		if (!res.ok) return new Set();
		const raw = (await res.json()) as { guilds?: Array<{ id: string }> };
		return new Set((raw.guilds || []).map((g) => g.id));
	} catch {
		return new Set();
	}
}

function normalizeServerConfig(serverId: string, raw: Record<string, unknown> | null): ServerConfig {
	const threads = (raw?.forumThreads as Record<string, unknown> | undefined) || {};
	return {
		guildId: typeof raw?.guildId === 'string' ? raw.guildId : serverId,
		genshinRole: typeof raw?.genshinRole === 'string' ? raw.genshinRole : null,
		hsrRole: typeof raw?.hsrRole === 'string' ? raw.hsrRole : null,
		zzzRole: typeof raw?.zzzRole === 'string' ? raw.zzzRole : null,
		channel: typeof raw?.channel === 'string' ? raw.channel : null,
		livestreamChannel: typeof raw?.livestreamChannel === 'string' ? raw.livestreamChannel : null,
		forumThreads: {
			genshin: typeof threads.genshin === 'string' ? threads.genshin : null,
			hsr: typeof threads.hsr === 'string' ? threads.hsr : null,
			zzz: typeof threads.zzz === 'string' ? threads.zzz : null
		}
	};
}

function normalizeServerSettings(serverId: string, raw: Record<string, unknown> | null): ServerSettings {
	const autoOpts = (raw?.autoSendOptions as Record<string, unknown> | undefined) || {};
	const fav = (raw?.favoriteGames as Record<string, unknown> | undefined) || {};
	const favGames = (fav.games as Record<string, unknown> | undefined) || {};
	return {
		guildId: typeof raw?.guildId === 'string' ? raw.guildId : serverId,
		autoSendEnabled: raw?.autoSendEnabled !== false,
		autoSendOptions: {
			channel: autoOpts.channel !== false,
			threads: autoOpts.threads !== false
		},
		livestreamAnnouncementsEnabled: raw?.livestreamAnnouncementsEnabled !== false,
		favoriteGames: {
			enabled: Boolean(fav.enabled),
			games: {
				genshin: favGames.genshin !== false,
				hkrpg: favGames.hkrpg !== false,
				nap: favGames.nap !== false
			}
		}
	};
}

export async function fetchServerSnapshot(
	serverId: string,
	actor?: string | null
): Promise<{ status: number; data: ServerSnapshot | { error: string } }> {
	const res = await fetchFromBot(`/api/server/${serverId}/snapshot`, {
		method: 'GET',
		actor,
		timeoutMs: 10_000,
		retries: 2
	});

	if (res.status !== 404) {
		const data = (await res.json().catch(() => ({ error: 'Invalid bot response' }))) as
			| ServerSnapshot
			| { error: string };
		return { status: res.status, data };
	}

	// Legacy fallback if VPS bot hasn't deployed /snapshot yet
	const [guildRes, configRes, settingsRes, langRes] = await Promise.all([
		fetchFromBot(`/api/bot/guild/${serverId}`, { actor, timeoutMs: 8000, retries: 2 }),
		fetchFromBot(`/api/server/${serverId}/config`, { actor, timeoutMs: 8000, retries: 2 }),
		fetchFromBot(`/api/server/${serverId}/settings`, { actor, timeoutMs: 8000, retries: 2 }),
		fetchFromBot(`/api/server/${serverId}/language`, { actor, timeoutMs: 8000, retries: 2 })
	]);

	if (!guildRes.ok) {
		const err = (await guildRes.json().catch(() => ({ error: 'Server not found' }))) as {
			error?: string;
		};
		return { status: guildRes.status, data: { error: err.error || 'Server not found' } };
	}

	const rawGuild = (await guildRes.json()) as GuildDetails;
	const guild: GuildDetails = { ...rawGuild, threads: Array.isArray(rawGuild.threads) ? rawGuild.threads : [] };
	const rawConfig = configRes.ok ? ((await configRes.json()) as Record<string, unknown>) : null;
	const rawSettings = settingsRes.ok ? ((await settingsRes.json()) as Record<string, unknown>) : null;
	const rawLang = langRes.ok ? ((await langRes.json()) as Record<string, unknown>) : null;
	const langVal = rawLang?.language;
	const language: SupportedLanguage =
		langVal === 'jp' || langVal === 'vi' || langVal === 'en' ? langVal : 'en';

	return {
		status: 200,
		data: {
			guild,
			config: normalizeServerConfig(serverId, rawConfig),
			settings: normalizeServerSettings(serverId, rawSettings),
			language,
			fetchedAt: new Date().toISOString()
		}
	};
}

export async function saveServerSnapshot(
	serverId: string,
	payload: { config?: unknown; settings?: unknown; language?: string },
	actor?: string | null
): Promise<{ status: number; data: ServerSnapshot | { error: string } }> {
	const res = await fetchFromBot(`/api/server/${serverId}/snapshot`, {
		method: 'PUT',
		body: payload,
		actor,
		timeoutMs: 12_000,
		retries: 1
	});

	if (res.status !== 404) {
		const data = (await res.json().catch(() => ({ error: 'Invalid bot response' }))) as
			| ServerSnapshot
			| { error: string };
		return { status: res.status, data };
	}

	// Legacy fallback if VPS bot hasn't deployed /snapshot yet
	if (payload.config !== undefined) {
		const r = await fetchFromBot(`/api/server/${serverId}/config`, {
			method: 'PUT',
			body: payload.config,
			actor
		});
		if (!r.ok) {
			const e = (await r.json().catch(() => ({ error: 'Failed to update config' }))) as { error: string };
			return { status: r.status, data: e };
		}
	}
	if (payload.settings !== undefined) {
		const r = await fetchFromBot(`/api/server/${serverId}/settings`, {
			method: 'PUT',
			body: payload.settings,
			actor
		});
		if (!r.ok) {
			const e = (await r.json().catch(() => ({ error: 'Failed to update settings' }))) as { error: string };
			return { status: r.status, data: e };
		}
	}
	if (payload.language !== undefined) {
		const r = await fetchFromBot(`/api/server/${serverId}/language`, {
			method: 'PUT',
			body: { language: payload.language },
			actor
		});
		if (!r.ok) {
			const e = (await r.json().catch(() => ({ error: 'Failed to update language' }))) as { error: string };
			return { status: r.status, data: e };
		}
	}

	return fetchServerSnapshot(serverId, actor);
}

export async function triggerServerTest(
	serverId: string,
	actor?: string | null
): Promise<{ status: number; data: Record<string, unknown> }> {
	const res = await fetchFromBot(`/api/server/${serverId}/test`, {
		method: 'POST',
		body: {},
		actor,
		timeoutMs: 12_000,
		retries: 1
	});
	const data = (await res.json().catch(() => ({ error: 'Failed to send test notification' }))) as Record<
		string,
		unknown
	>;
	return { status: res.status, data };
}

export async function triggerServerReset(
	serverId: string,
	actor?: string | null
): Promise<{ status: number; data: Record<string, unknown> }> {
	const res = await fetchFromBot(`/api/server/${serverId}/reset`, {
		method: 'POST',
		body: {},
		actor,
		timeoutMs: 12_000,
		retries: 1
	});
	const data = (await res.json().catch(() => ({ error: 'Failed to reset server configuration' }))) as Record<
		string,
		unknown
	>;
	return { status: res.status, data };
}
