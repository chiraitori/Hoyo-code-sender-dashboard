import type { RequestHandler } from './$types';
import { createRedactedJsonResponse, triggerServerTest } from '#lib/server/botBridge.ts';
import { authorizeGuildRequest } from '#lib/server/discordAuth.ts';
import type { GameId } from '#lib/types.ts';

export const POST: RequestHandler = async ({ request, url, cookies, params }) => {
	const auth = await authorizeGuildRequest(request, url, cookies, params.serverId);
	if (auth.errorResponse) return auth.errorResponse;

	let game: GameId | null = null;
	try {
		const rawText = await request.text();
		if (rawText.trim()) {
			const parsed = JSON.parse(rawText) as { game?: unknown };
			if (parsed.game === 'genshin' || parsed.game === 'hsr' || parsed.game === 'zzz') {
				game = parsed.game;
			} else if (parsed.game !== undefined && parsed.game !== null && parsed.game !== '') {
				return createRedactedJsonResponse({ error: 'Invalid test game' }, { status: 400 });
			}
		}
	} catch {
		return createRedactedJsonResponse({ error: 'Invalid JSON request body' }, { status: 400 });
	}

	try {
		const { status, data } = await triggerServerTest(params.serverId, auth.actorId, game);
		return createRedactedJsonResponse(data, { status });
	} catch {
		return createRedactedJsonResponse({ error: 'Bot API is unreachable' }, { status: 503 });
	}
};
