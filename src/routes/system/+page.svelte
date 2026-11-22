<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { GAME_META, type BotCommand, type GameId, type LivestreamStatus } from '#lib/types.ts';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	let cmdQuery = $state('');
	let categoryFilter = $state<'all' | 'setup' | 'codes' | 'info'>('all');
	let expandedCmd = $state<string | null>(null);
	let copiedCmd = $state<string | null>(null);
	let refreshing = $state(false);

	function categorizeCommand(name: string): 'setup' | 'codes' | 'info' {
		if (['listcodes', 'postcode'].includes(name)) return 'codes';
		if (['help', 'about', 'vote', 'dashboard'].includes(name)) return 'info';
		return 'setup';
	}

	const filteredCommands = $derived.by(() => {
		const q = cmdQuery.trim().toLowerCase();
		return data.commands.filter((c) => {
			if (categoryFilter !== 'all' && categorizeCommand(c.name) !== categoryFilter) {
				return false;
			}
			if (q) {
				return (
					c.name.toLowerCase().includes(q) ||
					c.description.toLowerCase().includes(q) ||
					(c.options || []).some((opt) => opt.name.toLowerCase().includes(q))
				);
			}
			return true;
		});
	});

	const isOnline = $derived(Boolean(data.stats && data.stats.status === 0));

	const trackerRows = $derived.by(() => {
		const lsMap = new Map<GameId, LivestreamStatus>();
		for (const item of data.livestreams) lsMap.set(item.game, item);
		return (['zzz', 'genshin', 'hsr'] as GameId[]).map((game) => {
			const list = data.codes.filter((c) => c.game === game);
			const active = list.filter((c) => !c.isExpired).length;
			const expired = list.length - active;
			const ls = lsMap.get(game) ?? null;
			return { game, meta: GAME_META[game], active, expired, total: list.length, ls };
		});
	});

	function formatUptime(sec: number): string {
		if (!Number.isFinite(sec) || sec <= 0) return '—';
		const d = Math.floor(sec / 86400);
		const h = Math.floor((sec % 86400) / 3600);
		const m = Math.floor((sec % 3600) / 60);
		if (d > 0) return `${d}d ${h}h`;
		if (h > 0) return `${h}h ${m}m`;
		return `${m}m`;
	}

	function formatUsage(cmd: BotCommand): string {
		const opts = (cmd.options || []).map((o) => (o.required ? `<${o.name}>` : `[${o.name}]`));
		return `/${cmd.name}${opts.length > 0 ? ' ' + opts.join(' ') : ''}`;
	}

	async function copyCommand(name: string) {
		try {
			await navigator.clipboard.writeText(`/${name}`);
		} catch {
			// ignore
		}
		copiedCmd = name;
		setTimeout(() => {
			if (copiedCmd === name) copiedCmd = null;
		}, 1500);
	}

	async function refreshAll() {
		refreshing = true;
		try {
			await invalidateAll();
		} finally {
			refreshing = false;
		}
	}
</script>

<div class="space-y-6">
	<div class="flex flex-wrap items-end justify-between gap-3">
		<div>
			<h1 class="text-2xl md:text-3xl font-black tracking-tight text-white">
				Bot status and commands
			</h1>
			<p class="text-xs text-[#9a9aab] mt-1">
				Live shard telemetry, code tracker status, and slash commands.
			</p>
		</div>

		<button
			type="button"
			onclick={refreshAll}
			disabled={refreshing}
			class="zzz-pill zzz-btn-volt px-4 py-2 text-xs"
		>
			<span>{refreshing ? 'Refreshing...' : 'Refresh live'}</span>
		</button>
	</div>

	<!-- Primary Metrics -->
	<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
		<div class="zzz-card p-4">
			<div class="text-xs font-semibold text-[#9a9aab]">Status</div>
			<div class="font-mono-hdd text-2xl font-black mt-1 {isOnline ? 'text-[#d8ff00]' : 'text-[#ff5d1f]'}">
				{isOnline ? 'Online' : 'Offline'}
			</div>
			{#if data.stats?.version}
				<div class="text-[11px] font-mono-hdd text-[#9a9aab] mt-1">v{data.stats.version}</div>
			{/if}
		</div>

		<div class="zzz-card p-4">
			<div class="text-xs font-semibold text-[#9a9aab]">Shards</div>
			<div class="font-mono-hdd text-2xl font-black text-white mt-1">
				{data.stats ? data.stats.shardCount : '—'}
			</div>
			<div class="text-[11px] text-[#9a9aab] mt-1">
				{data.stats ? `${data.stats.guildCount.toLocaleString()} servers` : '—'}
			</div>
		</div>

		<div class="zzz-card p-4">
			<div class="text-xs font-semibold text-[#9a9aab]">Uptime</div>
			<div class="font-mono-hdd text-2xl font-black text-white mt-1">
				{data.stats ? formatUptime(data.stats.uptime) : '—'}
			</div>
			<div class="text-[11px] text-[#9a9aab] mt-1">
				{data.stats ? `${data.stats.userCount.toLocaleString()} members` : '—'}
			</div>
		</div>

		<div class="zzz-card p-4">
			<div class="text-xs font-semibold text-[#9a9aab]">Gateway ping</div>
			<div class="font-mono-hdd text-2xl font-black text-white mt-1">
				{data.stats && data.stats.ping >= 0 ? `${data.stats.ping} ms` : '—'}
			</div>
			<div class="text-[11px] text-[#9a9aab] mt-1">
				{data.stats ? `${data.stats.channelCount.toLocaleString()} channels` : '—'}
			</div>
		</div>
	</div>

	<!-- Code & Livestream Tracker -->
	<section class="zzz-card overflow-hidden">
		<div class="px-5 py-3.5 bg-[#131318] border-b-2 border-[#08080a] flex items-center justify-between gap-2">
			<span class="text-sm font-black text-white">Code &amp; livestream tracker</span>
			<a href="/codes" class="text-xs font-bold text-[#d8ff00] hover:underline">Open codes</a>
		</div>
		<div class="grid grid-cols-1 md:grid-cols-3 divide-y-2 md:divide-y-0 md:divide-x-2 divide-[#25252e]">
			{#each trackerRows as row (row.game)}
				<div class="p-4 space-y-2">
					<div class="flex items-center justify-between gap-2">
						<span class="inline-flex items-center gap-2 text-xs font-black text-white">
							<span class="w-2.5 h-2.5 rounded-full {row.meta.dotClass}"></span>
							{row.meta.label}
						</span>
						<span class="font-mono-hdd text-xs font-bold text-[#d8ff00]">{row.active} active</span>
					</div>
					<div class="flex items-center justify-between text-xs text-[#9a9aab]">
						<span>{row.expired} expired · {row.total} total</span>
						{#if row.ls?.version}
							<span class="font-mono-hdd">
								Stream v{row.ls.version} · {row.ls.distributed ? 'Distributed' : row.ls.found ? 'Found' : 'Scheduled'}
							</span>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	</section>

	<!-- Interactive Slash Commands -->
	<section class="zzz-card overflow-hidden">
		<div class="px-5 py-3.5 bg-[#131318] border-b-2 border-[#08080a] flex flex-wrap items-center justify-between gap-3">
			<div class="flex flex-wrap items-center gap-2">
				<span class="text-sm font-black text-white mr-1">Slash commands</span>
				{#each [
					{ id: 'all' as const, label: 'All' },
					{ id: 'setup' as const, label: 'Setup & Config' },
					{ id: 'codes' as const, label: 'Codes' },
					{ id: 'info' as const, label: 'Info' }
				] as cat}
					<button
						type="button"
						onclick={() => (categoryFilter = cat.id)}
						class="zzz-pill px-3 py-1 text-xs {categoryFilter === cat.id ? 'zzz-btn-volt' : 'zzz-btn-dark'}"
					>
						<span>{cat.label}</span>
					</button>
				{/each}
			</div>
			<input
				type="text"
				bind:value={cmdQuery}
				placeholder="Search commands or options..."
				class="zzz-input px-3 py-1.5 text-xs font-semibold w-full sm:w-60"
			/>
		</div>

		{#if filteredCommands.length > 0}
			<div class="divide-y-2 divide-[#25252e]">
				{#each filteredCommands as cmd (cmd.name)}
					{@const hasOpts = Boolean(cmd.options && cmd.options.length > 0)}
					{@const isOpen = expandedCmd === cmd.name}
					<div class="px-5 py-3.5 space-y-2.5">
						<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
							<div class="flex flex-wrap items-center gap-2.5 min-w-0">
								<code class="font-mono-hdd text-xs font-black px-2.5 py-1 rounded-full bg-[#101014] border border-[#3a3a48] text-[#d8ff00]">
									{formatUsage(cmd)}
								</code>
								<span class="text-xs text-[#c7c7d4]">{cmd.description}</span>
							</div>

							<div class="flex items-center gap-2 shrink-0">
								{#if hasOpts}
									<button
										type="button"
										onclick={() => (expandedCmd = isOpen ? null : cmd.name)}
										class="zzz-pill zzz-btn-dark px-3 py-1 text-xs"
									>
										<span>{isOpen ? 'Hide options' : `${cmd.options!.length} options`}</span>
									</button>
								{/if}
								<button
									type="button"
									onclick={() => copyCommand(cmd.name)}
									class="zzz-pill px-3 py-1 text-xs {copiedCmd === cmd.name ? 'zzz-btn-volt' : 'zzz-btn-dark'}"
								>
									<span>{copiedCmd === cmd.name ? 'Copied' : 'Copy'}</span>
								</button>
							</div>
						</div>

						{#if isOpen && cmd.options}
							<div class="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
								{#each cmd.options as opt (opt.name)}
									<div class="zzz-subcard px-3 py-2 text-xs flex items-start justify-between gap-2">
										<div>
											<span class="font-mono-hdd font-bold text-white">{opt.name}</span>
											{#if opt.description}
												<p class="text-[#9a9aab] mt-0.5">{opt.description}</p>
											{/if}
										</div>
										<span class="text-[11px] font-bold px-2 py-0.5 rounded-full {opt.required ? 'bg-[#ff5d1f]/20 text-[#ff8a5c]' : 'bg-[#24242d] text-[#9a9aab]'}">
											{opt.required ? 'Required' : 'Optional'}
										</span>
									</div>
								{/each}
							</div>
						{/if}
					</div>
				{/each}
			</div>
		{:else}
			<div class="p-8 text-center text-xs text-[#9a9aab]">
				No commands match your filter right now.
			</div>
		{/if}
	</section>
</div>
