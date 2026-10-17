import { useState } from 'react';
import { browser } from 'wxt/browser';
import { formatDuration, formatViewerCount } from '@/lib/streams/format';
import type { StreamView } from '@/lib/streams/types';
import type { Density } from '@/lib/settings/types';
import CardContextMenu from './CardContextMenu';

interface StreamCardProps {
  stream: StreamView;
  density: Density;
}

function StreamCard({ stream, density }: StreamCardProps) {
  const initials = stream.channel.slice(0, 2).toUpperCase();
  const locale = browser.i18n.getUILanguage();
  const [menuAt, setMenuAt] = useState<{ x: number; y: number } | null>(null);

  function openMenu(event: React.MouseEvent) {
    event.preventDefault();
    setMenuAt({ x: event.clientX, y: event.clientY });
  }

  function openMenuByKey(event: React.KeyboardEvent<HTMLAnchorElement>) {
    if (event.key !== 'ContextMenu' && !(event.shiftKey && event.key === 'F10')) return;
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    setMenuAt({ x: Math.round(rect.left + 8), y: Math.round(rect.top + 8) });
  }

  const menu = menuAt && (
    <CardContextMenu
      login={stream.login}
      x={menuAt.x}
      y={menuAt.y}
      onClose={() => setMenuAt(null)}
    />
  );

  if (density === 'compact') {
    return (
      <>
        <a
          href={`https://twitch.tv/${stream.login}`}
          target="_blank"
          rel="noreferrer"
          onContextMenu={openMenu}
          onKeyDown={openMenuByKey}
          className="flex flex-none items-center gap-2 rounded-lg p-1 hover:bg-tile focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          <div className="relative h-[41px] w-[72px] flex-none overflow-hidden rounded-md bg-hairline">
            <img src={stream.thumbnailUrl} alt="" className="h-full w-full object-cover" />
            <span className="absolute bottom-0.5 left-0.5 rounded bg-black/65 px-1 py-px text-[8px] font-semibold text-white">
              {formatDuration(stream.startedAt)}
            </span>
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-px">
            <span className="truncate text-[13px] font-semibold text-ink">{stream.channel}</span>
            <span className="truncate text-[11px] text-ink-muted">
              {stream.game} ·{' '}
              {browser.i18n.getMessage('streamViewers', [
                formatViewerCount(stream.viewerCount, locale),
              ])}
            </span>
            <span className="flex items-center gap-1 truncate text-[11px] text-ink-muted">
              <span className="h-[5px] w-[5px] flex-none rounded-full bg-red-500" />
              <span className="truncate">{stream.title}</span>
            </span>
          </div>
        </a>
        {menu}
      </>
    );
  }

  return (
    <>
      <a
        href={`https://twitch.tv/${stream.login}`}
        target="_blank"
        rel="noreferrer"
        onContextMenu={openMenu}
        onKeyDown={openMenuByKey}
        className="block flex-none overflow-hidden rounded-xl border border-hairline bg-tile focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
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
      {menu}
    </>
  );
}

export default StreamCard;
