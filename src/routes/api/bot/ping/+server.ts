import type { RequestHandler } from './$types';
import { createRedactedJsonResponse, fetchBotPing } from '#lib/server/botBridge.ts';

export const GET: RequestHandler = async () => {
	const ping = await fetchBotPing();
	if (!ping) {
		return createRedactedJsonResponse({ ok: false, botReady: false }, { status: 503 });
	}
	return createRedactedJsonResponse(ping, { status: 200 });
};
