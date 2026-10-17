export interface FollowedChannelView {
  id: string;
  login: string;
  name: string;
}

export type ChannelsMessage = { type: 'channels/getFollowed'; cursor?: string };

export type ChannelsResponse =
  { ok: true; channels: FollowedChannelView[]; cursor?: string } | { ok: false; error: string };
