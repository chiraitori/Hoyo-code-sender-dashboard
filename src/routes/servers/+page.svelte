<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	let search = $state('');

	const filtered = $derived.by(() => {
		const q = search.trim().toLowerCase();
		if (!q) return data.guilds;
		return data.guilds.filter((g) => g.name.toLowerCase().includes(q) || g.id.includes(q));
	});

	const linkedGuilds = $derived(filtered.filter((g) => g.botPresent));
	const unlinkedGuilds = $derived(filtered.filter((g) => !g.botPresent));

	function inviteForGuild(guildId: string): string {
		if (!data.inviteBaseUrl) return '#';
		const u = new URL(data.inviteBaseUrl);
		u.searchParams.set('guild_id', guildId);
		return u.toString();
	}
</script>

<div class="space-y-6">
	<div class="flex flex-wrap items-end justify-between gap-3">
		<div>
			<div class="font-mono-hdd text-xs font-black text-[#d8ff00]">// HDD SERVER ROUTING</div>
			<h1 class="text-2xl md:text-3xl font-black tracking-tight text-white mt-0.5">
				SELECT A DISCORD SERVER
			</h1>
		</div>
		{#if data.authenticated && data.guilds.length > 0}
			<input
				type="text"
				bind:value={search}
				placeholder="Filter servers..."
				class="zzz-input px-3.5 py-2 text-xs font-semibold w-full sm:w-64"
			/>
		{/if}
	</div>

	{#if !data.authenticated}
		<div class="zzz-card p-8 md:p-10 text-center max-w-xl mx-auto space-y-4">
			<div class="inline-block px-3 py-1 rounded-full bg-[#131318] border border-[#343440] font-mono-hdd text-xs font-black text-[#d8ff00]">
				AUTHENTICATION REQUIRED
			</div>
			<h2 class="text-2xl font-black text-white">Sign in with Discord</h2>
			<p class="text-xs text-[#a9a9b8] leading-relaxed">
				Permissions are verified live with Discord OAuth. Only server owners, administrators, and channel managers can modify routing for a guild.
			</p>
			<div class="pt-2">
				<a href="/auth/login" class="zzz-pill zzz-btn-volt px-6 py-2.5 text-xs tracking-wide">
					<span>CONNECT DISCORD ACCOUNT</span>
				</a>
			</div>
		</div>
	{:else if data.errorMessage}
		<div class="zzz-card p-6 border-[#7f1d1d] space-y-3">
			<div class="text-sm font-black text-[#ff8585]">CONNECTION WARNING</div>
			<p class="text-xs text-[#d4d4dc]">{data.errorMessage}</p>
			<a href="/auth/login" class="zzz-pill zzz-btn-volt px-4 py-2 text-xs">
				<span>RE-AUTHENTICATE</span>
			</a>
		</div>
	{:else}
		<!-- Linked Servers (Bot is already in guild) -->
		<section class="space-y-3">
			<div class="flex items-center justify-between">
				<h2 class="font-mono-hdd text-xs font-black text-[#d8ff00]">
					BOT CONNECTED ({linkedGuilds.length})
				</h2>
			</div>

			{#if linkedGuilds.length > 0}
				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{#each linkedGuilds as guild (guild.id)}
						<div class="zzz-card-bevel p-4 flex items-center justify-between gap-3">
							<div class="flex items-center gap-3 min-w-0">
								{#if guild.icon}
									<img
										src={guild.icon}
										alt={guild.name}
										class="w-11 h-11 rounded-xl border-2 border-[#08080a] shrink-0"
									/>
								{:else}
									<div
										class="w-11 h-11 rounded-xl bg-[#24242d] border-2 border-[#08080a] flex items-center justify-center font-black text-sm text-[#d8ff00] shrink-0"
									>
										{guild.name.slice(0, 2).toUpperCase()}
									</div>
								{/if}
								<div class="min-w-0">
									<div class="text-sm font-black text-white truncate">{guild.name}</div>
									<div class="font-mono-hdd text-[11px] text-[#9a9aab] mt-0.5">
										{guild.owner ? 'OWNER' : 'MANAGER'} · READY
									</div>
								</div>
							</div>

							<a
								href={`/servers/${guild.id}`}
								class="zzz-pill zzz-btn-volt px-3.5 py-1.5 text-xs shrink-0"
							>
								<span>ROUTE</span>
							</a>
						</div>
					{/each}
				</div>
			{:else}
				<div class="zzz-card p-6 text-xs text-[#9a9aab]">
					None of your manageable servers currently have the bot connected. Invite it to a server below.
				</div>
			{/if}
		</section>

		<!-- Unlinked Servers (Invite Bot) -->
		{#if unlinkedGuilds.length > 0}
			<section class="space-y-3 pt-2">
				<h2 class="font-mono-hdd text-xs font-black text-[#9a9aab]">
					ADD BOT TO SERVER ({unlinkedGuilds.length})
				</h2>
				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{#each unlinkedGuilds as guild (guild.id)}
						<div class="zzz-subcard p-4 flex items-center justify-between gap-3">
							<div class="flex items-center gap-3 min-w-0">
								{#if guild.icon}
									<img
										src={guild.icon}
										alt={guild.name}
										class="w-10 h-10 rounded-xl opacity-80 shrink-0"
									/>
								{:else}
									<div
										class="w-10 h-10 rounded-xl bg-[#1d1d24] flex items-center justify-center font-bold text-xs text-[#9a9aab] shrink-0"
									>
										{guild.name.slice(0, 2).toUpperCase()}
									</div>
								{/if}
								<div class="min-w-0">
									<div class="text-xs font-bold text-[#d4d4dc] truncate">{guild.name}</div>
									<div class="font-mono-hdd text-[11px] text-[#7a7a8c]">NOT LINKED</div>
								</div>
							</div>

							{#if data.inviteBaseUrl}
								<a
									href={inviteForGuild(guild.id)}
									target="_blank"
									rel="noopener noreferrer"
									class="zzz-pill zzz-btn-dark px-3.5 py-1.5 text-xs shrink-0"
								>
									<span>INVITE</span>
								</a>
							{/if}
						</div>
					{/each}
				</div>
			</section>
		{/if}
	{/if}
</div>
