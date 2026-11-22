import type { PageServerLoad } from './$types';
import { fetchBotGuildMap } from '#lib/server/botBridge.ts';
import {
	buildBotInviteUrl,
	canManageGuild,
	fetchUserGuilds
} from '#lib/server/discordAuth.ts';
import type { GuildSummary } from '#lib/types.ts';

export const load: PageServerLoad = async ({ cookies, locals }) => {
	if (!locals.user) {
		return {
			authenticated: false,
			guilds: [] as GuildSummary[],
			errorMessage: null as string | null,
			inviteBaseUrl: buildBotInviteUrl()
		};
	}

	const [userGuildResult, botGuildMap] = await Promise.all([
		fetchUserGuilds(cookies),
		fetchBotGuildMap(locals.user.id)
	]);

	if (!userGuildResult.guilds) {
		return {
			authenticated: userGuildResult.errorStatus !== 401,
			guilds: [] as GuildSummary[],
			errorMessage:
				userGuildResult.errorStatus === 401
					? 'Your Discord session expired. Please sign in again.'
					: 'Discord API is temporarily unavailable. Try refreshing.',
			inviteBaseUrl: buildBotInviteUrl()
		};
	}

	const manageable: GuildSummary[] = userGuildResult.guilds
		.filter((g) => canManageGuild(g))
		.map((g) => {
			const botMeta = botGuildMap.get(g.id);
			return {
				id: g.id,
				name: g.name,
				icon: g.icon
					? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png?size=128`
					: null,
				owner: g.owner,
				botPresent: Boolean(botMeta),
				memberCount: botMeta?.memberCount,
				joinedAt: botMeta?.joinedAt ?? null
			};
		})
		.sort((a, b) => Number(b.botPresent) - Number(a.botPresent) || a.name.localeCompare(b.name));

	return {
		authenticated: true,
		guilds: manageable,
		errorMessage: null as string | null,
		inviteBaseUrl: buildBotInviteUrl()
	};
};
