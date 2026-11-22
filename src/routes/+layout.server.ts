import type { LayoutServerLoad } from './$types';
import { buildBotInviteUrl } from '#lib/server/discordAuth.ts';
import { fetchBotStats } from '#lib/server/botBridge.ts';

export const load: LayoutServerLoad = async ({ locals }) => {
	const stats = await fetchBotStats();
	return {
		user: locals.user,
		inviteUrl: buildBotInviteUrl(),
		botStatus: stats
			? {
					online: stats.status === 0,
					shardCount: stats.shardCount,
					guildCount: stats.guildCount
				}
			: null
	};
};
