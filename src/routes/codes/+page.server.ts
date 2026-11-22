import type { PageServerLoad } from './$types';
import { fetchAllCodes } from '#lib/server/botBridge.ts';
import type { GameId } from '#lib/types.ts';

export const load: PageServerLoad = async ({ url }) => {
	const result = await fetchAllCodes();
	const rawGame = url.searchParams.get('game');
	const initialGame: GameId | 'all' =
		rawGame === 'zzz' || rawGame === 'genshin' || rawGame === 'hsr' ? rawGame : 'all';

	return {
		codes: result.codes,
		source: result.source,
		fetchedAt: result.fetchedAt,
		initialGame
	};
};
