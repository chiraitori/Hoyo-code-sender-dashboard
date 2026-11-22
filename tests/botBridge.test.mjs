import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, createHmac } from 'node:crypto';
import {
	buildCanonicalPayload,
	normalizeExternalCodes,
	redactPrivateStrings,
	signBotRequestHeaders
} from '../src/lib/server/bridgeCrypto.ts';

test('signBotRequestHeaders produces exact v1 HMAC-SHA256 signature compatible with bot bridge', () => {
	const secret = 'test-shared-secret-with-more-than-32-chars';
	const body = JSON.stringify({ language: 'vi' });
	const ts = 1700000123;
	const nonce = 'abcdef1234567890abcdef1234567890';

	const headers = signBotRequestHeaders({
		secret,
		method: 'PUT',
		path: '/api/server/123456789012345678/snapshot',
		rawBody: body,
		timestamp: ts,
		nonce,
		actor: '998877665544332211',
		requestId: 'req-001',
		edgeSecret: 'edge-token-xyz'
	});

	const expectedBodyHash = createHash('sha256').update(body, 'utf8').digest('hex');
	const expectedCanonical = `PUT\n/api/server/123456789012345678/snapshot\n${ts}\n${nonce}\n${expectedBodyHash}`;
	const expectedSig =
		'v1=' + createHmac('sha256', secret).update(expectedCanonical, 'utf8').digest('hex');

	assert.equal(
		buildCanonicalPayload({
			method: 'put',
			path: '/api/server/123456789012345678/snapshot',
			timestamp: String(ts),
			nonce,
			rawBody: body
		}),
		expectedCanonical
	);
	assert.equal(headers['X-Dashboard-Signature'], expectedSig);
	assert.equal(headers['X-Dashboard-Timestamp'], String(ts));
	assert.equal(headers['X-Dashboard-Nonce'], nonce);
	assert.equal(headers['X-Dashboard-Actor'], '998877665544332211');
	assert.equal(headers['X-Edge-Secret'], 'edge-token-xyz');
	assert.equal(headers['X-Request-Id'], 'req-001');
});

test('redactPrivateStrings strips bot URL, origin, hostname, and secrets at every nesting level', () => {
	const env = {
		MAIN_BOT_API_URL: 'https://vps-bot-hidden.example.net:8443',
		AUTH_BOT_SECRET: 'super-secret-bot-key-999',
		VPS_EDGE_SECRET: 'edge-shield-secret-777'
	};

	const raw = redactPrivateStrings(
		{
			error: 'Failed to reach https://vps-bot-hidden.example.net:8443/api/bot/ping',
			nested: {
				host: 'vps-bot-hidden.example.net',
				leaked: 'Bearer super-secret-bot-key-999',
				edge: 'edge-shield-secret-777',
				safe: 'ok'
			}
		},
		env
	);

	assert.ok(!raw.includes('vps-bot-hidden.example.net'));
	assert.ok(!raw.includes('super-secret-bot-key-999'));
	assert.ok(!raw.includes('edge-shield-secret-777'));
	const parsed = JSON.parse(raw);
	assert.equal(parsed.error, '[redacted]');
	assert.equal(parsed.nested.safe, 'ok');
});

test('normalizeExternalCodes calculates expiry and builds game-specific HoYoLAB redeem links', () => {
	const now = 1_700_000_000_000;
	const rows = normalizeExternalCodes(
		[
			{ code: 'NEWERRIDU17', rewards: '300 Polychrome', status: 'OK', offlineAt: Math.floor(now / 1000) + 3600 },
			{ code: 'OLDZZZCODE', status: 'EXPIRED' },
			{ code: 'PASTTIME', status: 'OK', offlineAt: Math.floor(now / 1000) - 60 }
		],
		'zzz',
		now
	);

	assert.equal(rows.length, 3);
	assert.equal(rows[0].isExpired, false);
	assert.equal(rows[0].isLivestream, true);
	assert.equal(rows[0].redeemUrl, 'https://zenless.hoyoverse.com/redemption?code=NEWERRIDU17');
	assert.equal(rows[1].isExpired, true);
	assert.equal(rows[2].isExpired, true);
});
