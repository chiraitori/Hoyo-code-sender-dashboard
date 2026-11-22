import type { PageServerLoad } from './$types';
import { fetchBotCommands, fetchBotStats } from '#lib/server/botBridge.ts';

export const load: PageServerLoad = async () => {
	const [stats, commands] = await Promise.all([fetchBotStats(), fetchBotCommands()]);

	return {
		stats,
		commands
	};
};
