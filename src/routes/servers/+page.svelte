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
			<h1 class="text-2xl md:text-3xl font-black tracking-tight text-white">
				Your servers
			</h1>
			<p class="text-xs text-[#9a9aab] mt-1">
				Choose a Discord server to configure notification channels, roles, and game filters.
			</p>
		</div>
		{#if data.authenticated && data.guilds.length > 0}
			<input
				type="text"
				bind:value={search}
				placeholder="Search servers..."
				class="zzz-input px-3.5 py-2 text-xs font-semibold w-full sm:w-64"
			/>
		{/if}
	</div>

	{#if !data.authenticated}
		<div class="zzz-card p-8 md:p-10 text-center max-w-xl mx-auto space-y-4">
			<h2 class="text-2xl font-black text-white">Log in with Discord</h2>
			<p class="text-xs text-[#a9a9b8] leading-relaxed">
				We check your Discord permissions so only server owners, administrators, and channel managers can edit settings.
			</p>
			<div class="pt-2">
				<a href="/auth/login" class="zzz-pill zzz-btn-volt px-6 py-2.5 text-xs">
					<span>Log in with Discord</span>
				</a>
			</div>
		</div>
	{:else if data.errorMessage}
		<div class="zzz-card p-6 border-[#7f1d1d] space-y-3">
			<div class="text-sm font-black text-[#ff8585]">Could not load servers</div>
			<p class="text-xs text-[#d4d4dc]">{data.errorMessage}</p>
			<a href="/auth/login" class="zzz-pill zzz-btn-volt px-4 py-2 text-xs">
				<span>Log in again</span>
			</a>
		</div>
	{:else}
		<section class="space-y-3">
			<h2 class="text-xs font-black text-[#d8ff00]">
				Ready to configure ({linkedGuilds.length})
			</h2>

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
									<div class="text-xs text-[#9a9aab] mt-0.5">
										{guild.owner ? 'Owner' : 'Manager'}
									</div>
								</div>
							</div>

							<a
								href={`/servers/${guild.id}`}
								class="zzz-pill zzz-btn-volt px-4 py-1.5 text-xs shrink-0"
							>
								<span>Manage</span>
							</a>
						</div>
					{/each}
				</div>
			{:else}
				<div class="zzz-card p-6 text-xs text-[#9a9aab]">
					The bot is not in any of your manageable servers yet. Add it to a server below to get started.
				</div>
			{/if}
		</section>

		{#if unlinkedGuilds.length > 0}
			<section class="space-y-3 pt-2">
				<h2 class="text-xs font-black text-[#9a9aab]">
					Add bot to a server ({unlinkedGuilds.length})
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
									<div class="text-xs text-[#7a7a8c]">Bot not added</div>
								</div>
							</div>

							{#if data.inviteBaseUrl}
								<a
									href={inviteForGuild(guild.id)}
									target="_blank"
									rel="noopener noreferrer"
									class="zzz-pill zzz-btn-dark px-3.5 py-1.5 text-xs shrink-0"
								>
									<span>Invite</span>
								</a>
							{/if}
						</div>
					{/each}
				</div>
			</section>
		{/if}
	{/if}
</div>
