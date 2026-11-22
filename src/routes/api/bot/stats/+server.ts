import type { RequestHandler } from './$types';
import { createRedactedJsonResponse, fetchBotStats } from '#lib/server/botBridge.ts';

export const GET: RequestHandler = async () => {
	const stats = await fetchBotStats();
	if (!stats) {
		return createRedactedJsonResponse({ error: 'Bot stats unavailable' }, { status: 503 });
	}
	return createRedactedJsonResponse(stats, {
		status: 200,
		headers: {
			'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=90'
		}
	});
};
