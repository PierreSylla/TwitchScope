export interface GameView {
  id: string;
  name: string;
  boxArtUrl: string;
}

export type GamesMessage = { type: 'games/getTop'; cursor?: string };

export type GamesResponse =
  { ok: true; games: GameView[]; cursor?: string } | { ok: false; error: string };
