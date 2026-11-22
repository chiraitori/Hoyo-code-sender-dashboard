import type { RequestHandler } from './$types';
import { createRedactedJsonResponse, fetchLivestreams } from '#lib/server/botBridge.ts';

export const GET: RequestHandler = async () => {
	const livestreams = await fetchLivestreams();
	return createRedactedJsonResponse(
		{ livestreams, fetchedAt: new Date().toISOString() },
		{
			headers: {
				'Cache-Control': 'public, max-age=30, s-maxage=30, stale-while-revalidate=120'
			}
		}
	);
};
