<script lang="ts">
	import CountUp from '#lib/components/CountUp.svelte';
	import { GAME_META, type GameId, type LivestreamStatus } from '#lib/types.ts';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	let copiedCode = $state<string | null>(null);

	const featuredDrops = $derived.by(() => {
		const pool = data.activeCodes;
		const picked: typeof pool = [];
		for (const game of ['zzz', 'genshin', 'hsr'] as GameId[]) {
			const match =
				pool.find((c) => c.game === game && c.isLivestream) ??
				pool.find((c) => c.game === game);
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

	const gameCards = $derived.by(() => {
		const streamMap = new Map<GameId, LivestreamStatus>();
		for (const ls of data.livestreams) {
			streamMap.set(ls.game, ls);
		}
		return (['zzz', 'genshin', 'hsr'] as GameId[]).map((game) => {
			const gameCodes = data.allCodes.filter((c) => c.game === game);
			const active = gameCodes.filter((c) => !c.isExpired);
			const livestreamCount = active.filter((c) => c.isLivestream).length;
			const expiredCount = gameCodes.length - active.length;
			const latest = active[0] ?? null;
			return {
				game,
				meta: GAME_META[game],
				activeCount: active.length,
				livestreamCount,
				expiredCount,
				latest,
				livestream: streamMap.get(game) ?? null
			};
		});
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

	function formatStreamBadge(ls: LivestreamStatus | null): string {
		if (!ls || ls.disabled) return 'Tracker idle';
		if (ls.found && ls.distributed) return ls.version ? `v${ls.version} distributed` : 'Codes distributed';
		if (ls.found) return ls.version ? `v${ls.version} ready` : 'Codes found';
		if (ls.streamTime > 0) {
			const diffSec = ls.streamTime - Math.floor(Date.now() / 1000);
			if (diffSec > 0) {
				const d = Math.floor(diffSec / 86400);
				const h = Math.floor((diffSec % 86400) / 3600);
				return `v${ls.version || '?'} in ${d > 0 ? `${d}d ` : ''}${h}h`;
			}
			return ls.version ? `v${ls.version} tracked` : 'Recently tracked';
		}
		return ls.version ? `v${ls.version} queued` : 'Monitoring';
	}

	function formatUptime(sec: number): string {
		if (!Number.isFinite(sec) || sec <= 0) return '—';
		const d = Math.floor(sec / 86400);
		const h = Math.floor((sec % 86400) / 3600);
		const m = Math.floor((sec % 3600) / 60);
		if (d > 0) return `${d}d ${h}h`;
		if (h > 0) return `${h}h ${m}m`;
		return `${m}m`;
	}
</script>

<div class="space-y-6">
	<!-- Hero Split -->
	<section class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
		<div class="lg:col-span-6 zzz-card p-6 md:p-8 flex flex-col justify-between gap-6 relative overflow-hidden">
			<div
				class="zzz-halftone absolute top-0 right-0 w-48 h-48 opacity-55 pointer-events-none"
				style="mask-image: radial-gradient(circle at top right, black, transparent 72%);"
			></div>

			<div class="space-y-4 relative z-10">
				{#if data.stats?.botUser}
					<div class="inline-flex items-center gap-2.5 px-3 py-1 rounded-full bg-[#131318] border border-[#32323f] text-xs">
						{#if data.stats.botUser.avatar}
							<img
								src={data.stats.botUser.avatar}
								alt={data.stats.botUser.username}
								class="w-5 h-5 rounded-full"
							/>
						{/if}
						<span class="font-bold text-white">{data.stats.botUser.username}</span>
						{#if data.stats.version}
							<span class="font-mono-hdd text-[#d8ff00] font-bold">v{data.stats.version}</span>
						{/if}
					</div>
				{/if}

				<h1 class="text-4xl md:text-5xl font-black tracking-tight leading-[1.03] text-white">
					Redemption codes, straight to your Discord server.
				</h1>

				<p class="text-sm text-[#a9a9b8] leading-relaxed max-w-md">
					Automatically posts active Genshin Impact, Honkai: Star Rail, and Zenless Zone Zero codes to your chosen channels and forum threads.
				</p>
			</div>

			<div class="space-y-5 relative z-10">
				<div class="flex flex-wrap items-center gap-3">
					<a href="/servers" class="zzz-pill zzz-btn-volt px-5 py-2.5 text-xs">
						<span>Manage servers</span>
					</a>
					<a href="/codes" class="zzz-pill zzz-btn-dark px-5 py-2.5 text-xs">
						<span>Browse {data.activeCodes.length} active codes</span>
					</a>
					{#if data.inviteUrl}
						<a
							href={data.inviteUrl}
							target="_blank"
							rel="noopener noreferrer"
							class="zzz-pill zzz-btn-dark px-4 py-2.5 text-xs"
						>
							<span>Add to Discord</span>
						</a>
					{/if}
				</div>

				<div class="grid grid-cols-3 gap-2.5 pt-4 border-t-2 border-[#2a2a34]">
					{#each gameCards as card (card.game)}
						<a
							href={`/codes?game=${card.game}`}
							class="zzz-subcard p-3 text-left hover:border-[#d8ff00] transition-colors block"
						>
							<div class="flex items-center justify-between text-xs text-[#9a9aab]">
								<span class="font-bold text-white">{card.meta.short}</span>
								<span class="w-2 h-2 rounded-full {card.meta.dotClass}"></span>
							</div>
							<div class="text-xs font-mono-hdd text-[#d8ff00] font-bold mt-2">
								{card.activeCount} active
							</div>
						</a>
					{/each}
				</div>
			</div>
		</div>

		<!-- Right: Active Codes List -->
		<div class="lg:col-span-6 zzz-card overflow-hidden flex flex-col">
			<div class="px-5 py-3.5 bg-[#131318] border-b-2 border-[#08080a] flex items-center justify-between gap-2">
				<div class="flex items-center gap-2">
					<span class="px-2 py-0.5 rounded bg-[#ff5d1f] text-[#08080a] text-xs font-black inline-flex items-center gap-1.5">
						<span class="w-1.5 h-1.5 rounded-full bg-[#08080a] zzz-live-dot"></span>
						<span>Live</span>
					</span>
					<span class="text-xs font-black text-white">Latest active codes</span>
				</div>
				<a href="/codes" class="text-xs font-bold text-[#d8ff00] hover:underline">
					View all
				</a>
			</div>

			<div class="p-4 space-y-3 flex-1">
				{#if featuredDrops.length > 0}
					{#each featuredDrops as item (item.game + item.code)}
						<div class="zzz-subcard p-3.5 flex items-center justify-between gap-3 hover:border-[#4b4b5d] transition-colors">
							<div class="min-w-0 space-y-1">
								<div class="flex flex-wrap items-center gap-2 text-xs">
									<span class="px-2 py-0.5 rounded-full bg-[#24242d] text-white font-bold inline-flex items-center gap-1.5">
										<span class="w-2 h-2 rounded-full {GAME_META[item.game].dotClass}"></span>
										{GAME_META[item.game].label}
									</span>
									{#if item.isLivestream}
										<span class="text-[#ff7a45] font-bold">Livestream</span>
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
									<span>{copiedCode === item.code ? 'Copied' : 'Copy'}</span>
								</button>
								<a
									href={item.redeemUrl}
									target="_blank"
									rel="noopener noreferrer"
									class="zzz-pill zzz-btn-volt px-3 py-2 text-xs hidden sm:inline-flex"
								>
									<span>Redeem</span>
								</a>
							</div>
						</div>
					{/each}
				{:else}
					<div class="zzz-subcard p-8 text-center space-y-2">
						<div class="text-sm font-bold text-white">No active codes right now</div>
						<p class="text-xs text-[#9a9aab]">Check back when new codes drop.</p>
					</div>
				{/if}
			</div>

			<div class="h-2 w-full zzz-hazard-orange"></div>
		</div>
	</section>

	<!-- Key Numbers -->
	<section class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
		<div class="zzz-card zzz-lift zzz-enter zzz-stagger-1 p-4">
			<div class="text-xs font-semibold text-[#9a9aab]">Servers</div>
			<div class="font-mono-hdd text-2xl font-black text-white mt-1">
				{#if data.stats}
					<CountUp value={data.stats.guildCount} />
				{:else}
					—
				{/if}
			</div>
		</div>
		<div class="zzz-card zzz-lift zzz-enter zzz-stagger-2 p-4">
			<div class="text-xs font-semibold text-[#9a9aab]">Members</div>
			<div class="font-mono-hdd text-2xl font-black text-[#d8ff00] mt-1">
				{#if data.stats}
					<CountUp value={data.stats.userCount} />
				{:else}
					—
				{/if}
			</div>
		</div>
		<div class="zzz-card zzz-lift zzz-enter zzz-stagger-3 p-4">
			<div class="text-xs font-semibold text-[#9a9aab]">Channels</div>
			<div class="font-mono-hdd text-2xl font-black text-white mt-1">
				{#if data.stats}
					<CountUp value={data.stats.channelCount} />
				{:else}
					—
				{/if}
			</div>
		</div>
		<div class="zzz-card zzz-lift zzz-enter zzz-stagger-4 p-4">
			<div class="text-xs font-semibold text-[#9a9aab]">Shards</div>
			<div class="font-mono-hdd text-2xl font-black text-white mt-1">
				{#if data.stats}
					<CountUp value={data.stats.shardCount} duration={400} />
				{:else}
					—
				{/if}
			</div>
		</div>
		<div class="zzz-card zzz-lift zzz-enter zzz-stagger-5 p-4">
			<div class="text-xs font-semibold text-[#9a9aab]">Gateway ping</div>
			<div class="font-mono-hdd text-2xl font-black text-white mt-1">
				{#if data.stats && data.stats.ping >= 0}
					<CountUp value={data.stats.ping} duration={450} suffix=" ms" />
				{:else}
					—
				{/if}
			</div>
		</div>
		<div class="zzz-card zzz-lift zzz-enter zzz-stagger-6 p-4">
			<div class="text-xs font-semibold text-[#9a9aab]">Uptime</div>
			<div class="font-mono-hdd text-2xl font-black text-[#d8ff00] mt-1">
				{data.stats ? formatUptime(data.stats.uptime) : '—'}
			</div>
		</div>
	</section>

	<!-- Supported Games & Livestream Tracker -->
	<section class="space-y-3">
		<div class="flex flex-wrap items-center justify-between gap-2">
			<h2 class="text-lg font-black text-white">Supported games</h2>
			<a href="/codes" class="text-xs font-bold text-[#d8ff00] hover:underline">
				Open code explorer
			</a>
		</div>

		<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
			{#each gameCards as card (card.game)}
				<div class="zzz-card zzz-lift p-5 flex flex-col justify-between gap-4">
					<div class="space-y-3">
						<div class="flex items-start justify-between gap-2">
							<div class="flex items-center gap-2.5">
								<span class="w-3 h-3 rounded-full {card.meta.dotClass}"></span>
								<h3 class="text-base font-black text-white">{card.meta.label}</h3>
							</div>
							<span class="font-mono-hdd text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#131318] border border-[#31313d] text-[#d8ff00]">
								{card.activeCount} active
							</span>
						</div>

						<div class="flex flex-wrap items-center gap-2 text-xs text-[#9a9aab]">
							<span>{formatStreamBadge(card.livestream)}</span>
							{#if card.livestreamCount > 0}
								<span>· {card.livestreamCount} livestream</span>
							{/if}
						</div>

						{#if card.latest}
							<div class="zzz-subcard p-3 space-y-1">
								<div class="text-[11px] font-bold text-[#9a9aab]">Newest code</div>
								<div class="flex items-center justify-between gap-2">
									<span class="font-mono-hdd text-sm font-black text-white truncate">
										{card.latest.code}
									</span>
									<button
										type="button"
										onclick={() => copyCode(card.latest!.code)}
										class="text-xs font-bold text-[#d8ff00] hover:underline shrink-0"
									>
										{copiedCode === card.latest.code ? 'Copied' : 'Copy'}
									</button>
								</div>
							</div>
						{/if}
					</div>

					<div class="flex items-center justify-between gap-2 pt-3 border-t-2 border-[#2a2a34]">
						<a
							href={card.meta.portalUrl}
							target="_blank"
							rel="noopener noreferrer"
							class="text-xs font-bold text-[#c7c7d4] hover:text-white"
						>
							Redeem portal
						</a>
						<a
							href={`/codes?game=${card.game}`}
							class="zzz-pill zzz-btn-dark px-3.5 py-1.5 text-xs"
						>
							<span>Browse {card.meta.short}</span>
						</a>
					</div>
				</div>
			{/each}
		</div>
	</section>

	<!-- Capabilities Matrix -->
	<section class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
		<a href="/servers" class="zzz-card-bevel p-5 space-y-1.5 hover:border-[#d8ff00] transition-colors block">
			<h3 class="text-base font-black text-white">Channels and forum threads</h3>
			<p class="text-xs text-[#a9a9b8] leading-relaxed">
				Route standard and livestream drops to separate channels or dedicate forum threads per game without duplicate posts.
			</p>
		</a>

		<a href="/servers" class="zzz-card-bevel p-5 space-y-1.5 hover:border-[#d8ff00] transition-colors block">
			<h3 class="text-base font-black text-white">Per-game roles and filters</h3>
			<p class="text-xs text-[#a9a9b8] leading-relaxed">
				Assign separate notification roles for ZZZ, Genshin Impact, and Star Rail, and toggle games per server.
			</p>
		</a>

		<a href="/servers" class="zzz-card-bevel p-5 space-y-1.5 hover:border-[#d8ff00] transition-colors block">
			<h3 class="text-base font-black text-white">Manual broadcast &amp; diagnostics</h3>
			<p class="text-xs text-[#a9a9b8] leading-relaxed">
				Post codes manually from the web console, run live channel permission checks, or send per-game test embeds.
			</p>
		</a>

		<a href="/codes" class="zzz-card-bevel p-5 space-y-1.5 hover:border-[#d8ff00] transition-colors block">
			<h3 class="text-base font-black text-white">Live HoYoLAB reward tracking</h3>
			<p class="text-xs text-[#a9a9b8] leading-relaxed">
				Search active and expired codes, copy all active codes at once, and open direct pre-filled HoYoLAB redeem links.
			</p>
		</a>

		<a href="/system" class="zzz-card-bevel p-5 space-y-1.5 hover:border-[#d8ff00] transition-colors block">
			<h3 class="text-base font-black text-white">Full slash command index</h3>
			<p class="text-xs text-[#a9a9b8] leading-relaxed">
				Inspect all bot slash commands, required options, shard status, and live livestream hunt status.
			</p>
		</a>

		<div class="rounded-[18px] p-5 bg-[#d8ff00] text-[#08080a] border-2 border-[#08080a] shadow-[0_6px_0_#060608] space-y-1.5">
			<h3 class="text-base font-black leading-tight">Three server languages</h3>
			<p class="text-xs font-bold opacity-85 leading-relaxed">
				Bot embeds, test alerts, and reward item names localize automatically into English, Japanese, and Vietnamese.
			</p>
		</div>
	</section>
</div>
