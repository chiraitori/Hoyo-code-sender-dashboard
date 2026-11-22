import type { RequestHandler } from './$types';
import { createRedactedJsonResponse, triggerServerReset } from '#lib/server/botBridge.ts';
import { authorizeGuildRequest } from '#lib/server/discordAuth.ts';

export const POST: RequestHandler = async ({ request, url, cookies, params }) => {
	const auth = await authorizeGuildRequest(request, url, cookies, params.serverId);
	if (auth.errorResponse) return auth.errorResponse;

	try {
		const { status, data } = await triggerServerReset(params.serverId, auth.actorId);
		return createRedactedJsonResponse(data, { status });
	} catch {
		return createRedactedJsonResponse({ error: 'Bot API is unreachable' }, { status: 503 });
	}
};
