import { timingSafeEqual } from 'node:crypto';
import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAppOrigin, getDiscordClientId } from '#lib/server/discordAuth.ts';

const env = process.env;

export const GET: RequestHandler = async ({ url, cookies }) => {
	const error = url.searchParams.get('error');
	if (error) {
		throw redirect(302, '/?error=oauth_failed');
	}

	const code = url.searchParams.get('code');
	if (!code) {
		throw redirect(302, '/?error=no_code');
	}

	const state = url.searchParams.get('state');
	const expectedState = cookies.get('discord_oauth_state');
	if (
		!state ||
		!expectedState ||
		!/^[a-f0-9]{64}$/.test(state) ||
		!/^[a-f0-9]{64}$/.test(expectedState) ||
		!timingSafeEqual(Buffer.from(state), Buffer.from(expectedState))
	) {
		throw redirect(302, '/?error=invalid_oauth_state');
	}

	const clientId = getDiscordClientId();
	const clientSecret = env.DISCORD_CLIENT_SECRET?.trim();
	if (!clientId || !clientSecret) {
		throw redirect(302, '/?error=oauth_not_configured');
	}

	try {
		const appOrigin = getAppOrigin(url);
		const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: new URLSearchParams({
				client_id: clientId,
				client_secret: clientSecret,
				grant_type: 'authorization_code',
				code,
				redirect_uri: new URL('/auth/callback', appOrigin).toString()
			}),
			signal: AbortSignal.timeout(10_000)
		});

		if (!tokenResponse.ok) {
			throw new Error('Token exchange failed');
		}

		const tokenData = (await tokenResponse.json()) as {
			access_token: string;
			expires_in: number;
		};

		const [userRes, guildsRes] = await Promise.all([
			fetch('https://discord.com/api/users/@me', {
				headers: { Authorization: `Bearer ${tokenData.access_token}` },
				cache: 'no-store',
				signal: AbortSignal.timeout(10_000)
			}),
			fetch('https://discord.com/api/users/@me/guilds', {
				headers: { Authorization: `Bearer ${tokenData.access_token}` },
				cache: 'no-store',
				signal: AbortSignal.timeout(10_000)
			})
		]);

		if (!userRes.ok) {
			throw new Error('Failed to fetch Discord profile');
		}

		const userData = (await userRes.json()) as {
			id: string;
			username: string;
			avatar: string | null;
		};
		const guildsData = guildsRes.ok ? ((await guildsRes.json()) as unknown[]) : [];
		const secure = url.protocol === 'https:';
		const maxAge = Number.isFinite(tokenData.expires_in) ? tokenData.expires_in : 604800;

		cookies.delete('discord_oauth_state', { path: '/' });
		cookies.set('discord_access_token', tokenData.access_token, {
			httpOnly: true,
			secure,
			sameSite: 'lax',
			path: '/',
			maxAge
		});
		cookies.set(
			'discord_user',
			JSON.stringify({
				id: userData.id,
				username: userData.username,
				avatar: userData.avatar,
				guilds: Array.isArray(guildsData) ? guildsData.length : 0
			}),
			{
				httpOnly: true,
				secure,
				sameSite: 'lax',
				path: '/',
				maxAge
			}
		);
	} catch {
		throw redirect(302, '/?error=oauth_processing_failed');
	}

	throw redirect(302, '/servers?auth=success');
};
