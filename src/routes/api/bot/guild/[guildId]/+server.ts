import type { RequestHandler } from './$types';
import { createRedactedJsonResponse, proxyBotJson } from '#lib/server/botBridge.ts';
import { authorizeGuildRequest } from '#lib/server/discordAuth.ts';

export const GET: RequestHandler = async ({ request, url, cookies, params }) => {
	const auth = await authorizeGuildRequest(request, url, cookies, params.guildId);
	if (auth.errorResponse) return auth.errorResponse;

	try {
		const { status, data } = await proxyBotJson(`/api/bot/guild/${params.guildId}`, {
			actor: auth.actorId
		});
		return createRedactedJsonResponse(data, { status });
	} catch {
		return createRedactedJsonResponse({ error: 'Bot API is unreachable' }, { status: 503 });
	}
};
