<script lang="ts">
	import { untrack } from 'svelte';
	import DiscordPreview from '#lib/components/DiscordPreview.svelte';
	import {
		GAME_META,
		type ChannelCheckResult,
		type GameId,
		type ServerConfig,
		type ServerSettings,
		type ServerSnapshot,
		type SupportedLanguage
	} from '#lib/types.ts';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let guild = $state(untrack(() => structuredClone(data.snapshot.guild)));
	let config = $state<ServerConfig>(untrack(() => structuredClone(data.snapshot.config)));
	let settings = $state<ServerSettings>(untrack(() => structuredClone(data.snapshot.settings)));
	let language = $state<SupportedLanguage>(untrack(() => data.snapshot.language));
	let previewGame = $state<GameId>('zzz');

	type WorkspaceTab = 'channels' | 'roles' | 'postcode' | 'diagnostics';
	let activeTab = $state<WorkspaceTab>('channels');

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

	let channelFilter = $state('');
	let roleFilter = $state('');
	let checkingChannels = $state(false);
	let checkResult = $state<ChannelCheckResult | null>(null);

	// Manual post-code state
	let postGame = $state<GameId>('zzz');
	let postCode1 = $state('');
	let postCode2 = $state('');
	let postCode3 = $state('');
	let postMessage = $state('');
	let postMentionRole = $state(true);
	let postTarget = $state<'auto' | 'channel' | 'livestream' | 'thread'>('auto');
	let postingCode = $state(false);
	let copiedCmds = $state(false);

	const filteredChannels = $derived.by(() => {
		const q = channelFilter.trim().toLowerCase();
		if (!q) return guild.channels;
		return guild.channels.filter((ch) => ch.name.toLowerCase().includes(q));
	});

	const filteredRoles = $derived.by(() => {
		const q = roleFilter.trim().toLowerCase();
		if (!q) return guild.roles;
		return guild.roles.filter((r) => r.name.toLowerCase().includes(q));
	});

	const mainChannelObj = $derived(guild.channels.find((c) => c.id === config.channel) ?? null);
	const quickFillCodes = $derived(data.activeCodes.filter((c) => c.game === postGame).slice(0, 6));

	const selectedRoleSummary = $derived.by(() => {
		const pairs = [
			{ game: 'ZZZ', id: config.zzzRole },
			{ game: 'GI', id: config.genshinRole },
			{ game: 'HSR', id: config.hsrRole }
		];
		return pairs.map((p) => {
			const role = p.id ? guild.roles.find((r) => r.id === p.id) ?? null : null;
			return { ...p, role };
		});
	});

	const readinessChecks = $derived.by(() => {
		const configuredRoles = [config.zzzRole, config.genshinRole, config.hsrRole].filter(Boolean).length;
		const configuredThreads = [
			config.forumThreads?.zzz,
			config.forumThreads?.genshin,
			config.forumThreads?.hsr
		].filter(Boolean).length;

		return [
			{
				label: 'Main channel',
				ok: Boolean(config.channel && mainChannelObj),
				detail: mainChannelObj
					? `#${mainChannelObj.name}`
					: config.channel
						? 'Saved channel is inaccessible'
						: 'Not selected'
			},
			{
				label: 'Embed permissions',
				ok: Boolean(mainChannelObj && mainChannelObj.canEmbed !== false),
				detail: !mainChannelObj
					? 'Pick main channel first'
					: mainChannelObj.canEmbed === false
						? 'Missing Embed Links permission'
						: 'Embed Links granted'
			},
			{
				label: 'Auto-send delivery',
				ok: settings.autoSendEnabled,
				detail: settings.autoSendEnabled ? 'Enabled' : 'Paused'
			},
			{
				label: 'Role pings',
				ok: configuredRoles > 0,
				detail: configuredRoles > 0 ? `${configuredRoles}/3 games configured` : 'Optional (none set)'
			},
			{
				label: 'Forum threads',
				ok: configuredThreads > 0,
				detail:
					configuredThreads > 0
						? `${configuredThreads}/3 games mapped`
						: guild.threads.length > 0
							? 'Using main channel'
							: 'No active threads found'
			}
		];
	});

	const slashCommandSheet = $derived.by(() => {
		const lines: string[] = [];
		lines.push(mainChannelObj ? `/setup channel:#${mainChannelObj.name}` : '/setup channel:#codes');
		const liveCh = guild.channels.find((c) => c.id === config.livestreamChannel);
		if (liveCh) lines.push(`/livestreamcodesetup channel:#${liveCh.name}`);
		lines.push(`/setlang language:${language}`);
		lines.push(`/toggleautosend enabled:${settings.autoSendEnabled}`);
		return lines.join('\n');
	});

	function markDirty() {
		dirty = true;
		statusBanner = null;
	}

	function discardChanges() {
		guild = structuredClone(data.snapshot.guild);
		config = structuredClone(data.snapshot.config);
		settings = structuredClone(data.snapshot.settings);
		language = data.snapshot.language;
		dirty = false;
		statusBanner = { tone: 'ok', text: 'Reverted unsaved changes.' };
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

	async function sendTest(game?: GameId) {
		testing = true;
		statusBanner = null;
		try {
			const res = await fetch(`/api/server/${guild.id}/test`, {
				method: 'POST',
				headers: game ? { 'Content-Type': 'application/json' } : undefined,
				body: game ? JSON.stringify({ game }) : undefined
			});
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

	async function runChannelCheck() {
		checkingChannels = true;
		statusBanner = null;
		try {
			const res = await fetch(`/api/server/${guild.id}/check-channels`, { method: 'POST' });
			const body = (await res.json()) as ChannelCheckResult & { error?: string };
			if (!res.ok) {
				statusBanner = { tone: 'err', text: body.error || 'Could not check server channels.' };
				return;
			}
			checkResult = body;
			statusBanner = body.valid
				? { tone: 'ok', text: 'Channel verification passed. Bot can post and embed links.' }
				: { tone: 'err', text: body.error || 'Channel check reported a configuration issue.' };
		} catch {
			statusBanner = { tone: 'err', text: 'Could not verify channels right now.' };
		} finally {
			checkingChannels = false;
		}
	}

	function fillCodeSlot(code: string) {
		const upper = code.toUpperCase();
		if (postCode1 === upper || postCode2 === upper || postCode3 === upper) return;
		if (!postCode1.trim()) postCode1 = upper;
		else if (!postCode2.trim()) postCode2 = upper;
		else postCode3 = upper;
	}

	async function submitPostCode(e: SubmitEvent) {
		e.preventDefault();
		const codes = [postCode1, postCode2, postCode3]
			.map((c) => c.trim().toUpperCase())
			.filter(Boolean);
		if (codes.length === 0) {
			statusBanner = { tone: 'err', text: 'Enter at least one redemption code to post.' };
			return;
		}

		postingCode = true;
		statusBanner = null;
		try {
			const res = await fetch(`/api/server/${guild.id}/post-code`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					game: postGame,
					codes,
					message: postMessage.trim(),
					mentionRole: postMentionRole,
					target: postTarget
				})
			});
			const body = (await res.json()) as { message?: string; error?: string };
			if (!res.ok) {
				statusBanner = { tone: 'err', text: body.error || 'Failed to post codes to Discord.' };
				return;
			}
			statusBanner = { tone: 'ok', text: body.message || 'Codes posted to Discord.' };
			postCode1 = '';
			postCode2 = '';
			postCode3 = '';
			postMessage = '';
		} catch {
			statusBanner = { tone: 'err', text: 'Network error while posting codes.' };
		} finally {
			postingCode = false;
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

	async function copyCommandSheet() {
		try {
			await navigator.clipboard.writeText(slashCommandSheet);
		} catch {
			// ignore
		}
		copiedCmds = true;
		setTimeout(() => (copiedCmds = false), 1500);
	}
</script>

<div class="space-y-5">
	<!-- Server Header -->
	<div class="zzz-card p-5 flex flex-wrap items-center justify-between gap-4">
		<div class="flex items-center gap-3.5 min-w-0">
			<a href="/servers" class="zzz-pill zzz-btn-dark px-3.5 py-1.5 text-xs shrink-0">
				<span>Back</span>
			</a>
			{#if guild.icon}
				<img
					src={guild.icon}
					alt={guild.name}
					class="w-11 h-11 rounded-xl border-2 border-[#08080a] shrink-0"
				/>
			{/if}
			<div class="min-w-0">
				<div class="flex flex-wrap items-center gap-2">
					<h1 class="text-xl md:text-2xl font-black text-white truncate">{guild.name}</h1>
					<span
						class="text-[11px] font-bold px-2.5 py-0.5 rounded-full border {mainChannelObj
							? 'bg-[#172110] border-[#d8ff00]/60 text-[#d8ff00]'
							: 'bg-[#2b1518] border-[#ff5d1f]/60 text-[#ff8a5c]'}"
					>
						{mainChannelObj ? 'Configured' : 'Needs channel'}
					</span>
				</div>
				<p class="text-xs text-[#9a9aab] mt-0.5">
					{guild.memberCount.toLocaleString()} members · {guild.channels.length} sendable channels · {guild.threads.length} threads · {guild.roles.length} roles
				</p>
			</div>
		</div>

		<div class="flex flex-wrap items-center gap-2">
			{#if dirty}
				<button
					type="button"
					onclick={discardChanges}
					class="zzz-pill zzz-btn-dark px-4 py-2 text-xs"
				>
					<span>Discard</span>
				</button>
			{/if}
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

	{#if statusBanner}
		<div
			class="rounded-xl px-4 py-3 text-xs font-bold border-2 {statusBanner.tone === 'ok'
				? 'bg-[#172110] border-[#d8ff00] text-[#d8ff00]'
				: 'bg-[#2b1518] border-[#ef4444] text-[#fca5a5]'}"
		>
			{statusBanner.text}
		</div>
	{/if}

	<!-- Workspace Tabs -->
	<div class="flex flex-wrap items-center gap-2">
		{#each [
			{ id: 'channels' as const, label: 'Channels & Delivery' },
			{ id: 'roles' as const, label: 'Roles & Games' },
			{ id: 'postcode' as const, label: 'Post Code' },
			{ id: 'diagnostics' as const, label: 'Diagnostics & Reset' }
		] as tab}
			<button
				type="button"
				onclick={() => (activeTab = tab.id)}
				class="zzz-pill px-4 py-2 text-xs {activeTab === tab.id ? 'zzz-btn-volt' : 'zzz-btn-dark'}"
			>
				<span>{tab.label}</span>
			</button>
		{/each}
	</div>

	<div class="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
		<div class="lg:col-span-7 space-y-5">
			{#if activeTab === 'channels'}
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

					<div class="space-y-1.5">
						<label for="filter-channels" class="block text-xs font-bold text-[#9a9aab]">
							Filter channel list
						</label>
						<input
							id="filter-channels"
							type="text"
							bind:value={channelFilter}
							placeholder="Search channels by name..."
							class="zzz-input w-full px-3 py-2 text-xs font-semibold"
						/>
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
								{#each filteredChannels as ch (ch.id)}
									<option value={ch.id}>
										#{ch.name}{ch.type === 5 ? ' [Announcement]' : ''}{ch.canEmbed === false ? ' [No Embed]' : ''}
									</option>
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
								{#each filteredChannels as ch (ch.id)}
									<option value={ch.id}>
										#{ch.name}{ch.type === 5 ? ' [Announcement]' : ''}
									</option>
								{/each}
							</select>
						</div>

						<div class="space-y-1.5 sm:col-span-2">
							<label for="cfg-lang" class="block text-xs font-bold text-[#d4d4dc]">
								Bot language
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
								<option value="en">English (EN)</option>
								<option value="jp">日本語 (JP)</option>
								<option value="vi">Tiếng Việt (VI)</option>
							</select>
						</div>
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
			{:else if activeTab === 'roles'}
				<section class="zzz-card p-5 space-y-4">
					<div class="flex flex-wrap items-center justify-between gap-3 pb-3 border-b-2 border-[#2a2a34]">
						<div>
							<h2 class="text-sm font-black text-white">Notification role pings</h2>
							<p class="text-xs text-[#9a9aab] mt-0.5">
								Choose which Discord role to ping when a game posts new codes.
							</p>
						</div>
						<input
							type="text"
							bind:value={roleFilter}
							placeholder="Filter roles..."
							class="zzz-input px-3 py-1.5 text-xs font-semibold w-full sm:w-48"
						/>
					</div>

					<div class="space-y-3">
						{#each [
							{ id: 'cfg-zzz-role', field: 'zzzRole' as const, game: 'zzz' as GameId, label: 'Zenless Zone Zero role' },
							{ id: 'cfg-gi-role', field: 'genshinRole' as const, game: 'genshin' as GameId, label: 'Genshin Impact role' },
							{ id: 'cfg-hsr-role', field: 'hsrRole' as const, game: 'hsr' as GameId, label: 'Honkai: Star Rail role' }
						] as row}
							{@const currentRole = config[row.field] ? guild.roles.find((r) => r.id === config[row.field]) : null}
							<div class="zzz-subcard p-3.5 space-y-2">
								<div class="flex items-center justify-between gap-2">
									<label for={row.id} class="text-xs font-bold text-white flex items-center gap-2">
										<span class="w-2.5 h-2.5 rounded-full {GAME_META[row.game].dotClass}"></span>
										{row.label}
									</label>
									{#if currentRole}
										<span class="text-[11px] font-semibold flex items-center gap-1.5 text-[#c7c7d4]">
											<span
												class="w-2.5 h-2.5 rounded-full border border-white/20"
												style="background: {currentRole.color !== '#000000' ? currentRole.color : '#5865f2'};"
											></span>
											{currentRole.mentionable ? 'Mentionable' : 'Requires Mention Everyone perm'}
										</span>
									{/if}
								</div>
								<div class="flex items-center gap-2">
									<select
										id={row.id}
										value={config[row.field] ?? ''}
										onchange={(e) => {
											setSelect(row.field, e.currentTarget.value);
											previewGame = row.game;
										}}
										class="zzz-input flex-1 px-3 py-2 text-xs font-semibold cursor-pointer"
									>
										<option value="">No role ping</option>
										{#each filteredRoles as role (role.id)}
											<option value={role.id}>@{role.name}</option>
										{/each}
									</select>
									{#if config[row.field]}
										<button
											type="button"
											onclick={() => setSelect(row.field, '')}
											class="zzz-pill zzz-btn-dark px-3 py-2 text-xs"
										>
											<span>Clear</span>
										</button>
									{/if}
								</div>
							</div>
						{/each}
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
								class="zzz-subcard px-3.5 py-3 flex items-center justify-between text-xs font-black cursor-pointer hover:border-[#d8ff00] transition-colors {settings.favoriteGames.enabled ? '' : 'opacity-75'}"
							>
								<span class="inline-flex items-center gap-2">
									<span class="w-2.5 h-2.5 rounded-full {item.dot}"></span>
									{item.label}
								</span>
								<span class="font-mono-hdd {active ? 'text-[#d8ff00]' : 'text-[#6c6c7c]'}">
									{active ? 'On' : 'Off'}
								</span>
							</button>
						{/each}
					</div>
				</section>
			{:else if activeTab === 'postcode'}
				<section class="zzz-card p-5 space-y-4">
					<div class="pb-3 border-b-2 border-[#2a2a34]">
						<h2 class="text-sm font-black text-white">Post codes to {guild.name}</h2>
						<p class="text-xs text-[#9a9aab] mt-0.5">
							Send 1–3 redemption codes immediately to your saved channel or game thread, with optional role ping and note.
						</p>
					</div>

					<form onsubmit={submitPostCode} class="space-y-4">
						<div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
							<div class="space-y-1.5">
								<label for="post-game" class="block text-xs font-bold text-[#d4d4dc]">
									Game
								</label>
								<select
									id="post-game"
									bind:value={postGame}
									onchange={() => (previewGame = postGame)}
									class="zzz-input w-full px-3 py-2 text-xs font-semibold cursor-pointer"
								>
									<option value="zzz">Zenless Zone Zero</option>
									<option value="genshin">Genshin Impact</option>
									<option value="hsr">Honkai: Star Rail</option>
								</select>
							</div>

							<div class="space-y-1.5">
								<label for="post-target" class="block text-xs font-bold text-[#d4d4dc]">
									Destination
								</label>
								<select
									id="post-target"
									bind:value={postTarget}
									class="zzz-input w-full px-3 py-2 text-xs font-semibold cursor-pointer"
								>
									<option value="auto">Auto (thread if set, else main)</option>
									<option value="channel">Main channel</option>
									<option value="livestream">Livestream channel</option>
									<option value="thread">Game forum thread</option>
								</select>
							</div>
						</div>

						{#if quickFillCodes.length > 0}
							<div class="space-y-1.5">
								<div class="text-xs font-bold text-[#9a9aab]">Quick-fill live {GAME_META[postGame].short} codes</div>
								<div class="flex flex-wrap gap-1.5">
									{#each quickFillCodes as qc (qc.code)}
										<button
											type="button"
											onclick={() => fillCodeSlot(qc.code)}
											class="zzz-pill zzz-btn-dark px-3 py-1 text-xs font-mono-hdd"
										>
											<span>+ {qc.code}</span>
										</button>
									{/each}
								</div>
							</div>
						{/if}

						<div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
							<input
								type="text"
								bind:value={postCode1}
								placeholder="Code 1 (required)"
								maxlength={32}
								class="zzz-input px-3 py-2 text-xs font-mono-hdd uppercase font-bold"
							/>
							<input
								type="text"
								bind:value={postCode2}
								placeholder="Code 2 (optional)"
								maxlength={32}
								class="zzz-input px-3 py-2 text-xs font-mono-hdd uppercase font-bold"
							/>
							<input
								type="text"
								bind:value={postCode3}
								placeholder="Code 3 (optional)"
								maxlength={32}
								class="zzz-input px-3 py-2 text-xs font-mono-hdd uppercase font-bold"
							/>
						</div>

						<div class="space-y-1.5">
							<label for="post-note" class="block text-xs font-bold text-[#d4d4dc]">
								Optional note
							</label>
							<textarea
								id="post-note"
								bind:value={postMessage}
								rows="2"
								maxlength={500}
								placeholder="Optional note shown in the Discord embed..."
								class="zzz-input w-full px-3 py-2 text-xs font-semibold"
							></textarea>
						</div>

						<div class="flex flex-wrap items-center justify-between gap-3 pt-2 border-t-2 border-[#2a2a34]">
							<label class="inline-flex items-center gap-2 text-xs font-bold text-[#d4d4dc] cursor-pointer">
								<input type="checkbox" bind:checked={postMentionRole} class="accent-[#d8ff00] w-4 h-4" />
								<span>Ping configured {GAME_META[postGame].short} role</span>
							</label>

							<button
								type="submit"
								disabled={postingCode || !config.channel}
								class="zzz-pill zzz-btn-volt px-5 py-2 text-xs"
							>
								<span>{postingCode ? 'Posting...' : 'Post to Discord'}</span>
							</button>
						</div>
					</form>
				</section>
			{:else}
				<!-- Diagnostics, Tests, CLI Reference & Reset -->
				<section class="zzz-card p-5 space-y-4">
					<div class="flex flex-wrap items-center justify-between gap-3 pb-3 border-b-2 border-[#2a2a34]">
						<div>
							<h2 class="text-sm font-black text-white">Setup &amp; permission checks</h2>
							<p class="text-xs text-[#9a9aab] mt-0.5">
								Verify saved destinations and bot permissions across shards.
							</p>
						</div>
						<button
							type="button"
							onclick={runChannelCheck}
							disabled={checkingChannels}
							class="zzz-pill zzz-btn-volt px-4 py-1.5 text-xs"
						>
							<span>{checkingChannels ? 'Checking...' : 'Verify channels'}</span>
						</button>
					</div>

					<div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
						{#each readinessChecks as item}
							<div class="zzz-subcard p-3 flex items-start justify-between gap-2 text-xs">
								<div>
									<div class="font-bold text-white">{item.label}</div>
									<div class="text-[#9a9aab] mt-0.5">{item.detail}</div>
								</div>
								<span
									class="px-2 py-0.5 rounded-full font-bold shrink-0 {item.ok
										? 'bg-[#d8ff00]/15 text-[#d8ff00]'
										: 'bg-[#ff5d1f]/20 text-[#ff8a5c]'}"
								>
									{item.ok ? 'OK' : 'Check'}
								</span>
							</div>
						{/each}
					</div>

					{#if checkResult}
						<div class="zzz-subcard p-3.5 space-y-2 text-xs">
							<div class="font-bold text-white">Live verification targets</div>
							<div class="space-y-1.5">
								{#each checkResult.targets as target}
									<div class="flex items-center justify-between gap-2">
										<span class="text-[#c7c7d4]">
											{target.label}: {target.name ? `#${target.name}` : 'Unset'}
										</span>
										<span
											class="font-mono-hdd font-bold {target.status === 'ok'
												? 'text-[#d8ff00]'
												: 'text-[#ff8a5c]'}"
										>
											{target.status}
										</span>
									</div>
								{/each}
							</div>
						</div>
					{/if}

					<div class="pt-2 border-t-2 border-[#2a2a34] space-y-2.5">
						<div class="text-xs font-black text-white">Test deliveries</div>
						<div class="flex flex-wrap gap-2">
							<button
								type="button"
								disabled={testing || !config.channel}
								onclick={() => sendTest()}
								class="zzz-pill zzz-btn-dark px-4 py-2 text-xs"
							>
								<span>Send basic test</span>
							</button>
							{#each (['zzz', 'genshin', 'hsr'] as GameId[]) as g}
								<button
									type="button"
									disabled={testing || !config.channel}
									onclick={() => sendTest(g)}
									class="zzz-pill zzz-btn-dark px-3.5 py-2 text-xs"
								>
									<span>Demo {GAME_META[g].short}</span>
								</button>
							{/each}
						</div>
					</div>
				</section>

				<section class="zzz-card p-5 space-y-3">
					<div class="flex items-center justify-between gap-2">
						<h2 class="text-sm font-black text-white">Equivalent slash commands</h2>
						<button
							type="button"
							onclick={copyCommandSheet}
							class="zzz-pill px-3 py-1 text-xs {copiedCmds ? 'zzz-btn-volt' : 'zzz-btn-dark'}"
						>
							<span>{copiedCmds ? 'Copied' : 'Copy'}</span>
						</button>
					</div>
					<pre class="zzz-subcard p-3.5 font-mono-hdd text-xs text-[#d8ff00] overflow-x-auto">{slashCommandSheet}</pre>
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
			{/if}
		</div>

		<aside class="lg:col-span-5 lg:sticky lg:top-24 space-y-4">
			<div class="zzz-card p-5 space-y-4">
				<DiscordPreview
					{guild}
					{config}
					{settings}
					{language}
					{previewGame}
					onSelectGame={(g) => (previewGame = g)}
				/>

				{#if selectedRoleSummary.some((s) => s.role)}
					<div class="flex flex-wrap gap-1.5 pt-2 border-t-2 border-[#2a2a34]">
						{#each selectedRoleSummary as item}
							{#if item.role}
								<span class="text-[11px] font-bold px-2.5 py-1 rounded-full bg-[#131318] border border-[#31313d] text-[#d4d4dc]">
									{item.game}: @{item.role.name}
								</span>
							{/if}
						{/each}
					</div>
				{/if}

				<div class="flex flex-wrap items-center justify-between gap-2.5 pt-3 border-t-2 border-[#2a2a34]">
					<button
						type="button"
						disabled={testing || !config.channel}
						onclick={() => sendTest()}
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
