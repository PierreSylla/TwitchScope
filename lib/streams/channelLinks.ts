export type ChannelAction = 'newTab' | 'playerOnly' | 'multitwitch' | 'chat' | 'videos';

export const CHANNEL_ACTIONS: readonly ChannelAction[] = [
  'newTab',
  'playerOnly',
  'multitwitch',
  'chat',
  'videos',
];

export function channelUrl(action: ChannelAction, login: string): string {
  const channel = encodeURIComponent(login);
  switch (action) {
    case 'newTab':
      return `https://www.twitch.tv/${channel}`;
    case 'playerOnly':
      return `https://player.twitch.tv/?channel=${channel}&parent=twitch.tv`;
    case 'multitwitch':
      return `https://multitwitch.tv/${channel}`;
    case 'chat':
      return `https://www.twitch.tv/popout/${channel}/chat`;
    case 'videos':
      return `https://www.twitch.tv/${channel}/videos`;
  }
}
