import type { HelixGame } from '../helix/games';
import type { GameView } from './types';

const BOX_ART_WIDTH = 285;
const BOX_ART_HEIGHT = 380;

export function sizeBoxArt(
  url: string,
  width: number = BOX_ART_WIDTH,
  height: number = BOX_ART_HEIGHT,
): string {
  return url
    .replace('{width}', String(width))
    .replace('{height}', String(height))
    .replace('%7Bwidth%7D', String(width))
    .replace('%7Bheight%7D', String(height));
}

export function toGameViews(games: HelixGame[]): GameView[] {
  return games.map((game) => ({
    id: game.id,
    name: game.name,
    boxArtUrl: sizeBoxArt(game.box_art_url),
  }));
}
