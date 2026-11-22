<script lang="ts">
	import type { BotPingInfo } from '#lib/types.ts';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	let overridePing = $state<BotPingInfo | null>(null);
	let pinging = $state(false);
	let cmdQuery = $state('');

	const livePing = $derived(overridePing ?? data.ping);

	const filteredCommands = $derived.by(() => {
		const q = cmdQuery.trim().toLowerCase();
		if (!q) return data.commands;
		return data.commands.filter(
			(c) => c.name.toLowerCase().includes(q) || c.description.toLowerCase().includes(q)
		);
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

	async function repingVps() {
		pinging = true;
		try {
			const res = await fetch('/api/bot/ping');
			if (res.ok) {
				overridePing = (await res.json()) as BotPingInfo;
			}
		} finally {
			pinging = false;
		}
	}
</script>

<div class="space-y-6">
	<div class="flex flex-wrap items-end justify-between gap-3">
		<div>
			<div class="font-mono-hdd text-xs font-black text-[#d8ff00]">// HDD SYSTEM TELEMETRY</div>
			<h1 class="text-2xl md:text-3xl font-black tracking-tight text-white mt-0.5">
				SHARD DECK &amp; SLASH COMMANDS
			</h1>
		</div>
		<button
			type="button"
			disabled={pinging}
			onclick={repingVps}
			class="zzz-pill zzz-btn-volt px-4 py-2 text-xs"
		>
			<span>{pinging ? 'PINGING VPS...' : 'PING VPS BRIDGE'}</span>
		</button>
	</div>

	<!-- Bridge & Shard Telemetry Cards -->
	<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
		<div class="zzz-card p-4">
			<div class="font-mono-hdd text-xs text-[#9a9aab]">VERCEL ↔ VPS LINK</div>
			<div class="font-mono-hdd text-2xl font-black mt-1 {livePing?.ok ? 'text-[#d8ff00]' : 'text-[#ff5d1f]'}">
				{livePing?.ok ? `${livePing.latencyMs} ms` : 'OFFLINE'}
			</div>
			<div class="font-mono-hdd text-xs text-[#8f8fa0] mt-1">
				AUTH // {livePing?.authMode ? livePing.authMode.toUpperCase() : 'UNAVAILABLE'}
			</div>
		</div>

		<div class="zzz-card p-4">
			<div class="font-mono-hdd text-xs text-[#9a9aab]">DISCORD SHARDS</div>
			<div class="font-mono-hdd text-2xl font-black text-white mt-1">
				{data.stats ? data.stats.shardCount : livePing?.shardCount ?? '—'}
			</div>
			<div class="font-mono-hdd text-xs text-[#8f8fa0] mt-1">
				{livePing?.botReady ? 'ALL SHARDS READY' : 'CHECK BOT STATUS'}
			</div>
		</div>

		<div class="zzz-card p-4">
			<div class="font-mono-hdd text-xs text-[#9a9aab]">UPTIME</div>
			<div class="font-mono-hdd text-2xl font-black text-white mt-1">
				{data.stats ? formatUptime(data.stats.uptime) : '—'}
			</div>
			<div class="font-mono-hdd text-xs text-[#8f8fa0] mt-1">
				VERSION // {data.stats?.version ?? '—'}
			</div>
		</div>

		<div class="zzz-card p-4">
			<div class="font-mono-hdd text-xs text-[#9a9aab]">DISCORD GATEWAY</div>
			<div class="font-mono-hdd text-2xl font-black text-white mt-1">
				{data.stats && data.stats.ping >= 0 ? `${data.stats.ping} ms` : '—'}
			</div>
			<div class="font-mono-hdd text-xs text-[#8f8fa0] mt-1">
				{data.stats ? `${data.stats.guildCount.toLocaleString()} GUILDS` : 'STATS UNAVAILABLE'}
			</div>
		</div>
	</div>

	<!-- Slash Command Directory -->
	<section class="zzz-card overflow-hidden">
		<div class="px-5 py-3.5 bg-[#131318] border-b-2 border-[#08080a] flex flex-wrap items-center justify-between gap-3">
			<div class="flex items-center gap-2.5">
				<span class="font-mono-hdd text-xs font-black text-white">REGISTERED SLASH COMMANDS</span>
				<span class="font-mono-hdd text-xs text-[#d8ff00]">{filteredCommands.length} SHOWN</span>
			</div>
			<input
				type="text"
				bind:value={cmdQuery}
				placeholder="Filter commands..."
				class="zzz-input px-3 py-1.5 text-xs font-semibold w-full sm:w-60"
			/>
		</div>

		{#if filteredCommands.length > 0}
			<div class="divide-y-2 divide-[#25252e]">
				{#each filteredCommands as cmd (cmd.name)}
					<div class="px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
						<div class="flex flex-wrap items-center gap-3">
							<code class="font-mono-hdd text-xs font-black px-2.5 py-1 rounded-full bg-[#101014] border border-[#3a3a48] text-[#d8ff00]">
								/{cmd.name}
							</code>
							<span class="text-xs text-[#c7c7d4]">{cmd.description}</span>
						</div>
						{#if cmd.options && cmd.options.length > 0}
							<span class="font-mono-hdd text-xs text-[#8f8fa0] shrink-0">
								{cmd.options.length} {cmd.options.length === 1 ? 'OPT' : 'OPTS'}
							</span>
						{/if}
					</div>
				{/each}
			</div>
		{:else}
			<div class="p-8 text-center text-xs text-[#9a9aab]">
				No slash commands returned by the bot right now.
			</div>
		{/if}
	</section>
</div>
