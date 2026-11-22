import type { RequestHandler } from './$types';
import { createRedactedJsonResponse, fetchBotGuildIds } from '#lib/server/botBridge.ts';
import { canManageGuild, fetchUserGuilds, getSessionUser } from '#lib/server/discordAuth.ts';

export const GET: RequestHandler = async ({ cookies }) => {
	const result = await fetchUserGuilds(cookies);
	if (!result.guilds) {
		const status = result.errorStatus ?? 401;
		return createRedactedJsonResponse(
			{ error: status === 401 ? 'Not authenticated' : 'Could not verify Discord permissions' },
			{ status }
		);
	}

	const session = getSessionUser(cookies);
	const botGuildIds = await fetchBotGuildIds(session?.id ?? null);

	const enhanced = result.guilds
		.filter((g) => canManageGuild(g))
		.map((g) => {
			const botPresent = botGuildIds.has(g.id);
			return {
				...g,
				botPresent,
				canInvite: !botPresent
			};
		});

	return createRedactedJsonResponse({
		guilds: enhanced,
		total: enhanced.length
	});
};
