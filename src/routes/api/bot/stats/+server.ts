import type { RequestHandler } from './$types';
import { createRedactedJsonResponse, fetchBotStats } from '#lib/server/botBridge.ts';

export const GET: RequestHandler = async () => {
	const stats = await fetchBotStats();
	if (!stats) {
		return createRedactedJsonResponse(
			{
				error: 'Bot stats are temporarily unavailable.',
				guildCount: 0,
				servers: 0,
				userCount: 0,
				channelCount: 0,
				shardCount: 0,
				uptime: 0,
				ping: 0,
				status: 1,
				botUser: {
					username: 'HoYo Code Sender',
					avatar: null
				}
			},
			{ status: 503 }
		);
	}
	return createRedactedJsonResponse(stats, {
		status: 200,
		headers: {
			'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60'
		}
	});
};
