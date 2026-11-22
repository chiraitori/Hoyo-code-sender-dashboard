import type { PageServerLoad } from './$types';
import { fetchBotGuildIds } from '#lib/server/botBridge.ts';
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

	const [userGuildResult, botGuildIds] = await Promise.all([
		fetchUserGuilds(cookies),
		fetchBotGuildIds(locals.user.id)
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
		.map((g) => ({
			id: g.id,
			name: g.name,
			icon: g.icon
				? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png?size=128`
				: null,
			owner: g.owner,
			botPresent: botGuildIds.has(g.id)
		}))
		.sort((a, b) => Number(b.botPresent) - Number(a.botPresent) || a.name.localeCompare(b.name));

	return {
		authenticated: true,
		guilds: manageable,
		errorMessage: null as string | null,
		inviteBaseUrl: buildBotInviteUrl()
	};
};
