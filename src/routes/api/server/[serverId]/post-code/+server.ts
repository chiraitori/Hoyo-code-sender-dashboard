import type { RequestHandler } from './$types';
import { createRedactedJsonResponse, triggerServerPostCode } from '#lib/server/botBridge.ts';
import { authorizeGuildRequest } from '#lib/server/discordAuth.ts';
import type { GameId } from '#lib/types.ts';

export const POST: RequestHandler = async ({ request, url, cookies, params }) => {
	const auth = await authorizeGuildRequest(request, url, cookies, params.serverId);
	if (auth.errorResponse) return auth.errorResponse;

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return createRedactedJsonResponse({ error: 'Invalid JSON request body' }, { status: 400 });
	}

	if (!body || typeof body !== 'object' || Array.isArray(body)) {
		return createRedactedJsonResponse({ error: 'Invalid code broadcast payload' }, { status: 400 });
	}

	const raw = body as Record<string, unknown>;
	const game = raw.game;
	if (game !== 'genshin' && game !== 'hsr' && game !== 'zzz') {
		return createRedactedJsonResponse({ error: 'Select a valid game' }, { status: 400 });
	}

	if (!Array.isArray(raw.codes) || raw.codes.length === 0 || raw.codes.length > 3) {
		return createRedactedJsonResponse({ error: 'Provide between 1 and 3 codes' }, { status: 400 });
	}

	const codes = raw.codes
		.filter((c): c is string => typeof c === 'string')
		.map((c) => c.trim().toUpperCase())
		.filter((c) => /^[A-Z0-9_-]{3,32}$/.test(c));
	if (codes.length === 0) {
		return createRedactedJsonResponse({ error: 'Codes must be 3-32 alphanumeric characters' }, { status: 400 });
	}

	const targetRaw = raw.target;
	const target: 'auto' | 'channel' | 'livestream' | 'thread' =
		targetRaw === 'channel' || targetRaw === 'livestream' || targetRaw === 'thread'
			? targetRaw
			: 'auto';

	try {
		const { status, data } = await triggerServerPostCode(
			params.serverId,
			{
				game: game as GameId,
				codes: [...new Set(codes)],
				message: typeof raw.message === 'string' ? raw.message.trim().slice(0, 500) : '',
				mentionRole: typeof raw.mentionRole === 'boolean' ? raw.mentionRole : true,
				target
			},
			auth.actorId
		);
		return createRedactedJsonResponse(data, { status });
	} catch {
		return createRedactedJsonResponse({ error: 'Bot API is unreachable' }, { status: 503 });
	}
};
