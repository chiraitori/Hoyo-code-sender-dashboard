<script lang="ts">
	import { untrack } from 'svelte';
	import DiscordPreview from '#lib/components/DiscordPreview.svelte';
	import type {
		GameId,
		ServerConfig,
		ServerSettings,
		ServerSnapshot,
		SupportedLanguage
	} from '#lib/types.ts';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let guild = $state(untrack(() => structuredClone(data.snapshot.guild)));
	let config = $state<ServerConfig>(untrack(() => structuredClone(data.snapshot.config)));
	let settings = $state<ServerSettings>(untrack(() => structuredClone(data.snapshot.settings)));
	let language = $state<SupportedLanguage>(untrack(() => data.snapshot.language));
	let previewGame = $state<GameId>('zzz');

	$effect(() => {
		guild = structuredClone(data.snapshot.guild);
		config = structuredClone(data.snapshot.config);
		settings = structuredClone(data.snapshot.settings);
		language = data.snapshot.language;
		dirty = false;
	});

	let dirty = $state(false);
	let saving = $state(false);
	let testing = $state(false);
	let resetting = $state(false);
	let confirmReset = $state(false);
	let statusBanner = $state<{ tone: 'ok' | 'err'; text: string } | null>(null);

	function markDirty() {
		dirty = true;
		statusBanner = null;
	}

	function setSelect(
		field: 'channel' | 'livestreamChannel' | 'genshinRole' | 'hsrRole' | 'zzzRole',
		value: string
	) {
		config[field] = value || null;
		markDirty();
	}

	function setThread(game: GameId, value: string) {
		if (!config.forumThreads) {
			config.forumThreads = { genshin: null, hsr: null, zzz: null };
		}
		config.forumThreads[game] = value || null;
		markDirty();
	}

	async function saveAll() {
		saving = true;
		statusBanner = null;
		try {
			const res = await fetch(`/api/server/${guild.id}/snapshot`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					config: {
						channel: config.channel,
						livestreamChannel: config.livestreamChannel,
						genshinRole: config.genshinRole,
						hsrRole: config.hsrRole,
						zzzRole: config.zzzRole,
						forumThreads: config.forumThreads
					},
					settings: {
						autoSendEnabled: settings.autoSendEnabled,
						autoSendOptions: settings.autoSendOptions,
						livestreamAnnouncementsEnabled: settings.livestreamAnnouncementsEnabled,
						favoriteGames: settings.favoriteGames
					},
					language
				})
			});
			const body = (await res.json()) as Partial<ServerSnapshot> & { error?: string };
			if (!res.ok || !body.guild || !body.config || !body.settings || !body.language) {
				statusBanner = {
					tone: 'err',
					text: body.error || 'Could not save settings.'
				};
				return;
			}
			guild = body.guild;
			config = body.config;
			settings = body.settings;
			language = body.language;
			dirty = false;
			statusBanner = { tone: 'ok', text: `Saved settings for ${guild.name}.` };
		} catch {
			statusBanner = { tone: 'err', text: 'Could not save changes. Please try again.' };
		} finally {
			saving = false;
		}
	}

	async function sendTest() {
		testing = true;
		statusBanner = null;
		try {
			const res = await fetch(`/api/server/${guild.id}/test`, { method: 'POST' });
			const body = (await res.json()) as { message?: string; error?: string };
			if (!res.ok) {
				statusBanner = { tone: 'err', text: body.error || 'Could not send test message.' };
			} else {
				statusBanner = { tone: 'ok', text: body.message || 'Test message sent.' };
			}
		} catch {
			statusBanner = { tone: 'err', text: 'Could not send test message. Please try again.' };
		} finally {
			testing = false;
		}
	}

	async function resetServer() {
		resetting = true;
		statusBanner = null;
		try {
			const res = await fetch(`/api/server/${guild.id}/reset`, { method: 'POST' });
			const body = (await res.json()) as { message?: string; error?: string };
			if (!res.ok) {
				statusBanner = { tone: 'err', text: body.error || 'Could not reset settings.' };
				return;
			}
			config = {
				guildId: guild.id,
				channel: null,
				livestreamChannel: null,
				genshinRole: null,
				hsrRole: null,
				zzzRole: null,
				forumThreads: { genshin: null, hsr: null, zzz: null }
			};
			settings = {
				guildId: guild.id,
				autoSendEnabled: true,
				autoSendOptions: { channel: true, threads: true },
				livestreamAnnouncementsEnabled: true,
				favoriteGames: { enabled: false, games: { genshin: true, hkrpg: true, nap: true } }
			};
			language = 'en';
			dirty = false;
			confirmReset = false;
			statusBanner = { tone: 'ok', text: body.message || 'Server settings reset.' };
		} catch {
			statusBanner = { tone: 'err', text: 'Could not reset settings. Please try again.' };
		} finally {
			resetting = false;
		}
	}
</script>

<div class="space-y-5">
	<div class="flex flex-wrap items-center justify-between gap-3">
		<div class="flex items-center gap-3 min-w-0">
			<a href="/servers" class="zzz-pill zzz-btn-dark px-3.5 py-1.5 text-xs">
				<span>Back</span>
			</a>
			<div class="min-w-0">
				<h1 class="text-xl md:text-2xl font-black text-white truncate">{guild.name}</h1>
				<p class="text-xs text-[#9a9aab]">
					{guild.memberCount.toLocaleString()} members · {guild.channels.length} channels
				</p>
			</div>
		</div>
	</div>

	{#if statusBanner}
		<div
			class="rounded-xl px-4 py-3 text-xs font-bold border-2 {statusBanner.tone === 'ok'
				? 'bg-[#172110] border-[#d8ff00] text-[#d8ff00]'
				: 'bg-[#2b1518] border-[#ef4444] text-[#fca5a5]'}"
		>
			{statusBanner.text}
		</div>
	{/if}

	<div class="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
		<div class="lg:col-span-7 space-y-5">
			<section class="zzz-card p-5 space-y-4">
				<div class="flex items-center justify-between gap-4 pb-3.5 border-b-2 border-[#2a2a34]">
					<div>
						<h2 class="text-sm font-black text-white">Auto-send codes</h2>
						<p class="text-xs text-[#9a9aab] mt-0.5">
							Post new codes automatically when they are released.
						</p>
					</div>
					<button
						type="button"
						role="switch"
						aria-checked={settings.autoSendEnabled}
						aria-label="Toggle automatic code delivery"
						onclick={() => {
							settings.autoSendEnabled = !settings.autoSendEnabled;
							markDirty();
						}}
						class="zzz-switch"
					>
						<span class="zzz-switch-knob"></span>
					</button>
				</div>

				<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<div class="space-y-1.5">
						<label for="cfg-channel" class="block text-xs font-bold text-[#d4d4dc]">
							Main channel
						</label>
						<select
							id="cfg-channel"
							value={config.channel ?? ''}
							onchange={(e) => setSelect('channel', e.currentTarget.value)}
							class="zzz-input w-full px-3 py-2 text-xs font-semibold cursor-pointer"
						>
							<option value="">Not set</option>
							{#each guild.channels as ch (ch.id)}
								<option value={ch.id}>#{ch.name}</option>
							{/each}
						</select>
					</div>

					<div class="space-y-1.5">
						<label for="cfg-live-channel" class="block text-xs font-bold text-[#d4d4dc]">
							Livestream channel
						</label>
						<select
							id="cfg-live-channel"
							value={config.livestreamChannel ?? ''}
							onchange={(e) => setSelect('livestreamChannel', e.currentTarget.value)}
							class="zzz-input w-full px-3 py-2 text-xs font-semibold cursor-pointer"
						>
							<option value="">Same as main channel</option>
							{#each guild.channels as ch (ch.id)}
								<option value={ch.id}>#{ch.name}</option>
							{/each}
						</select>
					</div>

					<div class="space-y-1.5">
						<label for="cfg-lang" class="block text-xs font-bold text-[#d4d4dc]">
							Language
						</label>
						<select
							id="cfg-lang"
							value={language}
							onchange={(e) => {
								language = e.currentTarget.value as SupportedLanguage;
								markDirty();
							}}
							class="zzz-input w-full px-3 py-2 text-xs font-semibold cursor-pointer"
						>
							<option value="en">English</option>
							<option value="jp">日本語</option>
							<option value="vi">Tiếng Việt</option>
						</select>
					</div>

					<div class="space-y-1.5">
						<label for="cfg-zzz-role" class="block text-xs font-bold text-[#d4d4dc]">
							Zenless Zone Zero ping role
						</label>
						<select
							id="cfg-zzz-role"
							value={config.zzzRole ?? ''}
							onchange={(e) => setSelect('zzzRole', e.currentTarget.value)}
							class="zzz-input w-full px-3 py-2 text-xs font-semibold cursor-pointer"
						>
							<option value="">None</option>
							{#each guild.roles as role (role.id)}
								<option value={role.id}>@{role.name}</option>
							{/each}
						</select>
					</div>

					<div class="space-y-1.5">
						<label for="cfg-gi-role" class="block text-xs font-bold text-[#d4d4dc]">
							Genshin Impact ping role
						</label>
						<select
							id="cfg-gi-role"
							value={config.genshinRole ?? ''}
							onchange={(e) => setSelect('genshinRole', e.currentTarget.value)}
							class="zzz-input w-full px-3 py-2 text-xs font-semibold cursor-pointer"
						>
							<option value="">None</option>
							{#each guild.roles as role (role.id)}
								<option value={role.id}>@{role.name}</option>
							{/each}
						</select>
					</div>

					<div class="space-y-1.5">
						<label for="cfg-hsr-role" class="block text-xs font-bold text-[#d4d4dc]">
							Honkai: Star Rail ping role
						</label>
						<select
							id="cfg-hsr-role"
							value={config.hsrRole ?? ''}
							onchange={(e) => setSelect('hsrRole', e.currentTarget.value)}
							class="zzz-input w-full px-3 py-2 text-xs font-semibold cursor-pointer"
						>
							<option value="">None</option>
							{#each guild.roles as role (role.id)}
								<option value={role.id}>@{role.name}</option>
							{/each}
						</select>
					</div>
				</div>
			</section>

			<section class="zzz-card p-5 space-y-4">
				<div class="flex items-center justify-between gap-4 pb-3.5 border-b-2 border-[#2a2a34]">
					<div>
						<h2 class="text-sm font-black text-white">Filter by game</h2>
						<p class="text-xs text-[#9a9aab] mt-0.5">
							When off, your server receives codes for all three games.
						</p>
					</div>
					<button
						type="button"
						role="switch"
						aria-checked={settings.favoriteGames.enabled}
						aria-label="Toggle favorite games filter"
						onclick={() => {
							settings.favoriteGames.enabled = !settings.favoriteGames.enabled;
							markDirty();
						}}
						class="zzz-switch"
					>
						<span class="zzz-switch-knob"></span>
					</button>
				</div>

				<div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
					{#each [
						{ key: 'nap' as const, preview: 'zzz' as GameId, label: 'ZZZ', dot: 'dot-zzz' },
						{ key: 'genshin' as const, preview: 'genshin' as GameId, label: 'Genshin', dot: 'dot-genshin' },
						{ key: 'hkrpg' as const, preview: 'hsr' as GameId, label: 'Star Rail', dot: 'dot-hsr' }
					] as item}
						{@const active = !settings.favoriteGames.enabled || settings.favoriteGames.games[item.key]}
						<button
							type="button"
							onclick={() => {
								settings.favoriteGames.enabled = true;
								settings.favoriteGames.games[item.key] = !settings.favoriteGames.games[item.key];
								previewGame = item.preview;
								markDirty();
							}}
							class="zzz-subcard px-3.5 py-2.5 flex items-center justify-between text-xs font-black cursor-pointer hover:border-[#d8ff00] transition-colors {settings.favoriteGames.enabled ? '' : 'opacity-75'}"
						>
							<span class="inline-flex items-center gap-2">
								<span class="w-2 h-2 rounded-full {item.dot}"></span>
								{item.label}
							</span>
							<span class="font-mono-hdd {active ? 'text-[#d8ff00]' : 'text-[#6c6c7c]'}">
								{active ? 'On' : 'Off'}
							</span>
						</button>
					{/each}
				</div>

				<div class="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t-2 border-[#2a2a34]">
					<label class="zzz-subcard px-3 py-2.5 flex items-center justify-between gap-2 text-xs font-bold cursor-pointer">
						<span>Post to channel</span>
						<input
							type="checkbox"
							checked={settings.autoSendOptions.channel}
							onchange={(e) => {
								settings.autoSendOptions.channel = e.currentTarget.checked;
								markDirty();
							}}
							class="accent-[#d8ff00] w-4 h-4"
						/>
					</label>
					<label class="zzz-subcard px-3 py-2.5 flex items-center justify-between gap-2 text-xs font-bold cursor-pointer">
						<span>Post to threads</span>
						<input
							type="checkbox"
							checked={settings.autoSendOptions.threads}
							onchange={(e) => {
								settings.autoSendOptions.threads = e.currentTarget.checked;
								markDirty();
							}}
							class="accent-[#d8ff00] w-4 h-4"
						/>
					</label>
					<label class="zzz-subcard px-3 py-2.5 flex items-center justify-between gap-2 text-xs font-bold cursor-pointer">
						<span>Stream notices</span>
						<input
							type="checkbox"
							checked={settings.livestreamAnnouncementsEnabled}
							onchange={(e) => {
								settings.livestreamAnnouncementsEnabled = e.currentTarget.checked;
								markDirty();
							}}
							class="accent-[#d8ff00] w-4 h-4"
						/>
					</label>
				</div>

				{#if guild.threads.length > 0}
					<div class="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t-2 border-[#2a2a34]">
						{#each [
							{ game: 'zzz' as GameId, label: 'ZZZ thread' },
							{ game: 'genshin' as GameId, label: 'Genshin thread' },
							{ game: 'hsr' as GameId, label: 'Star Rail thread' }
						] as th}
							<div class="space-y-1.5">
								<label for={`thread-${th.game}`} class="block text-xs font-bold text-[#d4d4dc]">
									{th.label}
								</label>
								<select
									id={`thread-${th.game}`}
									value={config.forumThreads?.[th.game] ?? ''}
									onchange={(e) => setThread(th.game, e.currentTarget.value)}
									class="zzz-input w-full px-3 py-2 text-xs font-semibold cursor-pointer"
								>
									<option value="">Use main channel</option>
									{#each guild.threads as thread (thread.id)}
										<option value={thread.id}>
											#{thread.name}{thread.parentName ? ` (${thread.parentName})` : ''}
										</option>
									{/each}
								</select>
							</div>
						{/each}
					</div>
				{/if}
			</section>

			<section class="zzz-subcard p-4 flex flex-wrap items-center justify-between gap-3">
				<div>
					<div class="text-xs font-black text-[#ff8585]">Reset settings</div>
					<p class="text-xs text-[#9a9aab] mt-0.5">
						Clear all saved channels, roles, threads, and language preferences for {guild.name}.
					</p>
				</div>
				{#if confirmReset}
					<div class="flex items-center gap-2">
						<button
							type="button"
							onclick={() => (confirmReset = false)}
							class="zzz-pill zzz-btn-dark px-3.5 py-1.5 text-xs"
						>
							<span>Cancel</span>
						</button>
						<button
							type="button"
							disabled={resetting}
							onclick={resetServer}
							class="zzz-pill zzz-btn-danger px-4 py-1.5 text-xs"
						>
							<span>{resetting ? 'Resetting...' : 'Confirm reset'}</span>
						</button>
					</div>
				{:else}
					<button
						type="button"
						onclick={() => (confirmReset = true)}
						class="zzz-pill zzz-btn-danger px-4 py-1.5 text-xs"
					>
						<span>Reset</span>
					</button>
				{/if}
			</section>
		</div>

		<aside class="lg:col-span-5 lg:sticky lg:top-24">
			<div class="zzz-card p-5 space-y-4">
				<DiscordPreview
					{guild}
					{config}
					{settings}
					{language}
					{previewGame}
					onSelectGame={(g) => (previewGame = g)}
				/>

				<div class="flex flex-wrap items-center justify-between gap-2.5 pt-3 border-t-2 border-[#2a2a34]">
					<button
						type="button"
						disabled={testing || !config.channel}
						onclick={sendTest}
						class="zzz-pill zzz-btn-dark px-4 py-2 text-xs"
					>
						<span>{testing ? 'Sending...' : 'Send test'}</span>
					</button>

					<button
						type="button"
						disabled={saving}
						onclick={saveAll}
						class="zzz-pill px-5 py-2 text-xs {dirty ? 'zzz-btn-volt' : 'zzz-btn-dark'}"
					>
						<span>{saving ? 'Saving...' : dirty ? 'Save changes' : 'Saved'}</span>
					</button>
				</div>
			</div>
		</aside>
	</div>
</div>
