<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';
	import { invalidateAll } from '$app/navigation';
	import type { Snippet } from 'svelte';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: Snippet } = $props();
	let loggingOut = $state(false);

	const navItems = [
		{ href: '/', label: 'INTER-KNOT', match: (p: string) => p === '/' },
		{ href: '/codes', label: 'COMMISSIONS', match: (p: string) => p.startsWith('/codes') },
		{ href: '/servers', label: 'HDD ROUTING', match: (p: string) => p.startsWith('/servers') },
		{ href: '/system', label: 'SHARD DECK', match: (p: string) => p.startsWith('/system') }
	];

	async function handleLogout() {
		loggingOut = true;
		try {
			await fetch('/api/auth/logout', { method: 'POST' });
			await invalidateAll();
			window.location.href = '/';
		} finally {
			loggingOut = false;
		}
	}
</script>

<div class="min-h-dvh flex flex-col">
	<!-- ZZZ Inter-Knot Hardware Top Bar -->
	<header class="sticky top-0 z-40 bg-[#111115]/95 backdrop-blur-sm border-b-2 border-[#08080a]">
		<div class="h-2 w-full zzz-hazard"></div>
		<div class="max-w-7xl mx-auto px-4 md:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
			<!-- Brand Emblem -->
			<a href="/" class="flex items-center gap-3 group">
				<div
					class="w-10 h-10 rounded-full bg-[#d8ff00] border-2 border-[#08080a] shadow-[0_3px_0_#08080a] flex items-center justify-center shrink-0 transition-transform group-hover:scale-105"
				>
					<svg
						width="20"
						height="20"
						viewBox="0 0 24 24"
						fill="none"
						stroke="#08080a"
						stroke-width="2.6"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
					</svg>
				</div>
				<div>
					<div class="flex items-center gap-2">
						<span class="text-base font-black tracking-tight text-white leading-none">INTER-KNOT</span>
						<span class="px-2 py-0.5 rounded-full bg-[#ff5d1f] text-[#08080a] font-mono-hdd text-[11px] font-black leading-none">
							LIVE
						</span>
					</div>
					<div class="text-xs font-mono-hdd text-[#9a9aab] mt-0.5">
						HOYO CODE SENDER // RANDOM PLAY HDD
					</div>
				</div>
			</a>

			<!-- Kinetic Slanted Pill Navigation -->
			<nav class="flex flex-wrap items-center gap-2" aria-label="Primary Navigation">
				{#each navItems as item}
					{@const active = item.match(page.url.pathname)}
					<a
						href={item.href}
						class="zzz-pill px-4 py-1.5 text-xs tracking-wide {active ? 'zzz-btn-volt' : 'zzz-btn-dark'}"
					>
						<span>{item.label}</span>
					</a>
				{/each}
			</nav>

			<!-- Status + Discord Session -->
			<div class="flex items-center gap-2.5">
				{#if data.botStatus}
					<div
						class="hidden xl:flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1a1a21] border border-[#31313d] text-xs font-mono-hdd"
					>
						<span
							class="w-2 h-2 rounded-full {data.botStatus.online ? 'bg-[#d8ff00]' : 'bg-[#ff5d1f]'}"
						></span>
						<span class="text-[#d8d8e4]">
							{data.botStatus.shardCount} {data.botStatus.shardCount === 1 ? 'SHARD' : 'SHARDS'}
						</span>
					</div>
				{/if}

				{#if data.user}
					<div class="flex items-center gap-2">
						<a
							href="/servers"
							class="flex items-center gap-2 pl-1.5 pr-3 py-1 rounded-full bg-[#1b1b22] border-2 border-[#31313d] hover:border-[#d8ff00] transition-colors text-xs font-bold"
						>
							{#if data.user.avatar}
								<img
									src={`https://cdn.discordapp.com/avatars/${data.user.id}/${data.user.avatar}.png?size=64`}
									alt={data.user.username}
									class="w-6 h-6 rounded-full"
								/>
							{:else}
								<span
									class="w-6 h-6 rounded-full bg-[#d8ff00] text-[#08080a] flex items-center justify-center font-black text-[11px]"
								>
									{data.user.username.slice(0, 1).toUpperCase()}
								</span>
							{/if}
							<span class="max-w-[110px] truncate">{data.user.username}</span>
						</a>
						<button
							type="button"
							onclick={handleLogout}
							disabled={loggingOut}
							class="zzz-pill zzz-btn-dark px-3 py-1.5 text-xs"
						>
							<span>{loggingOut ? '...' : 'OUT'}</span>
						</button>
					</div>
				{:else}
					<a href="/auth/login" class="zzz-pill zzz-btn-volt px-4 py-1.5 text-xs tracking-wide">
						<span>DISCORD LOGIN</span>
					</a>
				{/if}
			</div>
		</div>
	</header>

	<!-- Main Content -->
	<main class="flex-1 max-w-7xl w-full mx-auto px-4 md:px-6 py-6 md:py-8">
		{@render children()}
	</main>

	<!-- Inter-Knot Footer -->
	<footer class="border-t-2 border-[#08080a] bg-[#111115] mt-10">
		<div class="max-w-7xl mx-auto px-4 md:px-6 py-5 flex flex-wrap items-center justify-between gap-3 text-xs font-mono-hdd text-[#8f8fa0]">
			<div>HOYO CODE SENDER // NOT AFFILIATED WITH HOYOVERSE</div>
			<div class="flex flex-wrap items-center gap-4">
				<a href="/codes" class="hover:text-[#d8ff00] transition-colors">CODES</a>
				<a href="/system" class="hover:text-[#d8ff00] transition-colors">SYSTEM</a>
				<a href="/privacy" class="hover:text-[#d8ff00] transition-colors">PRIVACY</a>
				<a href="/terms" class="hover:text-[#d8ff00] transition-colors">TERMS</a>
				{#if data.inviteUrl}
					<a
						href={data.inviteUrl}
						target="_blank"
						rel="noopener noreferrer"
						class="text-[#d8ff00] font-bold hover:underline"
					>
						INVITE BOT
					</a>
				{/if}
			</div>
		</div>
	</footer>
</div>
