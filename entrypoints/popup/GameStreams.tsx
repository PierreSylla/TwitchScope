import { browser } from 'wxt/browser';
import { sendMessage } from '@/lib/messaging';
import type { StreamsMessage, StreamsResponse } from '@/lib/streams/types';
import type { Density } from '@/lib/settings/types';
import StreamPageList from './StreamPageList';

interface GameStreamsProps {
  gameId: string;
  gameName: string;
  density: Density;
  onBack: () => void;
  onDisconnected: () => void;
}

function GameStreams({ gameId, gameName, density, onBack, onDisconnected }: GameStreamsProps) {
  return (
    <>
      <div className="flex h-9 items-center gap-2 border-b border-hairline px-2.5">
        <button
          type="button"
          onClick={onBack}
          aria-label={browser.i18n.getMessage('browseBackButton')}
          className="flex h-6 w-6 flex-none items-center justify-center rounded-lg text-ink-muted hover:bg-tile focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand"
        >
          ←
        </button>
        <span className="truncate text-[13px] font-semibold text-ink">{gameName}</span>
      </div>
      <StreamPageList
        key={gameId}
        density={density}
        errorMessage={browser.i18n.getMessage('gameStreamsError')}
        emptyMessage={browser.i18n.getMessage('gameStreamsEmpty')}
        announce={(count) =>
          browser.i18n.getMessage('gameStreamsLoadedAnnouncement', [String(count)])
        }
        fetchPage={(cursor) =>
          sendMessage<StreamsResponse>({
            type: 'streams/getByGame',
            gameId,
            cursor,
          } satisfies StreamsMessage)
        }
        onDisconnected={onDisconnected}
      />
    </>
  );
}

export default GameStreams;
