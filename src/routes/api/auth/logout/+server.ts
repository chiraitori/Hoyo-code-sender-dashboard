import type { RequestHandler } from './$types';
import { checkMutationOrigin } from '#lib/server/discordAuth.ts';

export const POST: RequestHandler = async ({ request, url, cookies }) => {
	const originError = checkMutationOrigin(request, url);
	if (originError) return originError;

	cookies.delete('discord_access_token', { path: '/' });
	cookies.delete('discord_user', { path: '/' });
	cookies.delete('discord_oauth_state', { path: '/' });

	return new Response(JSON.stringify({ success: true }), {
		status: 200,
		headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
	});
};
