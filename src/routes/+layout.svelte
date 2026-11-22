<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';
	import { invalidateAll } from '$app/navigation';
	import type { Snippet } from 'svelte';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: Snippet } = $props();
	let loggingOut = $state(false);

	const navItems = [
		{ href: '/', label: 'Home', match: (p: string) => p === '/' },
		{ href: '/codes', label: 'Codes', match: (p: string) => p.startsWith('/codes') },
		{ href: '/servers', label: 'Servers', match: (p: string) => p.startsWith('/servers') },
		{ href: '/system', label: 'Status', match: (p: string) => p.startsWith('/system') }
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
	<header class="sticky top-0 z-40 bg-[#111115]/95 backdrop-blur-sm border-b-2 border-[#08080a]">
		<div class="h-2 w-full zzz-hazard"></div>
		<div class="max-w-7xl mx-auto px-4 md:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
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
					<div class="text-base font-black tracking-tight text-white leading-none">
						HoYo Code Sender
					</div>
					<div class="text-xs text-[#9a9aab] mt-0.5">
						Genshin, Star Rail &amp; ZZZ codes for Discord
					</div>
				</div>
			</a>

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

			<div class="flex items-center gap-2.5">
				{#if data.botStatus}
					<div
						class="hidden xl:flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1a1a21] border border-[#31313d] text-xs font-medium"
					>
						<span
							class="w-2 h-2 rounded-full {data.botStatus.online ? 'bg-[#d8ff00]' : 'bg-[#ff5d1f]'}"
						></span>
						<span class="text-[#d8d8e4]">
							{data.botStatus.online ? 'Online' : 'Offline'}
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
							class="zzz-pill zzz-btn-dark px-3.5 py-1.5 text-xs"
						>
							<span>{loggingOut ? 'Logging out...' : 'Log out'}</span>
						</button>
					</div>
				{:else}
					<a href="/auth/login" class="zzz-pill zzz-btn-volt px-4 py-1.5 text-xs">
						<span>Log in with Discord</span>
					</a>
				{/if}
			</div>
		</div>
	</header>

	<main class="flex-1 max-w-7xl w-full mx-auto px-4 md:px-6 py-6 md:py-8">
		{@render children()}
	</main>

	<footer class="border-t-2 border-[#08080a] bg-[#111115] mt-10">
		<div class="max-w-7xl mx-auto px-4 md:px-6 py-5 flex flex-wrap items-center justify-between gap-3 text-xs text-[#8f8fa0]">
			<div>HoYo Code Sender is not affiliated with HoYoverse.</div>
			<div class="flex flex-wrap items-center gap-4 font-semibold">
				<a href="/codes" class="hover:text-[#d8ff00] transition-colors">Codes</a>
				<a href="/system" class="hover:text-[#d8ff00] transition-colors">Status</a>
				<a href="/privacy" class="hover:text-[#d8ff00] transition-colors">Privacy</a>
				<a href="/terms" class="hover:text-[#d8ff00] transition-colors">Terms</a>
				{#if data.inviteUrl}
					<a
						href={data.inviteUrl}
						target="_blank"
						rel="noopener noreferrer"
						class="text-[#d8ff00] hover:underline"
					>
						Add to Discord
					</a>
				{/if}
			</div>
		</div>
	</footer>
</div>
