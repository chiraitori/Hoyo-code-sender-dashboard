import type { PageServerLoad } from './$types';
import { fetchAllCodes, fetchBotStats } from '#lib/server/botBridge.ts';
import { buildBotInviteUrl } from '#lib/server/discordAuth.ts';

export const load: PageServerLoad = async () => {
	const [codesResult, stats] = await Promise.all([fetchAllCodes(), fetchBotStats()]);
	const activeCodes = codesResult.codes.filter((c) => !c.isExpired);

	return {
		activeCodes,
		codesSource: codesResult.source,
		fetchedAt: codesResult.fetchedAt,
		stats,
		inviteUrl: buildBotInviteUrl()
	};
};
