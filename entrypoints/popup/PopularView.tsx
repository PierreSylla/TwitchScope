import { browser } from 'wxt/browser';
import { sendMessage } from '@/lib/messaging';
import type { StreamsMessage, StreamsResponse } from '@/lib/streams/types';
import type { Density } from '@/lib/settings/types';
import StreamPageList from './StreamPageList';

interface PopularViewProps {
  density: Density;
  onDisconnected: () => void;
}

function PopularView({ density, onDisconnected }: PopularViewProps) {
  return (
    <StreamPageList
      density={density}
      errorMessage={browser.i18n.getMessage('popularError')}
      emptyMessage={browser.i18n.getMessage('popularEmpty')}
      announce={(count) => browser.i18n.getMessage('popularLoadedAnnouncement', [String(count)])}
      fetchPage={(cursor) =>
        sendMessage<StreamsResponse>({ type: 'streams/getTop', cursor } satisfies StreamsMessage)
      }
      onDisconnected={onDisconnected}
    />
  );
}

export default PopularView;
