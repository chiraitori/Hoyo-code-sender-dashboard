<script lang="ts">
	import {
		GAME_META,
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
		onSelectGame: (game: GameId) => void;
	}

	let { guild, config, settings, language, previewGame, onSelectGame }: Props = $props();

	const SAMPLES: Record<GameId, { code: string; rewards: string; status: string }> = {
		zzz: {
			code: 'NEWERRIDU17',
			rewards: '300 Polychrome, 30,000 Dennies, 2 Senior Investigator Log',
			status: 'Livestream Drop'
		},
		genshin: {
			code: 'NATLAN56LIVE',
			rewards: '100 Primogems, 10 Mystic Enhancement Ore',
			status: 'Special Program'
		},
		hsr: {
			code: 'AMPHOREUS32',
			rewards: '100 Stellar Jade, 50,000 Credits',
			status: 'Special Program'
		}
	};

	const LANG_COPY: Record<
		SupportedLanguage,
		{ title: string; rewards: string; redeem: string; footer: string }
	> = {
		en: {
			title: 'New Redemption Code',
			rewards: 'Rewards',
			redeem: 'Redeem on HoYoLAB',
			footer: 'Dispatched by HoYo Code Sender'
		},
		jp: {
			title: '新しい交換コード',
			rewards: '報酬',
			redeem: 'HoYoLABで交換する',
			footer: 'HoYo Code Sender による自動配信'
		},
		vi: {
			title: 'Mã Đổi Thưởng Mới',
			rewards: 'Phần thưởng',
			redeem: 'Đổi trên HoYoLAB',
			footer: 'Tự động gửi bởi HoYo Code Sender'
		}
	};

	const meta = $derived(GAME_META[previewGame]);
	const sample = $derived(SAMPLES[previewGame]);
	const copy = $derived(LANG_COPY[language] ?? LANG_COPY.en);

	const roleName = $derived.by(() => {
		const roleId =
			previewGame === 'genshin'
				? config.genshinRole
				: previewGame === 'hsr'
					? config.hsrRole
					: config.zzzRole;
		if (!roleId) return null;
		const found = guild.roles.find((r) => r.id === roleId);
		return found ? `@${found.name}` : '@Role';
	});

	const targetChannelLabel = $derived.by(() => {
		const threadId = config.forumThreads?.[previewGame];
		if (settings.autoSendOptions.threads && threadId) {
			const thread = guild.threads.find((t) => t.id === threadId);
			if (thread) return `#${thread.name} (thread)`;
		}
		const chId = config.livestreamChannel || config.channel;
		if (!chId) return 'No channel selected';
		const ch = guild.channels.find((c) => c.id === chId);
		return ch ? `#${ch.name}` : `#channel`;
	});

	const isGameEnabled = $derived.by(() => {
		if (!settings.autoSendEnabled) return false;
		if (!settings.favoriteGames.enabled) return true;
		if (previewGame === 'genshin') return settings.favoriteGames.games.genshin;
		if (previewGame === 'hsr') return settings.favoriteGames.games.hkrpg;
		return settings.favoriteGames.games.nap;
	});

	const hasDestination = $derived(
		Boolean(config.channel || config.livestreamChannel || config.forumThreads?.[previewGame])
	);
	const willDeliver = $derived(isGameEnabled && hasDestination);
</script>

<div class="space-y-3">
	<div class="flex items-center justify-between gap-2">
		<span class="font-mono-hdd text-xs font-black tracking-wide text-[#d8ff00]">
			LIVE DISCORD MONITOR
		</span>
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

	<div class="discord-box p-4 text-xs space-y-2.5">
		<div class="flex items-center justify-between gap-2 pb-2 border-b border-[#2e3035]">
			<span class="font-mono-hdd font-semibold text-[#b5bac1] truncate">{targetChannelLabel}</span>
			<span
				class="font-mono-hdd px-2 py-0.5 rounded-full font-bold whitespace-nowrap {willDeliver
					? 'bg-[#d8ff00]/15 text-[#d8ff00]'
					: 'bg-[#ff5d1f]/20 text-[#ff8a5c]'}"
			>
				{willDeliver ? 'SIGNAL ACTIVE' : !hasDestination ? 'NO CHANNEL' : 'MUTED'}
			</span>
		</div>

		<div class="flex items-start gap-2.5">
			<div
				class="w-8 h-8 rounded-full flex items-center justify-center font-black text-xs shrink-0 text-[#08080a]"
				style="background: {meta.color};"
			>
				HC
			</div>
			<div class="flex-1 min-w-0 space-y-1.5">
				<div class="flex items-center gap-1.5">
					<span class="font-bold text-white">HoYo Code Sender</span>
					<span class="px-1.5 py-0.5 rounded bg-[#5865f2] text-white text-[10px] font-bold">APP</span>
					<span class="text-[#949ba4]">Preview</span>
				</div>

				{#if roleName}
					<div>
						<span class="px-1.5 py-0.5 rounded bg-[#5865f2]/25 text-[#c9cdfb] font-semibold">
							{roleName}
						</span>
					</div>
				{/if}

				<div class="discord-embed p-3 space-y-1.5" style="border-left-color: {meta.color};">
					<div class="text-[#b5bac1] font-semibold">{meta.label} // {copy.title}</div>
					<div class="font-mono-hdd text-sm font-black text-white tracking-wider">{sample.code}</div>
					<div>
						<div class="text-[#949ba4] font-semibold">{copy.rewards}</div>
						<div class="text-[#dbdee1] mt-0.5">{sample.rewards}</div>
					</div>
					<div class="flex items-center justify-between pt-1 text-[#949ba4]">
						<span>{copy.footer}</span>
						<span class="font-mono-hdd">{sample.status}</span>
					</div>
				</div>

				<div class="pt-0.5">
					<span class="inline-flex items-center px-3 py-1.5 rounded bg-[#4e5058] text-white font-semibold">
						{copy.redeem}
					</span>
				</div>
			</div>
		</div>
	</div>
</div>
