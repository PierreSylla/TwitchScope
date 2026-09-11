import { describe, expect, it } from 'vitest';
import { sizeThumbnail, toFollowedStreamViews } from './mapper';
import type { HelixStream } from '../helix/streams';
import type { HelixUser } from '../helix/users';

describe('sizeThumbnail', () => {
  it('replaces the width/height placeholders', () => {
    expect(sizeThumbnail('https://example.com/x-{width}x{height}.jpg')).toBe(
      'https://example.com/x-440x248.jpg',
    );
  });
});

describe('toFollowedStreamViews', () => {
  const streams: HelixStream[] = [
    {
      id: '1',
      user_id: 'u1',
      user_login: 'small',
      user_name: 'Small',
      game_id: 'g1',
      game_name: 'Just Chatting',
      type: 'live',
      title: 'hi',
      viewer_count: 10,
      started_at: '2026-01-01T00:00:00Z',
      thumbnail_url: 'https://example.com/{width}x{height}.jpg',
    },
    {
      id: '2',
      user_id: 'u2',
      user_login: 'big',
      user_name: 'Big',
      game_id: 'g2',
      game_name: 'Chess',
      type: 'live',
      title: 'hey',
      viewer_count: 999,
      started_at: '2026-01-01T00:00:00Z',
      thumbnail_url: 'https://example.com/{width}x{height}.jpg',
    },
  ];

  it('sorts by viewer count descending', () => {
    const views = toFollowedStreamViews(streams, new Map());
    expect(views.map((v) => v.login)).toEqual(['big', 'small']);
  });

  it('attaches the avatar when the user is known, null otherwise', () => {
    const users = new Map<string, HelixUser>([
      ['u1', { id: 'u1', login: 'small', display_name: 'Small', profile_image_url: 'a.jpg' }],
    ]);
    const views = toFollowedStreamViews(streams, users);

    expect(views.find((v) => v.login === 'small')?.avatarUrl).toBe('a.jpg');
    expect(views.find((v) => v.login === 'big')?.avatarUrl).toBeNull();
  });
});
