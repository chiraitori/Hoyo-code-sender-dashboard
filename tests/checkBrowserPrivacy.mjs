import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

function filesUnder(dir) {
	if (!fs.existsSync(dir)) return [];
	return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const full = path.join(dir, entry.name);
		return entry.isDirectory() ? filesUnder(full) : [full];
	});
}

const clientAssets = [
	...filesUnder(path.join(rootDir, '.svelte-kit/output/client')),
	...filesUnder(path.join(rootDir, '.vercel/output/static'))
];

assert.ok(clientAssets.length > 0, 'No built browser assets found. Run `npm run build` first.');

const privateValues = [
	'MAIN_BOT_API_URL',
	'AUTH_BOT_SECRET',
	'VPS_EDGE_SECRET',
	'DISCORD_CLIENT_SECRET',
	process.env.MAIN_BOT_API_URL,
	process.env.AUTH_BOT_SECRET,
	process.env.VPS_EDGE_SECRET,
	process.env.DISCORD_CLIENT_SECRET
].filter(Boolean);

if (process.env.MAIN_BOT_API_URL) {
	try {
		privateValues.push(new URL(process.env.MAIN_BOT_API_URL).hostname);
	} catch {
		// ignore malformed URL
	}
}

for (const file of clientAssets) {
	assert.ok(!file.endsWith('.map'), `Production source map must not be shipped: ${path.relative(rootDir, file)}`);
	const body = fs.readFileSync(file);
	assert.ok(
		!privateValues.some((val) => body.includes(Buffer.from(val))),
		`Private backend secret or URL leaked into browser asset: ${path.relative(rootDir, file)}`
	);
}

console.log(`Privacy check passed: ${clientAssets.length} browser assets verified clean.`);
