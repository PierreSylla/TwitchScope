import { describe, expect, it } from 'vitest';
import { sizeBoxArt, toGameViews } from './mapper';

describe('sizeBoxArt', () => {
  it('fills the placeholders with a 3:4 size', () => {
    expect(sizeBoxArt('https://x/ab-{width}x{height}.jpg')).toBe('https://x/ab-285x380.jpg');
  });

  it('also fills percent-encoded placeholders', () => {
    expect(sizeBoxArt('https://x/ab-%7Bwidth%7Dx%7Bheight%7D.jpg')).toBe(
      'https://x/ab-285x380.jpg',
    );
  });
});

describe('toGameViews', () => {
  it('maps Helix fields and keeps the API order', () => {
    const views = toGameViews([
      { id: '1', name: 'Just Chatting', box_art_url: 'https://x/1-{width}x{height}.jpg' },
      { id: '2', name: 'Dota 2', box_art_url: 'https://x/2-{width}x{height}.jpg' },
    ]);
    expect(views).toEqual([
      { id: '1', name: 'Just Chatting', boxArtUrl: 'https://x/1-285x380.jpg' },
      { id: '2', name: 'Dota 2', boxArtUrl: 'https://x/2-285x380.jpg' },
    ]);
  });
});
