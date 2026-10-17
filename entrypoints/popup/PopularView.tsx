import { sendMessage } from '@/lib/messaging';
import type { StreamsMessage, StreamsResponse } from '@/lib/streams/types';
import type { Density } from '@/lib/settings/types';
import StreamPageList from './StreamPageList';
import { t, tCount } from '@/lib/i18n/messages';

interface PopularViewProps {
  density: Density;
  onDisconnected: () => void;
}

function PopularView({ density, onDisconnected }: PopularViewProps) {
  return (
    <StreamPageList
      density={density}
      errorMessage={t('popularError')}
      emptyMessage={t('popularEmpty')}
      announce={(count) => tCount('popularLoadedAnnouncement', count)}
      fetchPage={(cursor) =>
        sendMessage<StreamsResponse>({ type: 'streams/getTop', cursor } satisfies StreamsMessage)
      }
      onDisconnected={onDisconnected}
    />
  );
}

export default PopularView;
