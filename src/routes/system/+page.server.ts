import type { PageServerLoad } from './$types';
import {
	fetchAllCodes,
	fetchBotCommands,
	fetchBotStats,
	fetchLivestreams
} from '#lib/server/botBridge.ts';

export const load: PageServerLoad = async () => {
	const [stats, commands, codesResult, livestreams] = await Promise.all([
		fetchBotStats(),
		fetchBotCommands(),
		fetchAllCodes(),
		fetchLivestreams()
	]);

	return {
		stats,
		commands,
		codes: codesResult.codes,
		codesSource: codesResult.source,
		fetchedAt: codesResult.fetchedAt,
		livestreams
	};
};
