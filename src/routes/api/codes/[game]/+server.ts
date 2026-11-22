import type { RequestHandler } from './$types';
import { createRedactedJsonResponse, fetchCodesForGame } from '#lib/server/botBridge.ts';
import type { GameId } from '#lib/types.ts';

const VALID_GAMES = new Set<GameId>(['genshin', 'hsr', 'zzz']);

export const GET: RequestHandler = async ({ params }) => {
	const game = params.game as GameId;
	if (!VALID_GAMES.has(game)) {
		return createRedactedJsonResponse(
			{ error: 'Invalid game. Supported games: genshin, hsr, zzz' },
			{ status: 400 }
		);
	}

	try {
		const codes = await fetchCodesForGame(game);
		return createRedactedJsonResponse(
			{
				game,
				codes,
				lastUpdated: new Date().toISOString(),
				total: codes.length,
				active: codes.filter((c) => !c.isExpired).length,
				expired: codes.filter((c) => c.isExpired).length
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
				game,
				codes: [],
				lastUpdated: new Date().toISOString(),
				total: 0,
				active: 0,
				expired: 0
			},
			{ status: 500 }
		);
	}
};
