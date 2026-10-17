import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { browser } from 'wxt/browser';
import { CHANNEL_ACTIONS, channelUrl, type ChannelAction } from '@/lib/streams/channelLinks';

const LABEL: Record<ChannelAction, Parameters<typeof browser.i18n.getMessage>[0]> = {
  newTab: 'cardMenuNewTab',
  playerOnly: 'cardMenuPlayerOnly',
  multitwitch: 'cardMenuMultitwitch',
  chat: 'cardMenuChat',
  videos: 'cardMenuVideos',
};

const MARGIN = 8;

interface CardContextMenuProps {
  login: string;
  x: number;
  y: number;
  onClose: () => void;
}

function CardContextMenu({ login, x, y, onClose }: CardContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ left: x, top: y, ready: false });

  // Clamp into the popup viewport, flipping up when there is no room below.
  useLayoutEffect(() => {
    const menu = ref.current;
    if (!menu) return;
    const { width, height } = menu.getBoundingClientRect();
    const left = Math.max(MARGIN, Math.min(x, window.innerWidth - width - MARGIN));
    const top = y + height + MARGIN > window.innerHeight ? Math.max(MARGIN, y - height) : y;
    setPosition({ left, top, ready: true });
  }, [x, y]);

  // Focus only once visible: a visibility:hidden element cannot take focus.
  useEffect(() => {
    if (position.ready) ref.current?.querySelector<HTMLAnchorElement>('a')?.focus();
  }, [position.ready]);

  // Hand focus back to whatever opened the menu when it goes away.
  useEffect(() => {
    const opener = document.activeElement;
    return () => {
      if (opener instanceof HTMLElement && document.contains(opener)) opener.focus();
    };
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    function onPointerDown(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onPointerDown);
    window.addEventListener('scroll', onClose, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('scroll', onClose, true);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      data-card-menu
      aria-label={browser.i18n.getMessage('cardMenuLabel')}
      style={{
        left: position.left,
        top: position.top,
        visibility: position.ready ? 'visible' : 'hidden',
      }}
      className="fixed z-10 flex min-w-[180px] flex-col overflow-hidden rounded-lg border border-hairline bg-panel py-1 shadow-[0_4px_12px_rgba(0,0,0,.18)] dark:shadow-[0_4px_12px_rgba(0,0,0,.5)]"
    >
      {CHANNEL_ACTIONS.map((action) => (
        <a
          key={action}
          href={channelUrl(action, login)}
          target="_blank"
          rel="noreferrer"
          onClick={onClose}
          className="px-3 py-1.5 text-left text-[13px] text-ink hover:bg-tile focus-visible:bg-tile focus-visible:outline-none"
        >
          {browser.i18n.getMessage(LABEL[action])}
        </a>
      ))}
    </div>
  );
}

export default CardContextMenu;
