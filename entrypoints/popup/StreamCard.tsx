import { browser } from 'wxt/browser';
import { formatDuration, formatViewerCount } from '@/lib/streams/format';
import type { FollowedStreamView } from '@/lib/streams/types';

interface StreamCardProps {
  stream: FollowedStreamView;
}

function StreamCard({ stream }: StreamCardProps) {
  const initials = stream.channel.slice(0, 2).toUpperCase();
  const locale = browser.i18n.getUILanguage();

  return (
    <a
      href={`https://twitch.tv/${stream.login}`}
      target="_blank"
      rel="noreferrer"
      className="block overflow-hidden rounded-xl border border-hairline bg-tile focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
    >
      <div className="relative aspect-video bg-hairline">
        <img src={stream.thumbnailUrl} alt="" className="h-full w-full object-cover" />
        <span className="absolute left-2 top-2 rounded-full bg-red-500 px-[7px] py-[3px] text-[10px] font-bold tracking-wide text-[#18181B]">
          {browser.i18n.getMessage('liveBadge')}
        </span>
        <span className="absolute right-2 top-2 rounded-full bg-black/60 px-[6px] py-[3px] text-[10px] font-semibold text-white">
          {formatDuration(stream.startedAt)}
        </span>
        <div className="absolute inset-x-0 bottom-0 flex items-center gap-1 bg-gradient-to-t from-black/65 to-transparent px-2 py-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-white" />
          <span className="text-[11px] font-semibold text-white">
            {browser.i18n.getMessage('streamViewers', [
              formatViewerCount(stream.viewerCount, locale),
            ])}
          </span>
        </div>
      </div>
      <div className="flex flex-col gap-1 p-3">
        <div className="flex min-w-0 items-center gap-2">
          {stream.avatarUrl ? (
            <img src={stream.avatarUrl} alt="" className="h-7 w-7 flex-none rounded-full" />
          ) : (
            <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-hairline font-mono text-[10px] font-bold text-ink-muted">
              {initials}
            </span>
          )}
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-[13px] font-semibold text-ink">{stream.channel}</span>
            <span className="truncate text-xs text-ink-muted">{stream.game}</span>
          </div>
        </div>
        <p className="line-clamp-2 text-[13px] leading-snug text-ink">{stream.title}</p>
      </div>
    </a>
  );
}

export default StreamCard;
