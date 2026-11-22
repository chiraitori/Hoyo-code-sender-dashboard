import { randomBytes } from 'node:crypto';
import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAppOrigin, getDiscordClientId } from '#lib/server/discordAuth.ts';

export const GET: RequestHandler = async ({ url, cookies }) => {
	const clientId = getDiscordClientId();
	if (!clientId) {
		return new Response(JSON.stringify({ error: 'Discord login is not configured' }), {
			status: 503,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	const state = randomBytes(32).toString('hex');
	const appOrigin = getAppOrigin(url);

	cookies.set('discord_oauth_state', state, {
		httpOnly: true,
		secure: url.protocol === 'https:',
		sameSite: 'lax',
		path: '/',
		maxAge: 600
	});

	const authorizeUrl = new URL('https://discord.com/api/oauth2/authorize');
	authorizeUrl.search = new URLSearchParams({
		client_id: clientId,
		redirect_uri: new URL('/auth/callback', appOrigin).toString(),
		response_type: 'code',
		scope: 'identify guilds',
		state
	}).toString();

	throw redirect(302, authorizeUrl.toString());
};
