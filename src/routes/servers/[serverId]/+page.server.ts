import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { fetchServerSnapshot } from '#lib/server/botBridge.ts';
import { authorizeGuildRequest } from '#lib/server/discordAuth.ts';
import type { ServerSnapshot } from '#lib/types.ts';

export const load: PageServerLoad = async ({ request, url, cookies, params, locals }) => {
	if (!locals.user) {
		throw redirect(302, '/servers');
	}

	const auth = await authorizeGuildRequest(request, url, cookies, params.serverId);
	if (auth.errorResponse) {
		const status = auth.errorResponse.status;
		if (status === 401) throw redirect(302, '/auth/login');
		const payload = (await auth.errorResponse.json().catch(() => ({}))) as { error?: string };
		throw error(status, payload.error || 'Access denied');
	}

	try {
		const { status, data } = await fetchServerSnapshot(params.serverId, auth.actorId);
		if (status !== 200 || 'error' in data) {
			throw error(
				status === 404 ? 404 : 503,
				'error' in data ? data.error : 'Could not load server configuration from bot'
			);
		}
		return {
			snapshot: data as ServerSnapshot
		};
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) throw err;
		throw error(503, 'Bot API on VPS is temporarily unreachable');
	}
};
