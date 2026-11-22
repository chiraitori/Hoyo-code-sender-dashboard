import { createHash, createHmac, randomBytes, randomUUID } from 'node:crypto';

const SIGNATURE_VERSION = 'v1';
const DISCORD_SNOWFLAKE_REGEX = /^\d{17,20}$/;

export function sha256Hex(rawBody: string | Buffer): string {
	return createHash('sha256').update(rawBody).digest('hex');
}

export function buildCanonicalPayload(params: {
	method: string;
	path: string;
	timestamp: string;
	nonce: string;
	rawBody: string | Buffer;
}): string {
	const method = params.method.toUpperCase();
	const bodyHash = sha256Hex(params.rawBody);
	return `${method}\n${params.path}\n${params.timestamp}\n${params.nonce}\n${bodyHash}`;
}

export function signBotRequestHeaders(params: {
	secret: string;
	method: string;
	path: string;
	rawBody?: string | Buffer;
	timestamp?: number;
	nonce?: string;
	actor?: string | null;
	requestId?: string;
	edgeSecret?: string | null;
}): Record<string, string> {
	const ts = String(params.timestamp ?? Math.floor(Date.now() / 1000));
	const nonce = params.nonce ?? randomBytes(16).toString('hex');
	const requestId = params.requestId ?? randomUUID();
	const rawBody = params.rawBody ?? '';

	const canonical = buildCanonicalPayload({
		method: params.method,
		path: params.path,
		timestamp: ts,
		nonce,
		rawBody
	});

	const mac = createHmac('sha256', params.secret).update(canonical, 'utf8').digest('hex');

	const headers: Record<string, string> = {
		'Content-Type': 'application/json',
		'X-Dashboard-Timestamp': ts,
		'X-Dashboard-Nonce': nonce,
		'X-Dashboard-Signature': `${SIGNATURE_VERSION}=${mac}`,
		'X-Request-Id': requestId
	};

	if (params.actor && DISCORD_SNOWFLAKE_REGEX.test(params.actor)) {
		headers['X-Dashboard-Actor'] = params.actor;
	}
	if (params.edgeSecret) {
		headers['X-Edge-Secret'] = params.edgeSecret;
	}

	return headers;
}

export function redactPrivateStrings(
	data: unknown,
	env: Record<string, string | undefined>
): string {
	const privateValues: string[] = [];
	for (const key of ['MAIN_BOT_API_URL', 'AUTH_BOT_SECRET', 'VPS_EDGE_SECRET', 'DISCORD_CLIENT_SECRET']) {
		const val = env[key];
		if (val) privateValues.push(val);
	}
	if (env.MAIN_BOT_API_URL) {
		try {
			const parsed = new URL(env.MAIN_BOT_API_URL);
			privateValues.push(parsed.origin, parsed.hostname);
		} catch {
			// ignore invalid URL
		}
	}

	return JSON.stringify(data, (_key, value: unknown) => {
		if (typeof value !== 'string') return value;
		return privateValues.some((secret) => secret && value.includes(secret)) ? '[redacted]' : value;
	});
}

export interface RawExternalCode {
	code: string;
	rewards?: string;
	status?: string;
	isExpired?: boolean;
	timestamp?: string;
	offlineAt?: number;
	offline_at?: number;
	isLivestream?: boolean;
}

export function normalizeExternalCodes(
	rows: RawExternalCode[],
	game: 'genshin' | 'hsr' | 'zzz',
	now = Date.now()
) {
	const redeemBases = {
		genshin: 'https://genshin.hoyoverse.com/en/gift?code=',
		hsr: 'https://hsr.hoyoverse.com/gift?code=',
		zzz: 'https://zenless.hoyoverse.com/redemption?code='
	};

	return rows
		.filter((row) => row && typeof row.code === 'string' && row.code.trim().length > 0)
		.map((row) => {
			const expiry = Number(row.offlineAt || row.offline_at || 0);
			const isExpired =
				row.isExpired === true ||
				(row.status !== undefined && row.status !== 'OK') ||
				(expiry > 0 && expiry * 1000 <= now);
			const code = row.code.trim();
			return {
				code,
				game,
				rewards: typeof row.rewards === 'string' && row.rewards.trim() ? row.rewards.trim() : 'In-game rewards',
				isExpired,
				isLivestream: Boolean(row.isLivestream) || (expiry > 0 && expiry * 1000 - now < 36 * 60 * 60 * 1000 && !isExpired),
				timestamp: row.timestamp || new Date(now).toISOString(),
				redeemUrl: `${redeemBases[game]}${encodeURIComponent(code)}`
			};
		});
}
