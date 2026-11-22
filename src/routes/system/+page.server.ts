import type { PageServerLoad } from './$types';
import { fetchBotCommands, fetchBotPing, fetchBotStats } from '#lib/server/botBridge.ts';

export const load: PageServerLoad = async () => {
	const [ping, stats, commands] = await Promise.all([
		fetchBotPing(),
		fetchBotStats(),
		fetchBotCommands()
	]);

	return {
		ping,
		stats,
		commands
	};
};
