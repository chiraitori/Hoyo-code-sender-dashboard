import type { PageServerLoad } from './$types';
import { fetchAllCodes, fetchBotStats, fetchLivestreams } from '#lib/server/botBridge.ts';
import { buildBotInviteUrl } from '#lib/server/discordAuth.ts';

export const load: PageServerLoad = async () => {
	const [codesResult, stats, livestreams] = await Promise.all([
		fetchAllCodes(),
		fetchBotStats(),
		fetchLivestreams()
	]);
	const activeCodes = codesResult.codes.filter((c) => !c.isExpired);

	return {
		allCodes: codesResult.codes,
		activeCodes,
		codesSource: codesResult.source,
		fetchedAt: codesResult.fetchedAt,
		stats,
		livestreams,
		inviteUrl: buildBotInviteUrl()
	};
};
