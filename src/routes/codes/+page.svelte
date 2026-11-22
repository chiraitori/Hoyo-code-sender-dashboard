<script lang="ts">
	import { GAME_META, type GameId } from '#lib/types.ts';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let gameFilter = $state<GameId | 'all'>('all');
	let showExpired = $state(false);
	let livestreamOnly = $state(false);
	let searchQuery = $state('');
	let copiedCode = $state<string | null>(null);

	$effect(() => {
		gameFilter = data.initialGame;
	});

	const activeCounts = $derived({
		all: data.codes.filter((c) => !c.isExpired).length,
		zzz: data.codes.filter((c) => c.game === 'zzz' && !c.isExpired).length,
		genshin: data.codes.filter((c) => c.game === 'genshin' && !c.isExpired).length,
		hsr: data.codes.filter((c) => c.game === 'hsr' && !c.isExpired).length
	});

	const filteredCodes = $derived.by(() => {
		const q = searchQuery.trim().toLowerCase();
		return data.codes.filter((item) => {
			if (!showExpired && item.isExpired) return false;
			if (gameFilter !== 'all' && item.game !== gameFilter) return false;
			if (livestreamOnly && !item.isLivestream) return false;
			if (q) {
				return (
					item.code.toLowerCase().includes(q) ||
					item.rewards.toLowerCase().includes(q) ||
					GAME_META[item.game].label.toLowerCase().includes(q)
				);
			}
			return true;
		});
	});

	async function copyCode(code: string) {
		try {
			await navigator.clipboard.writeText(code);
		} catch {
			// ignore clipboard restrictions
		}
		copiedCode = code;
		setTimeout(() => {
			if (copiedCode === code) copiedCode = null;
		}, 1500);
	}
</script>

<div class="space-y-5">
	<div class="flex flex-wrap items-end justify-between gap-3">
		<div>
			<h1 class="text-2xl md:text-3xl font-black tracking-tight text-white">
				Redemption codes
			</h1>
			<p class="text-xs text-[#9a9aab] mt-1">
				{activeCounts.all} active codes across Genshin Impact, Honkai: Star Rail, and Zenless Zone Zero.
			</p>
		</div>
	</div>

	<!-- Filters -->
	<div class="zzz-card p-4 flex flex-wrap items-center justify-between gap-3">
		<div class="flex flex-wrap items-center gap-2">
			<button
				type="button"
				onclick={() => (gameFilter = 'all')}
				class="zzz-pill px-3.5 py-1.5 text-xs {gameFilter === 'all' ? 'zzz-btn-volt' : 'zzz-btn-dark'}"
			>
				<span class="inline-flex items-center gap-1.5">
					<span>All</span>
					<span class="font-mono-hdd opacity-75">{activeCounts.all}</span>
				</span>
			</button>

			{#each (['zzz', 'genshin', 'hsr'] as GameId[]) as g}
				<button
					type="button"
					onclick={() => (gameFilter = g)}
					class="zzz-pill px-3.5 py-1.5 text-xs {gameFilter === g ? 'zzz-btn-volt' : 'zzz-btn-dark'}"
				>
					<span class="inline-flex items-center gap-1.5">
						<span class="w-2 h-2 rounded-full {GAME_META[g].dotClass}"></span>
						<span>{GAME_META[g].short}</span>
						<span class="font-mono-hdd opacity-75">{activeCounts[g]}</span>
					</span>
				</button>
			{/each}

			<button
				type="button"
				onclick={() => (livestreamOnly = !livestreamOnly)}
				class="zzz-pill px-3.5 py-1.5 text-xs {livestreamOnly ? 'zzz-btn-orange' : 'zzz-btn-dark'}"
			>
				<span>Livestream only</span>
			</button>

			<button
				type="button"
				onclick={() => (showExpired = !showExpired)}
				class="zzz-pill px-3.5 py-1.5 text-xs {showExpired ? 'zzz-btn-volt' : 'zzz-btn-dark'}"
			>
				<span>{showExpired ? 'Showing expired' : 'Hide expired'}</span>
			</button>
		</div>

		<div class="relative w-full sm:w-64">
			<input
				type="text"
				bind:value={searchQuery}
				placeholder="Search codes or rewards..."
				class="zzz-input w-full px-3.5 py-2 text-xs font-semibold"
			/>
		</div>
	</div>

	<!-- Code Cards -->
	{#if filteredCodes.length > 0}
		<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
			{#each filteredCodes as item (item.game + item.code)}
				<article
					class="zzz-card-bevel p-4 flex flex-col justify-between gap-3.5 {item.isExpired ? 'opacity-65' : ''}"
				>
					<div class="flex items-start justify-between gap-3">
						<div class="min-w-0">
							<div class="flex flex-wrap items-center gap-2 text-xs">
								<span class="px-2 py-0.5 rounded-full bg-[#131318] border border-[#343440] text-white font-bold inline-flex items-center gap-1.5">
									<span class="w-2 h-2 rounded-full {GAME_META[item.game].dotClass}"></span>
									{GAME_META[item.game].label}
								</span>
								{#if item.isLivestream}
									<span class="px-2 py-0.5 rounded-full bg-[#ff5d1f] text-[#08080a] font-black">
										Livestream
									</span>
								{/if}
							</div>
							<div class="font-mono-hdd text-xl font-black tracking-wider text-white mt-2 break-all">
								{item.code}
							</div>
						</div>

						<span
							class="text-xs font-bold px-2.5 py-1 rounded-full border shrink-0 {item.isExpired
								? 'bg-[#2b1518] border-[#7f1d1d] text-[#ff8585]'
								: 'bg-[#131318] border-[#343440] text-[#d8ff00]'}"
						>
							{item.isExpired ? 'Expired' : 'Active'}
						</span>
					</div>

					<p class="text-xs text-[#a9a9b8] leading-relaxed">{item.rewards}</p>

					<div class="flex items-center justify-end gap-2 pt-3 border-t-2 border-[#2a2a34]">
						<button
							type="button"
							onclick={() => copyCode(item.code)}
							class="zzz-pill px-3.5 py-1.5 text-xs {copiedCode === item.code ? 'zzz-btn-volt' : 'zzz-btn-dark'}"
						>
							<span>{copiedCode === item.code ? 'Copied' : 'Copy'}</span>
						</button>
						<a
							href={item.redeemUrl}
							target="_blank"
							rel="noopener noreferrer"
							class="zzz-pill zzz-btn-volt px-3.5 py-1.5 text-xs"
						>
							<span>Redeem</span>
						</a>
					</div>
				</article>
			{/each}
		</div>
	{:else}
		<div class="zzz-card p-10 text-center space-y-2">
			<div class="text-sm font-bold text-white">No codes match your filter</div>
			<p class="text-xs text-[#9a9aab]">
				Try clearing the search box or showing expired codes.
			</p>
		</div>
	{/if}
</div>
