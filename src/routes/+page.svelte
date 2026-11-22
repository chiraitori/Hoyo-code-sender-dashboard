<script lang="ts">
	import { GAME_META, type GameId } from '#lib/types.ts';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	let copiedCode = $state<string | null>(null);

	const featuredDrops = $derived.by(() => {
		const pool = data.activeCodes;
		const picked: typeof pool = [];
		// Pick a balanced mix across ZZZ, Genshin, and Star Rail first
		for (const game of ['zzz', 'genshin', 'hsr'] as GameId[]) {
			const match = pool.find((c) => c.game === game && c.isLivestream) ?? pool.find((c) => c.game === game);
			if (match) picked.push(match);
		}
		for (const item of pool) {
			if (picked.length >= 4) break;
			if (!picked.some((p) => p.game === item.game && p.code === item.code)) {
				picked.push(item);
			}
		}
		return picked.slice(0, 4);
	});

	const countByGame = $derived({
		zzz: data.activeCodes.filter((c) => c.game === 'zzz').length,
		genshin: data.activeCodes.filter((c) => c.game === 'genshin').length,
		hsr: data.activeCodes.filter((c) => c.game === 'hsr').length
	});

	async function copyCode(code: string) {
		try {
			await navigator.clipboard.writeText(code);
		} catch {
			// clipboard fallback ignored in restricted contexts
		}
		copiedCode = code;
		setTimeout(() => {
			if (copiedCode === code) copiedCode = null;
		}, 1500);
	}
</script>

<div class="space-y-6">
	<!-- Asymmetric ZZZ Hero Split -->
	<section class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
		<!-- Left: Chunky Inter-Knot Identity & Tape Selector -->
		<div class="lg:col-span-6 zzz-card p-6 md:p-8 flex flex-col justify-between gap-6 relative overflow-hidden">
			<div
				class="zzz-halftone absolute top-0 right-0 w-48 h-48 opacity-55 pointer-events-none"
				style="mask-image: radial-gradient(circle at top right, black, transparent 72%);"
			></div>

			<div class="space-y-4 relative z-10">
				<div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0e0e12] border-2 border-[#32323e] text-xs font-mono-hdd">
					<span class="w-2.5 h-2.5 rounded-full bg-[#d8ff00]"></span>
					<span class="font-bold text-[#d8ff00]">
						PROXY NETWORK // {data.stats ? `${data.stats.guildCount.toLocaleString()} SERVERS` : 'ACTIVE'}
					</span>
				</div>

				<h1 class="text-4xl md:text-5xl font-black tracking-tight leading-[0.98] text-white">
					ZERO MISSED DROPS.<br />INSTANT DISCORD RELAY.
				</h1>

				<p class="text-sm text-[#a9a9b8] leading-relaxed max-w-md">
					Polls HoYoLAB and Special Programs for Zenless Zone Zero, Genshin Impact, and Honkai: Star Rail, then dispatches clean localized embeds straight to your channels or forum threads.
				</p>
			</div>

			<div class="space-y-5 relative z-10">
				<div class="flex flex-wrap items-center gap-3">
					<a href="/servers" class="zzz-pill zzz-btn-volt px-5 py-2.5 text-xs tracking-wide">
						<span class="inline-flex items-center gap-2">
							CONFIGURE SERVER
							<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
								<line x1="5" y1="12" x2="19" y2="12" />
								<polyline points="12 5 19 12 12 19" />
							</svg>
						</span>
					</a>
					<a href="/codes" class="zzz-pill zzz-btn-dark px-5 py-2.5 text-xs tracking-wide">
						<span>OPEN CODE BOARD ({data.activeCodes.length})</span>
					</a>
					{#if data.inviteUrl}
						<a
							href={data.inviteUrl}
							target="_blank"
							rel="noopener noreferrer"
							class="zzz-pill zzz-btn-dark px-4 py-2.5 text-xs tracking-wide"
						>
							<span>ADD BOT</span>
						</a>
					{/if}
				</div>

				<!-- Random Play Cassette Tape Selector -->
				<div class="grid grid-cols-3 gap-2.5 pt-4 border-t-2 border-[#2a2a34]">
					{#each (['zzz', 'genshin', 'hsr'] as GameId[]) as g}
						<a
							href={`/codes?game=${g}`}
							class="zzz-subcard p-3 text-left hover:border-[#d8ff00] transition-colors block"
						>
							<div class="flex items-center justify-between text-[11px] font-mono-hdd text-[#8e8e9e]">
								<span>{GAME_META[g].tape}</span>
								<span class="w-2 h-2 rounded-full {GAME_META[g].dotClass}"></span>
							</div>
							<div class="text-xs font-black text-white mt-1">{GAME_META[g].short}</div>
							<div class="text-[11px] font-mono-hdd text-[#d8ff00] mt-0.5">
								{countByGame[g]} ACTIVE
							</div>
						</a>
					{/each}
				</div>
			</div>
		</div>

		<!-- Right: Inter-Knot Live Code Bulletin -->
		<div class="lg:col-span-6 zzz-card overflow-hidden flex flex-col">
			<div class="px-5 py-3.5 bg-[#131318] border-b-2 border-[#08080a] flex items-center justify-between gap-2">
				<div class="flex items-center gap-2">
					<span class="px-2 py-0.5 rounded bg-[#ff5d1f] text-[#08080a] font-mono-hdd text-xs font-black">
						ACTIVE
					</span>
					<span class="text-xs font-black font-mono-hdd tracking-wide text-white">
						LIVE CODE BROADCASTS
					</span>
				</div>
				<span class="text-xs font-mono-hdd text-[#9a9aab]">
					AUTO-SYNCED // VERIFIED
				</span>
			</div>

			<div class="p-4 space-y-3 flex-1">
				{#if featuredDrops.length > 0}
					{#each featuredDrops as item (item.game + item.code)}
						<div class="zzz-subcard p-3.5 flex items-center justify-between gap-3 hover:border-[#4b4b5d] transition-colors">
							<div class="min-w-0 space-y-1">
								<div class="flex flex-wrap items-center gap-2 text-xs font-mono-hdd">
									<span class="px-2 py-0.5 rounded-full bg-[#24242d] text-white font-bold inline-flex items-center gap-1.5">
										<span class="w-2 h-2 rounded-full {GAME_META[item.game].dotClass}"></span>
										{GAME_META[item.game].short}
									</span>
									{#if item.isLivestream}
										<span class="text-[#ff7a45] font-bold">LIVESTREAM</span>
									{/if}
								</div>
								<div class="font-mono-hdd text-lg font-black tracking-wider text-white truncate">
									{item.code}
								</div>
								<div class="text-xs text-[#a9a9b8] truncate">{item.rewards}</div>
							</div>

							<div class="flex items-center gap-2 shrink-0">
								<button
									type="button"
									onclick={() => copyCode(item.code)}
									class="zzz-pill px-3.5 py-2 text-xs {copiedCode === item.code ? 'zzz-btn-volt' : 'zzz-btn-dark'}"
								>
									<span>{copiedCode === item.code ? 'COPIED' : 'COPY'}</span>
								</button>
								<a
									href={item.redeemUrl}
									target="_blank"
									rel="noopener noreferrer"
									class="zzz-pill zzz-btn-volt px-3 py-2 text-xs hidden sm:inline-flex"
								>
									<span>REDEEM</span>
								</a>
							</div>
						</div>
					{/each}
				{:else}
					<div class="zzz-subcard p-8 text-center space-y-2">
						<div class="text-sm font-black">NO ACTIVE BROADCASTS DETECTED</div>
						<p class="text-xs text-[#9a9aab]">Check the full code board or refresh in a moment.</p>
					</div>
				{/if}
			</div>

			<div class="h-2 w-full zzz-hazard-orange"></div>
		</div>
	</section>

	<!-- Live Telemetry Strip -->
	<section class="grid grid-cols-2 lg:grid-cols-4 gap-4">
		<div class="zzz-card p-4">
			<div class="font-mono-hdd text-xs text-[#9a9aab]">CONNECTED GUILDS</div>
			<div class="font-mono-hdd text-2xl font-black text-white mt-1">
				{data.stats ? data.stats.guildCount.toLocaleString() : '—'}
			</div>
			<div class="text-xs text-[#8f8fa0] mt-0.5">Live across all Discord shards</div>
		</div>
		<div class="zzz-card p-4">
			<div class="font-mono-hdd text-xs text-[#9a9aab]">REACHED PLAYERS</div>
			<div class="font-mono-hdd text-2xl font-black text-[#d8ff00] mt-1">
				{data.stats ? data.stats.userCount.toLocaleString() : '—'}
			</div>
			<div class="text-xs text-[#8f8fa0] mt-0.5">Total members in active servers</div>
		</div>
		<div class="zzz-card p-4">
			<div class="font-mono-hdd text-xs text-[#9a9aab]">GATEWAY PING</div>
			<div class="font-mono-hdd text-2xl font-black text-white mt-1">
				{data.stats && data.stats.ping >= 0 ? `${data.stats.ping} ms` : '—'}
			</div>
			<div class="text-xs text-[#8f8fa0] mt-0.5">Discord WebSocket latency</div>
		</div>
		<div class="zzz-card p-4">
			<div class="font-mono-hdd text-xs text-[#9a9aab]">ACTIVE CODES</div>
			<div class="font-mono-hdd text-2xl font-black text-[#d8ff00] mt-1">{data.activeCodes.length}</div>
			<div class="text-xs text-[#8f8fa0] mt-0.5">Ready across GI, HSR &amp; ZZZ</div>
		</div>
	</section>

	<!-- Asymmetric 3-Module Feature Bento -->
	<section class="grid grid-cols-1 md:grid-cols-12 gap-4">
		<div class="md:col-span-4 zzz-card-bevel p-5 space-y-2">
			<span class="font-mono-hdd text-xs font-black text-[#d8ff00]">// ANTI-SPAM LEDGER</span>
			<h2 class="text-base font-black">Zero duplicate replays</h2>
			<p class="text-xs text-[#a9a9b8] leading-relaxed">
				Delivery tracking isolates every guild, channel, and forum thread so your server never gets spammed with repeated codes.
			</p>
		</div>
		<div class="md:col-span-5 zzz-card-bevel p-5 space-y-2">
			<span class="font-mono-hdd text-xs font-black text-[#ff5d1f]">// MULTI-CHANNEL ROUTING</span>
			<h2 class="text-base font-black">Separate streams &amp; forum threads</h2>
			<p class="text-xs text-[#a9a9b8] leading-relaxed">
				Send regular drops to one channel, Special Program codes to another, or isolate Genshin, Star Rail, and ZZZ into dedicated Discord forum threads.
			</p>
		</div>
		<div class="md:col-span-3 rounded-[18px] p-5 bg-[#d8ff00] text-[#08080a] border-2 border-[#08080a] shadow-[0_6px_0_#060608] flex flex-col justify-between gap-2">
			<span class="font-mono-hdd text-xs font-black">LOCALIZED REWARDS</span>
			<div>
				<h2 class="text-base font-black leading-tight">Multi-language embeds</h2>
				<p class="text-xs font-bold opacity-85 mt-1">
					Automatic reward and notification translations in English, Japanese, and Vietnamese.
				</p>
			</div>
		</div>
	</section>
</div>
