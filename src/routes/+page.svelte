<script lang="ts">
	import { GAME_META, type GameId } from '#lib/types.ts';
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
	<!-- Hero Split -->
	<section class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
		<div class="lg:col-span-6 zzz-card p-6 md:p-8 flex flex-col justify-between gap-6 relative overflow-hidden">
			<div
				class="zzz-halftone absolute top-0 right-0 w-48 h-48 opacity-55 pointer-events-none"
				style="mask-image: radial-gradient(circle at top right, black, transparent 72%);"
			></div>

			<div class="space-y-4 relative z-10">
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
					{#each (['zzz', 'genshin', 'hsr'] as GameId[]) as g}
						<a
							href={`/codes?game=${g}`}
							class="zzz-subcard p-3 text-left hover:border-[#d8ff00] transition-colors block"
						>
							<div class="flex items-center justify-between text-xs text-[#9a9aab]">
								<span class="font-bold text-white">{GAME_META[g].short}</span>
								<span class="w-2 h-2 rounded-full {GAME_META[g].dotClass}"></span>
							</div>
							<div class="text-xs font-mono-hdd text-[#d8ff00] font-bold mt-2">
								{countByGame[g]} active
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
					<span class="px-2 py-0.5 rounded bg-[#ff5d1f] text-[#08080a] text-xs font-black">
						Live
					</span>
					<span class="text-xs font-black text-white">Active codes</span>
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
	<section class="grid grid-cols-2 lg:grid-cols-4 gap-4">
		<div class="zzz-card p-4">
			<div class="text-xs font-semibold text-[#9a9aab]">Servers</div>
			<div class="font-mono-hdd text-2xl font-black text-white mt-1">
				{data.stats ? data.stats.guildCount.toLocaleString() : '—'}
			</div>
		</div>
		<div class="zzz-card p-4">
			<div class="text-xs font-semibold text-[#9a9aab]">Members</div>
			<div class="font-mono-hdd text-2xl font-black text-[#d8ff00] mt-1">
				{data.stats ? data.stats.userCount.toLocaleString() : '—'}
			</div>
		</div>
		<div class="zzz-card p-4">
			<div class="text-xs font-semibold text-[#9a9aab]">Gateway ping</div>
			<div class="font-mono-hdd text-2xl font-black text-white mt-1">
				{data.stats && data.stats.ping >= 0 ? `${data.stats.ping} ms` : '—'}
			</div>
		</div>
		<div class="zzz-card p-4">
			<div class="text-xs font-semibold text-[#9a9aab]">Active codes</div>
			<div class="font-mono-hdd text-2xl font-black text-[#d8ff00] mt-1">
				{data.activeCodes.length}
			</div>
		</div>
	</section>

	<!-- Highlights -->
	<section class="grid grid-cols-1 md:grid-cols-12 gap-4">
		<div class="md:col-span-4 zzz-card-bevel p-5 space-y-2">
			<h2 class="text-base font-black text-white">No duplicate posts</h2>
			<p class="text-xs text-[#a9a9b8] leading-relaxed">
				Each code is tracked per channel and thread so your server only gets notified once.
			</p>
		</div>
		<div class="md:col-span-5 zzz-card-bevel p-5 space-y-2">
			<h2 class="text-base font-black text-white">Channels and forum threads</h2>
			<p class="text-xs text-[#a9a9b8] leading-relaxed">
				Send livestream codes to a separate channel or split Genshin, Star Rail, and ZZZ into their own forum threads.
			</p>
		</div>
		<div class="md:col-span-3 rounded-[18px] p-5 bg-[#d8ff00] text-[#08080a] border-2 border-[#08080a] shadow-[0_6px_0_#060608] space-y-1.5">
			<h2 class="text-base font-black leading-tight">Three languages</h2>
			<p class="text-xs font-bold opacity-85 leading-relaxed">
				Alerts and reward names are translated into English, Japanese, and Vietnamese.
			</p>
		</div>
	</section>
</div>
