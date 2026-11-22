import type { RequestHandler } from './$types';
import { createRedactedJsonResponse, fetchBotCommands } from '#lib/server/botBridge.ts';

export const GET: RequestHandler = async () => {
	const commands = await fetchBotCommands();
	if (!commands.length) {
		return createRedactedJsonResponse(
			{ error: 'Bot commands are currently unavailable', commands: [], total: 0 },
			{ status: 503 }
		);
	}
	return createRedactedJsonResponse(
		{ commands, total: commands.length },
		{
			status: 200,
			headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' }
		}
	);
};
