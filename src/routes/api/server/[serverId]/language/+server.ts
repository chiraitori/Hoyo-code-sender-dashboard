import type { RequestHandler } from './$types';
import { createRedactedJsonResponse, proxyBotJson } from '#lib/server/botBridge.ts';
import { authorizeGuildRequest } from '#lib/server/discordAuth.ts';

export const GET: RequestHandler = async ({ request, url, cookies, params }) => {
	const auth = await authorizeGuildRequest(request, url, cookies, params.serverId);
	if (auth.errorResponse) return auth.errorResponse;

	try {
		const { status, data } = await proxyBotJson(`/api/server/${params.serverId}/language`, {
			actor: auth.actorId
		});
		return createRedactedJsonResponse(data, { status });
	} catch {
		return createRedactedJsonResponse({ error: 'Bot API is unreachable' }, { status: 503 });
	}
};

export const PUT: RequestHandler = async ({ request, url, cookies, params }) => {
	const auth = await authorizeGuildRequest(request, url, cookies, params.serverId);
	if (auth.errorResponse) return auth.errorResponse;

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return createRedactedJsonResponse({ error: 'Malformed JSON body' }, { status: 400 });
	}

	try {
		const { status, data } = await proxyBotJson(`/api/server/${params.serverId}/language`, {
			method: 'PUT',
			body,
			actor: auth.actorId
		});
		return createRedactedJsonResponse(data, { status });
	} catch {
		return createRedactedJsonResponse({ error: 'Bot API is unreachable' }, { status: 503 });
	}
};
