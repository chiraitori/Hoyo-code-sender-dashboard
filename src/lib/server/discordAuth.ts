import type { Cookies } from '@sveltejs/kit';

const privateEnv = process.env;
const publicEnv = process.env;

export interface DiscordGuild {
	id: string;
	name: string;
	icon: string | null;
	owner: boolean;
	permissions: string;
}

export interface SessionUser {
	id: string;
	username: string;
	avatar: string | null;
	guildsCount: number;
}

const DISCORD_SNOWFLAKE_REGEX = /^\d{17,20}$/;

export function getDiscordClientId(): string | null {
	return (
		publicEnv.PUBLIC_DISCORD_CLIENT_ID?.trim() ||
		privateEnv.NEXT_PUBLIC_DISCORD_CLIENT_ID?.trim() ||
		privateEnv.DISCORD_CLIENT_ID?.trim() ||
		null
	);
}

export function getAppOrigin(fallbackUrl: URL): string {
	const configured =
		publicEnv.PUBLIC_APP_URL?.trim() || privateEnv.NEXT_PUBLIC_APP_URL?.trim() || '';
	if (configured) {
		try {
			return new URL(configured).origin;
		} catch {
			// fall back to request origin
		}
	}
	return fallbackUrl.origin;
}

export function buildBotInviteUrl(guildId?: string): string | null {
	const clientId = getDiscordClientId();
	if (!clientId) return null;
	const url = new URL('https://discord.com/api/oauth2/authorize');
	url.searchParams.set('client_id', clientId);
	url.searchParams.set('permissions', '274878221312');
	url.searchParams.set('scope', 'bot applications.commands');
	if (guildId && DISCORD_SNOWFLAKE_REGEX.test(guildId)) {
		url.searchParams.set('guild_id', guildId);
	}
	return url.toString();
}

export function getSessionUser(cookies: Cookies): SessionUser | null {
	const token = cookies.get('discord_access_token');
	const rawUser = cookies.get('discord_user');
	if (!token || !rawUser) return null;
	try {
		const parsed = JSON.parse(rawUser) as Record<string, unknown>;
		if (typeof parsed.id !== 'string' || typeof parsed.username !== 'string') return null;
		return {
			id: parsed.id,
			username: parsed.username,
			avatar: typeof parsed.avatar === 'string' ? parsed.avatar : null,
			guildsCount: Number(parsed.guilds || parsed.guildsCount || 0)
		};
	} catch {
		return null;
	}
}

export function canManageGuild(guild: DiscordGuild): boolean {
	try {
		const permissions = BigInt(guild.permissions);
		return (
			guild.owner ||
			(permissions & 8n) !== 0n || // ADMINISTRATOR
			(permissions & 32n) !== 0n || // MANAGE_GUILD
			(permissions & 16n) !== 0n // MANAGE_CHANNELS
		);
	} catch {
		return false;
	}
}

export function checkMutationOrigin(request: Request, url: URL): Response | null {
	if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return null;
	const expectedOrigin = getAppOrigin(url);
	if (request.headers.get('origin') !== expectedOrigin) {
		return new Response(JSON.stringify({ error: 'Invalid request origin' }), {
			status: 403,
			headers: { 'Content-Type': 'application/json' }
		});
	}
	return null;
}

const guildRequests = new Map<string, Promise<{ guilds?: DiscordGuild[]; errorStatus?: number }>>();

export async function fetchUserGuilds(
	cookies: Cookies
): Promise<{ guilds?: DiscordGuild[]; errorStatus?: number }> {
	const token = cookies.get('discord_access_token');
	if (!token) return { errorStatus: 401 };

	const pending = guildRequests.get(token);
	if (pending) return pending;

	const lookup = (async () => {
		try {
			const guilds: DiscordGuild[] = [];
			let after = '';
			do {
				const res = await fetch(
					`https://discord.com/api/users/@me/guilds?limit=200${after ? `&after=${after}` : ''}`,
					{
						headers: { Authorization: `Bearer ${token}` },
						cache: 'no-store',
						signal: AbortSignal.timeout(10_000)
					}
				);
				if (!res.ok) {
					return { errorStatus: res.status === 401 || res.status === 403 ? 401 : 503 };
				}
				const page = (await res.json()) as DiscordGuild[];
				guilds.push(...page);
				if (page.length < 200) break;
				const next = page[page.length - 1]?.id || '';
				if (!next || next === after) break;
				after = next;
			} while (after);
			return { guilds };
		} catch {
			return { errorStatus: 503 };
		}
	})();

	guildRequests.set(token, lookup);
	try {
		return await lookup;
	} finally {
		guildRequests.delete(token);
	}
}

export async function authorizeGuildRequest(
	request: Request,
	url: URL,
	cookies: Cookies,
	guildId: string
): Promise<{ errorResponse?: Response; actorId?: string | null }> {
	if (!DISCORD_SNOWFLAKE_REGEX.test(guildId)) {
		return {
			errorResponse: new Response(JSON.stringify({ error: 'Invalid server ID' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' }
			})
		};
	}

	const originError = checkMutationOrigin(request, url);
	if (originError) return { errorResponse: originError };

	const result = await fetchUserGuilds(cookies);
	if (!result.guilds) {
		const status = result.errorStatus ?? 401;
		return {
			errorResponse: new Response(
				JSON.stringify({ error: status === 401 ? 'Not authenticated' : 'Could not verify Discord permissions' }),
				{ status, headers: { 'Content-Type': 'application/json' } }
			)
		};
	}

	if (!result.guilds.some((g) => g.id === guildId && canManageGuild(g))) {
		return {
			errorResponse: new Response(JSON.stringify({ error: 'You cannot manage this server' }), {
				status: 403,
				headers: { 'Content-Type': 'application/json' }
			})
		};
	}

	const session = getSessionUser(cookies);
	return { actorId: session?.id ?? null };
}
