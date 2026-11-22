import type { Handle } from '@sveltejs/kit/hooks';
import { getSessionUser } from '#lib/server/discordAuth.ts';

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.user = getSessionUser(event.cookies);

	const response = await resolve(event);
	response.headers.set('X-Frame-Options', 'DENY');
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

	return response;
};
