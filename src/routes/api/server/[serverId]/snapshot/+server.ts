import type { RequestHandler } from './$types';
import {
	createRedactedJsonResponse,
	fetchServerSnapshot,
	saveServerSnapshot
} from '#lib/server/botBridge.ts';
import { authorizeGuildRequest } from '#lib/server/discordAuth.ts';

export const GET: RequestHandler = async ({ request, url, cookies, params }) => {
	const auth = await authorizeGuildRequest(request, url, cookies, params.serverId);
	if (auth.errorResponse) return auth.errorResponse;

	try {
		const { status, data } = await fetchServerSnapshot(params.serverId, auth.actorId);
		return createRedactedJsonResponse(data, { status });
	} catch {
		return createRedactedJsonResponse({ error: 'Bot API is unreachable' }, { status: 503 });
	}
};

export const PUT: RequestHandler = async ({ request, url, cookies, params }) => {
	const auth = await authorizeGuildRequest(request, url, cookies, params.serverId);
	if (auth.errorResponse) return auth.errorResponse;

	let body: { config?: unknown; settings?: unknown; language?: string };
	try {
		body = (await request.json()) as { config?: unknown; settings?: unknown; language?: string };
	} catch {
		return createRedactedJsonResponse({ error: 'Malformed JSON body' }, { status: 400 });
	}

	try {
		const { status, data } = await saveServerSnapshot(params.serverId, body, auth.actorId);
		return createRedactedJsonResponse(data, { status });
	} catch {
		return createRedactedJsonResponse({ error: 'Bot API is unreachable' }, { status: 503 });
	}
};
