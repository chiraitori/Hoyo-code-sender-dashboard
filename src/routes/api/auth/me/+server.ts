import type { RequestHandler } from './$types';
import { createRedactedJsonResponse } from '#lib/server/botBridge.ts';

export const GET: RequestHandler = async ({ cookies }) => {
	const token = cookies.get('discord_access_token');
	if (!token) {
		return createRedactedJsonResponse({ error: 'Not authenticated' }, { status: 401 });
	}

	try {
		const res = await fetch('https://discord.com/api/users/@me', {
			headers: { Authorization: `Bearer ${token}` },
			cache: 'no-store',
			signal: AbortSignal.timeout(10_000)
		});
		if (!res.ok) {
			return createRedactedJsonResponse(
				{ error: 'Discord session expired or unavailable' },
				{ status: res.status === 401 ? 401 : 503 }
			);
		}
		const userData = (await res.json()) as {
			id: string;
			username: string;
			avatar: string | null;
		};
		return createRedactedJsonResponse({
			id: userData.id,
			username: userData.username,
			avatar: userData.avatar,
			guilds: 0
		});
	} catch {
		return createRedactedJsonResponse({ error: 'Failed to check authentication' }, { status: 500 });
	}
};
