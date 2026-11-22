<script lang="ts">
	import { untrack } from 'svelte';
	import { GAME_META, type GameCode, type GameId, type LivestreamStatus } from '#lib/types.ts';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let liveCodes = $state<GameCode[]>(untrack(() => data.codes));
	let fetchedAt = $state<string>(untrack(() => data.fetchedAt));
	let refreshing = $state(false);

	let gameFilter = $state<GameId | 'all'>(untrack(() => data.initialGame));
	let showExpired = $state(false);
	let livestreamOnly = $state(false);
	let sortBy = $state<'newest' | 'livestream' | 'code' | 'game'>('newest');
	let searchQuery = $state('');
	let copiedCode = $state<string | null>(null);
	let copiedBatch = $state(false);

	$effect(() => {
		liveCodes = data.codes;
		fetchedAt = data.fetchedAt;
		gameFilter = data.initialGame;
	});

	const streamByGame = $derived.by(() => {
		const map = new Map<GameId, LivestreamStatus>();
		for (const ls of data.livestreams) map.set(ls.game, ls);
		return map;
	});

	const activeCounts = $derived({
		all: liveCodes.filter((c) => !c.isExpired).length,
		zzz: liveCodes.filter((c) => c.game === 'zzz' && !c.isExpired).length,
		genshin: liveCodes.filter((c) => c.game === 'genshin' && !c.isExpired).length,
		hsr: liveCodes.filter((c) => c.game === 'hsr' && !c.isExpired).length
	});

	const filteredCodes = $derived.by(() => {
		const q = searchQuery.trim().toLowerCase();
		const list = liveCodes.filter((item) => {
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

		return [...list].sort((a, b) => {
			if (a.isExpired !== b.isExpired) return Number(a.isExpired) - Number(b.isExpired);
			if (sortBy === 'livestream') {
				if (a.isLivestream !== b.isLivestream) return Number(b.isLivestream) - Number(a.isLivestream);
			} else if (sortBy === 'code') {
				return a.code.localeCompare(b.code);
			} else if (sortBy === 'game') {
				return a.game.localeCompare(b.game) || a.code.localeCompare(b.code);
			}
			return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
		});
	});

	async function refreshLive() {
		refreshing = true;
		try {
			const res = await fetch('/api/codes');
			if (!res.ok) return;
			const payload = (await res.json()) as {
				games?: Array<{ game: GameId; codes: GameCode[] }>;
				lastUpdated?: string;
			};
			if (Array.isArray(payload.games)) {
				liveCodes = payload.games.flatMap((g) => g.codes || []);
				if (payload.lastUpdated) fetchedAt = payload.lastUpdated;
			}
		} finally {
			refreshing = false;
		}
	}

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

	async function copyAllActive() {
		const active = filteredCodes.filter((c) => !c.isExpired).map((c) => c.code);
		if (active.length === 0) return;
		try {
			await navigator.clipboard.writeText(active.join('\n'));
		} catch {
			// ignore
		}
		copiedBatch = true;
		setTimeout(() => (copiedBatch = false), 1800);
	}

	function formatTimeLabel(iso: string): string {
		const date = new Date(iso);
		if (Number.isNaN(date.getTime())) return '';
		return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
	}
</script>

<div class="space-y-5">
	<div class="flex flex-wrap items-end justify-between gap-3">
		<div>
			<h1 class="text-2xl md:text-3xl font-black tracking-tight text-white">
				Redemption codes
			</h1>
			<p class="text-xs text-[#9a9aab] mt-1">
				{activeCounts.all} active codes across Genshin Impact, Honkai: Star Rail, and Zenless Zone Zero · Updated {formatTimeLabel(fetchedAt) || 'recently'}.
			</p>
		</div>

		<div class="flex flex-wrap items-center gap-2">
			<button
				type="button"
				onclick={copyAllActive}
				disabled={filteredCodes.filter((c) => !c.isExpired).length === 0}
				class="zzz-pill px-4 py-2 text-xs {copiedBatch ? 'zzz-btn-volt' : 'zzz-btn-dark'}"
			>
				<span>{copiedBatch ? 'Copied active list' : 'Copy all active'}</span>
			</button>
			<button
				type="button"
				onclick={refreshLive}
				disabled={refreshing}
				class="zzz-pill zzz-btn-volt px-4 py-2 text-xs"
			>
				<span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
			</button>
		</div>
	</div>

	<!-- Game Portals & Livestream Tracker -->
	<div class="grid grid-cols-1 md:grid-cols-3 gap-3.5">
		{#each (['zzz', 'genshin', 'hsr'] as GameId[]) as g}
			{@const ls = streamByGame.get(g)}
			<div class="zzz-card p-4 flex items-center justify-between gap-3">
				<div class="min-w-0">
					<div class="flex items-center gap-2">
						<span class="w-2.5 h-2.5 rounded-full {GAME_META[g].dotClass}"></span>
						<span class="text-xs font-black text-white truncate">{GAME_META[g].label}</span>
					</div>
					<div class="text-xs text-[#9a9aab] mt-1">
						<span class="font-mono-hdd font-bold text-[#d8ff00]">{activeCounts[g]} active</span>
						{#if ls?.version}
							<span> · Stream v{ls.version}{ls.found ? ' (codes tracked)' : ''}</span>
						{/if}
					</div>
				</div>
				<a
					href={GAME_META[g].portalUrl}
					target="_blank"
					rel="noopener noreferrer"
					class="zzz-pill zzz-btn-dark px-3 py-1.5 text-xs shrink-0"
				>
					<span>Portal</span>
				</a>
			</div>
		{/each}
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

		<div class="flex flex-wrap items-center gap-2 w-full sm:w-auto">
			<select
				bind:value={sortBy}
				aria-label="Sort codes"
				class="zzz-input px-3 py-2 text-xs font-semibold cursor-pointer"
			>
				<option value="newest">Sort: Newest</option>
				<option value="livestream">Sort: Livestream</option>
				<option value="game">Sort: Game</option>
				<option value="code">Sort: A–Z</option>
			</select>
			<input
				type="text"
				bind:value={searchQuery}
				placeholder="Search codes or rewards..."
				class="zzz-input flex-1 sm:w-60 px-3.5 py-2 text-xs font-semibold"
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
								{#if formatTimeLabel(item.timestamp)}
									<span class="text-[#8f8fa0]">{formatTimeLabel(item.timestamp)}</span>
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
							class="zzz-pill px-4 py-1.5 text-xs {copiedCode === item.code ? 'zzz-btn-volt' : 'zzz-btn-dark'}"
						>
							<span>{copiedCode === item.code ? 'Copied' : 'Copy'}</span>
						</button>
						<a
							href={item.redeemUrl}
							target="_blank"
							rel="noopener noreferrer"
							class="zzz-pill zzz-btn-volt px-4 py-1.5 text-xs"
						>
							<span>Redeem</span>
						</a>
					</div>
				</article>
			{/each}
		</div>
	{:else}
		<div class="zzz-card p-10 text-center space-y-2">
			<div class="text-base font-black text-white">No matching codes</div>
			<p class="text-xs text-[#9a9aab]">
				Try clearing the search query or enabling expired codes.
			</p>
		</div>
	{/if}
</div>
