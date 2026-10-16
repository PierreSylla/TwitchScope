import type { HelixGame } from '../helix/games';
import type { GameView } from './types';

const BOX_ART_WIDTH = 285;
const BOX_ART_HEIGHT = 380;

export function sizeBoxArt(url: string): string {
  return url
    .replace('{width}', String(BOX_ART_WIDTH))
    .replace('{height}', String(BOX_ART_HEIGHT))
    .replace('%7Bwidth%7D', String(BOX_ART_WIDTH))
    .replace('%7Bheight%7D', String(BOX_ART_HEIGHT));
}

export function toGameViews(games: HelixGame[]): GameView[] {
  return games.map((game) => ({
    id: game.id,
    name: game.name,
    boxArtUrl: sizeBoxArt(game.box_art_url),
  }));
}
