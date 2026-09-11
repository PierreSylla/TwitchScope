import { browser } from 'wxt/browser';
import { formatDuration, formatViewerCount } from '@/lib/streams/format';
import type { FollowedStreamView } from '@/lib/streams/types';
import type { Density } from '@/lib/settings/types';

interface StreamCardProps {
  stream: FollowedStreamView;
  density: Density;
}

function StreamCard({ stream, density }: StreamCardProps) {
  const compact = density === 'compact';
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
        <span
          className={`absolute rounded-full bg-red-500 font-bold tracking-wide text-[#18181B] ${
            compact
              ? 'left-1.5 top-1.5 px-1.5 py-0.5 text-[9px]'
              : 'left-2 top-2 px-[7px] py-[3px] text-[10px]'
          }`}
        >
          {browser.i18n.getMessage('liveBadge')}
        </span>
        <span
          className={`absolute rounded-full bg-black/60 font-semibold text-white ${
            compact
              ? 'right-1.5 top-1.5 px-[5px] py-0.5 text-[9px]'
              : 'right-2 top-2 px-[6px] py-[3px] text-[10px]'
          }`}
        >
          {formatDuration(stream.startedAt)}
        </span>
        <div
          className={`absolute inset-x-0 bottom-0 flex items-center gap-1 bg-gradient-to-t from-black/65 to-transparent ${
            compact ? 'px-1.5 py-1' : 'px-2 py-1.5'
          }`}
        >
          <span
            className={`rounded-full bg-white ${compact ? 'h-[5px] w-[5px]' : 'h-1.5 w-1.5'}`}
          />
          <span className={`font-semibold text-white ${compact ? 'text-[10px]' : 'text-[11px]'}`}>
            {browser.i18n.getMessage('streamViewers', [
              formatViewerCount(stream.viewerCount, locale),
            ])}
          </span>
        </div>
      </div>
      <div className={`flex flex-col ${compact ? 'gap-[3px] p-2' : 'gap-1 p-3'}`}>
        <div className={`flex min-w-0 items-center ${compact ? 'gap-1.5' : 'gap-2'}`}>
          {stream.avatarUrl ? (
            <img
              src={stream.avatarUrl}
              alt=""
              className={`flex-none rounded-full ${compact ? 'h-[22px] w-[22px]' : 'h-7 w-7'}`}
            />
          ) : (
            <span
              className={`flex flex-none items-center justify-center rounded-full bg-hairline font-mono font-bold text-ink-muted ${
                compact ? 'h-[22px] w-[22px] text-[9px]' : 'h-7 w-7 text-[10px]'
              }`}
            >
              {initials}
            </span>
          )}
          <div className="flex min-w-0 flex-1 flex-col">
            <span
              className={`truncate font-semibold text-ink ${compact ? 'text-xs' : 'text-[13px]'}`}
            >
              {stream.channel}
            </span>
            <span className={`truncate text-ink-muted ${compact ? 'text-[11px]' : 'text-xs'}`}>
              {stream.game}
            </span>
          </div>
        </div>
        <p
          className={`text-ink ${compact ? 'line-clamp-1 text-xs leading-[1.3]' : 'line-clamp-2 text-[13px] leading-snug'}`}
        >
          {stream.title}
        </p>
      </div>
    </a>
  );
}

export default StreamCard;
