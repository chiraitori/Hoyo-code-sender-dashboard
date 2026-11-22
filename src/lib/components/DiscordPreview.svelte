<script lang="ts">
	import {
		GAME_META,
		formatRewardsText,
		type GameCode,
		type GameId,
		type GuildDetails,
		type ServerConfig,
		type ServerSettings,
		type SupportedLanguage
	} from '#lib/types.ts';

	interface Props {
		guild: GuildDetails;
		config: ServerConfig;
		settings: ServerSettings;
		language: SupportedLanguage;
		previewGame: GameId;
		activeCodes: GameCode[];
		botUser?: { username: string; avatar: string | null } | null;
		onSelectGame: (game: GameId) => void;
	}

	let {
		guild,
		config,
		settings,
		language,
		previewGame,
		activeCodes,
		botUser = null,
		onSelectGame
	}: Props = $props();
	let previewMode = $state<'regular' | 'livestream'>('regular');

	const LANG_COPY: Record<
		SupportedLanguage,
		{ title: string; liveTitle: string; rewards: string; redeem: string; emptyLive: string; empty: string }
	> = {
		en: {
			title: 'New Redemption Code',
			liveTitle: 'Special Program Livestream Code',
			rewards: 'Rewards',
			redeem: 'Redeem on HoYoLAB',
			emptyLive: 'No active livestream code right now',
			empty: 'No active code right now'
		},
		jp: {
			title: '新しい交換コード',
			liveTitle: '予告番組 交換コード',
			rewards: '報酬',
			redeem: 'HoYoLABで交換する',
			emptyLive: '現在配信中の限定コードはありません',
			empty: '現在利用可能なコードはありません'
		},
		vi: {
			title: 'Mã Đổi Thưởng Mới',
			liveTitle: 'Mã Livestream Phiên Bản Mới',
			rewards: 'Phần thưởng',
			redeem: 'Đổi trên HoYoLAB',
			emptyLive: 'Hiện chưa có mã livestream đang hoạt động',
			empty: 'Hiện chưa có mã đang hoạt động'
		}
	};

	const meta = $derived(GAME_META[previewGame]);
	const copy = $derived(LANG_COPY[language] ?? LANG_COPY.en);

	const liveCode = $derived.by(() => {
		const pool = activeCodes.filter((c) => c.game === previewGame && !c.isExpired);
		if (previewMode === 'livestream') {
			return pool.find((c) => c.isLivestream) ?? null;
		}
		return pool.find((c) => !c.isLivestream) ?? pool[0] ?? null;
	});

	const selectedRole = $derived.by(() => {
		const roleId =
			previewGame === 'genshin'
				? config.genshinRole
				: previewGame === 'hsr'
					? config.hsrRole
					: config.zzzRole;
		if (!roleId) return null;
		return guild.roles.find((r) => r.id === roleId) ?? null;
	});

	const roleBadgeStyle = $derived.by(() => {
		const c = selectedRole?.color;
		if (c && c !== '#000000') {
			return `color: ${c}; background-color: rgba(88, 101, 242, 0.16);`;
		}
		return 'color: #c9cdfb; background-color: rgba(88, 101, 242, 0.25);';
	});

	const targetChannelLabel = $derived.by(() => {
		const threadId = config.forumThreads?.[previewGame];
		if (previewMode === 'regular' && settings.autoSendOptions.threads && threadId) {
			const thread = guild.threads.find((t) => t.id === threadId);
			if (thread) return `#${thread.name} (thread)`;
		}
		const chId =
			previewMode === 'livestream'
				? config.livestreamChannel || config.channel
				: config.channel || (settings.autoSendOptions.threads ? threadId : null);
		if (!chId) return 'No channel selected';
		const ch = guild.channels.find((c) => c.id === chId);
		if (ch) return `#${ch.name}`;
		const th = guild.threads.find((t) => t.id === chId);
		return th ? `#${th.name} (thread)` : '#channel';
	});

	const isGameEnabled = $derived.by(() => {
		if (!settings.autoSendEnabled) return false;
		if (previewMode === 'livestream' && !settings.livestreamAnnouncementsEnabled) return false;
		if (!settings.favoriteGames.enabled) return true;
		if (previewGame === 'genshin') return settings.favoriteGames.games.genshin;
		if (previewGame === 'hsr') return settings.favoriteGames.games.hkrpg;
		return settings.favoriteGames.games.nap;
	});

	const hasDestination = $derived(
		previewMode === 'livestream'
			? Boolean(config.livestreamChannel || config.channel)
			: Boolean(
					(settings.autoSendOptions.channel && config.channel) ||
						(settings.autoSendOptions.threads && config.forumThreads?.[previewGame]) ||
						config.channel
				)
	);
	const willDeliver = $derived(isGameEnabled && hasDestination);
</script>

<div class="space-y-3">
	<div class="flex flex-wrap items-center justify-between gap-2">
		<span class="text-xs font-black text-white">Live Discord preview</span>
		<div class="flex items-center gap-1.5">
			{#each (['zzz', 'genshin', 'hsr'] as GameId[]) as g}
				<button
					type="button"
					onclick={() => onSelectGame(g)}
					class="zzz-pill px-2.5 py-1 text-xs {previewGame === g ? 'zzz-btn-volt' : 'zzz-btn-dark'}"
				>
					<span class="inline-flex items-center gap-1.5">
						<span class="w-1.5 h-1.5 rounded-full {GAME_META[g].dotClass}"></span>
						<span>{GAME_META[g].short}</span>
					</span>
				</button>
			{/each}
		</div>
	</div>

	<div class="grid grid-cols-2 gap-1.5">
		<button
			type="button"
			onclick={() => (previewMode = 'regular')}
			class="zzz-pill px-3 py-1.5 text-xs {previewMode === 'regular' ? 'zzz-btn-volt' : 'zzz-btn-dark'}"
		>
			<span>Regular drop</span>
		</button>
		<button
			type="button"
			onclick={() => (previewMode = 'livestream')}
			class="zzz-pill px-3 py-1.5 text-xs {previewMode === 'livestream' ? 'zzz-btn-orange' : 'zzz-btn-dark'}"
		>
			<span>Livestream notice</span>
		</button>
	</div>

	<div class="discord-box p-4 text-xs space-y-2.5">
		<div class="flex items-center justify-between gap-2 pb-2 border-b border-[#2e3035]">
			<span class="font-mono-hdd font-semibold text-[#b5bac1] truncate">{targetChannelLabel}</span>
			<span
				class="px-2 py-0.5 rounded-full font-bold whitespace-nowrap {willDeliver
					? 'bg-[#d8ff00]/15 text-[#d8ff00]'
					: 'bg-[#ff5d1f]/20 text-[#ff8a5c]'}"
			>
				{willDeliver ? 'Active' : !hasDestination ? 'Pick a channel' : 'Paused'}
			</span>
		</div>

		<div class="flex items-start gap-2.5">
			{#if botUser?.avatar}
				<img
					src={botUser.avatar}
					alt={botUser.username}
					class="w-8 h-8 rounded-full shrink-0"
				/>
			{:else}
				<div
					class="w-8 h-8 rounded-full flex items-center justify-center font-black text-xs shrink-0 text-[#08080a]"
					style="background: {meta.color};"
				>
					HC
				</div>
			{/if}
			<div class="flex-1 min-w-0 space-y-1.5">
				<div class="flex items-center gap-1.5">
					<span class="font-bold text-white">{botUser?.username || 'HoYo Code Sender'}</span>
					<span class="px-1.5 py-0.5 rounded bg-[#5865f2] text-white text-[10px] font-bold">APP</span>
				</div>

				{#if selectedRole}
					<div>
						<span class="px-1.5 py-0.5 rounded font-semibold" style={roleBadgeStyle}>
							@{selectedRole.name}
						</span>
					</div>
				{/if}

				{#key previewGame + previewMode}
					<div class="discord-embed p-3 space-y-1.5 zzz-enter" style="border-left-color: {meta.color};">
						<div class="text-[#b5bac1] font-semibold">
							{meta.label}: {previewMode === 'livestream' ? copy.liveTitle : copy.title}
						</div>
						{#if liveCode}
							<div class="font-mono-hdd text-sm font-black text-white tracking-wider">{liveCode.code}</div>
							<div>
								<div class="text-[#949ba4] font-semibold">{copy.rewards}</div>
								<div class="text-[#dbdee1] mt-0.5">{formatRewardsText(liveCode.rewards)}</div>
							</div>
							<div class="flex items-center justify-between pt-1 text-[#949ba4]">
								<span>{botUser?.username || 'HoYo Code Sender'}</span>
								<span>Live code</span>
							</div>
						{:else}
							<div class="text-[#949ba4]">
								{previewMode === 'livestream' ? copy.emptyLive : copy.empty}
							</div>
						{/if}
					</div>
				{/key}

				{#if liveCode}
					<div class="pt-0.5">
						<a
							href={liveCode.redeemUrl}
							target="_blank"
							rel="noopener noreferrer"
							class="inline-flex items-center px-3 py-1.5 rounded bg-[#4e5058] hover:bg-[#5c5f69] text-white font-semibold transition-colors"
						>
							{copy.redeem}
						</a>
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>
