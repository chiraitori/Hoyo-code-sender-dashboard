import type { RequestHandler } from './$types';
import { createRedactedJsonResponse, fetchAllCodes } from '#lib/server/botBridge.ts';

export const GET: RequestHandler = async () => {
	try {
		const payload = await fetchAllCodes();
		return createRedactedJsonResponse(payload, {
			status: 200,
			headers: {
				'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120'
			}
		});
	} catch {
		return createRedactedJsonResponse(
			{ error: 'Unable to fetch redemption codes right now' },
			{ status: 503 }
		);
	}
};
