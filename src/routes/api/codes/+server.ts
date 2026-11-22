import type { RequestHandler } from './$types';
import { createRedactedJsonResponse, fetchCodesForGame } from '#lib/server/botBridge.ts';
import type { GameId } from '#lib/types.ts';

const GAMES: GameId[] = ['genshin', 'hsr', 'zzz'];

export const GET: RequestHandler = async () => {
	try {
		const results = await Promise.all(
			GAMES.map(async (game) => {
				try {
					const codes = await fetchCodesForGame(game);
					return {
						game,
						codes,
						total: codes.length,
						active: codes.filter((c) => !c.isExpired).length,
						expired: codes.filter((c) => c.isExpired).length
					};
				} catch {
					return {
						game,
						codes: [],
						total: 0,
						active: 0,
						expired: 0,
						error: 'Failed to fetch codes'
					};
				}
			})
		);

		const summary = results.reduce(
			(acc, item) => ({
				totalCodes: acc.totalCodes + item.total,
				totalActive: acc.totalActive + item.active,
				totalExpired: acc.totalExpired + item.expired
			}),
			{ totalCodes: 0, totalActive: 0, totalExpired: 0 }
		);

		const codes = results.flatMap((r) => r.codes);

		return createRedactedJsonResponse(
			{
				games: results,
				summary,
				codes,
				lastUpdated: new Date().toISOString()
			},
			{
				status: 200,
				headers: {
					'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600'
				}
			}
		);
	} catch {
		return createRedactedJsonResponse(
			{
				error: 'Failed to fetch codes',
				games: [],
				summary: { totalCodes: 0, totalActive: 0, totalExpired: 0 },
				codes: [],
				lastUpdated: new Date().toISOString()
			},
			{ status: 500 }
		);
	}
};
