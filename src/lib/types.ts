export type GameId = 'genshin' | 'hsr' | 'zzz';

export interface GameCode {
	code: string;
	game: GameId;
	rewards: string;
	isExpired: boolean;
	timestamp: string;
	isLivestream: boolean;
	redeemUrl: string;
}

export interface BotPublicStats {
	guildCount: number;
	servers: number;
	userCount: number;
	channelCount: number;
	shardCount: number;
	ping: number;
	uptime: number;
	status: number;
	version: string;
	botUser: {
		username: string;
		id: string;
		avatar: string | null;
	} | null;
}

export interface BotPingInfo {
	ok: boolean;
	botReady: boolean;
	shardCount: number;
	authMode: string;
	serverTime: number;
	latencyMs: number;
	requestId: string | null;
}

export interface BotCommand {
	name: string;
	description: string;
	options?: Array<{ name: string; description?: string; required?: boolean }>;
}

export interface GuildSummary {
	id: string;
	name: string;
	icon: string | null;
	memberCount?: number;
	joinedAt?: string | null;
	owner?: boolean;
	botPresent: boolean;
}

export interface LivestreamStatus {
	game: GameId;
	version: string | null;
	streamTime: number;
	disabled: boolean;
	found: boolean;
	distributed: boolean;
	source: string | null;
	codeCount: number;
}

export interface ChannelDiagnosticTarget {
	label: string;
	id: string | null;
	name: string | null;
	status: 'ok' | 'unset' | 'missing' | 'missing_embed';
	canEmbed: boolean | null;
}

export interface ChannelCheckResult {
	valid: boolean;
	error: string | null;
	checkedAt: string;
	targets: ChannelDiagnosticTarget[];
}

export interface GuildChannel {
	id: string;
	name: string;
	type: number;
	position: number;
	canEmbed?: boolean;
}

export interface GuildThread {
	id: string;
	name: string;
	type: number;
	parentId: string | null;
	parentName: string | null;
}

export interface GuildRole {
	id: string;
	name: string;
	color: string;
	position: number;
	mentionable: boolean;
}

export interface GuildDetails {
	id: string;
	name: string;
	memberCount: number;
	icon: string | null;
	ownerId: string;
	channels: GuildChannel[];
	threads: GuildThread[];
	roles: GuildRole[];
}

export interface ServerConfig {
	guildId: string;
	genshinRole: string | null;
	hsrRole: string | null;
	zzzRole: string | null;
	channel: string | null;
	livestreamChannel: string | null;
	forumThreads: {
		genshin: string | null;
		hsr: string | null;
		zzz: string | null;
	};
}

export interface ServerSettings {
	guildId: string;
	autoSendEnabled: boolean;
	autoSendOptions: {
		channel: boolean;
		threads: boolean;
	};
	livestreamAnnouncementsEnabled: boolean;
	favoriteGames: {
		enabled: boolean;
		games: {
			genshin: boolean;
			hkrpg: boolean;
			nap: boolean;
		};
	};
	channelStatus?: {
		isInvalid: boolean;
		lastError: string | null;
		lastChecked: string | null;
	};
}

export type SupportedLanguage = 'en' | 'jp' | 'vi';

export interface ServerSnapshot {
	guild: GuildDetails;
	config: ServerConfig;
	settings: ServerSettings;
	language: SupportedLanguage;
	fetchedAt: string;
}

export const GAME_META: Record<
	GameId,
	{
		label: string;
		short: string;
		tape: string;
		dotClass: string;
		color: string;
		redeemBase: string;
		portalUrl: string;
	}
> = {
	zzz: {
		label: 'Zenless Zone Zero',
		short: 'ZZZ',
		tape: 'TAPE 01',
		dotClass: 'dot-zzz',
		color: '#d8ff00',
		redeemBase: 'https://zenless.hoyoverse.com/redemption?code=',
		portalUrl: 'https://zenless.hoyoverse.com/redemption'
	},
	genshin: {
		label: 'Genshin Impact',
		short: 'GI',
		tape: 'TAPE 02',
		dotClass: 'dot-genshin',
		color: '#38bdf8',
		redeemBase: 'https://genshin.hoyoverse.com/en/gift?code=',
		portalUrl: 'https://genshin.hoyoverse.com/en/gift'
	},
	hsr: {
		label: 'Honkai: Star Rail',
		short: 'HSR',
		tape: 'TAPE 03',
		dotClass: 'dot-hsr',
		color: '#a78bfa',
		redeemBase: 'https://hsr.hoyoverse.com/gift?code=',
		portalUrl: 'https://hsr.hoyoverse.com/gift'
	}
};

export function buildRedeemUrl(game: GameId, code: string): string {
	return `${GAME_META[game].redeemBase}${encodeURIComponent(code)}`;
}
