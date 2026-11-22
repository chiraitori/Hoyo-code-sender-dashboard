import type { PageServerLoad } from './$types';
import { fetchAllCodes, fetchLivestreams } from '#lib/server/botBridge.ts';
import type { GameId } from '#lib/types.ts';

function parseGameParam(raw: string | null): GameId | 'all' {
	switch (raw?.toLowerCase()) {
		case 'zzz':
		case 'nap':
		case 'zenless-zone-zero':
			return 'zzz';
		case 'genshin':
		case 'genshin-impact':
			return 'genshin';
		case 'hsr':
		case 'hkrpg':
		case 'starrail':
		case 'honkai-star-rail':
			return 'hsr';
		default:
			return 'all';
	}
}

export const load: PageServerLoad = async ({ url }) => {
	const [result, livestreams] = await Promise.all([fetchAllCodes(), fetchLivestreams()]);

	return {
		codes: result.codes,
		source: result.source,
		fetchedAt: result.fetchedAt,
		livestreams,
		initialGame: parseGameParam(url.searchParams.get('game'))
	};
};
