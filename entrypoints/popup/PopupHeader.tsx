import { browser } from 'wxt/browser';
import type { Density } from '@/lib/settings/types';

export type Tab = 'followed' | 'popular' | 'browse' | 'search';

const TABS = [
  { id: 'followed', key: 'tabFollowed' },
  { id: 'popular', key: 'tabPopular' },
  { id: 'browse', key: 'tabBrowse' },
  { id: 'search', key: 'tabSearch' },
] as const satisfies readonly { id: Tab; key: string }[];

interface PopupHeaderProps {
  /** Icons + tabs only make sense once the user is connected. */
  showChrome: boolean;
  density: Density;
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  onRefresh?: () => void;
  onSettings: () => void;
}

function PopupHeader({
  showChrome,
  density,
  activeTab,
  onTabChange,
  onRefresh,
  onSettings,
}: PopupHeaderProps) {
  const compact = density === 'compact';

  return (
    <div>
      <div
        className={`flex items-center justify-between border-b border-hairline ${compact ? 'h-10 px-2.5' : 'h-11 px-3'}`}
      >
        <div className={`flex items-center ${compact ? 'gap-1.5' : 'gap-2'}`}>
          <span
            className={`relative block rounded-full border-2 border-brand ${compact ? 'h-[18px] w-[18px]' : 'h-5 w-5'}`}
          >
            <span
              className={`absolute -bottom-0.5 -right-0.5 block rounded-full bg-brand ${compact ? 'h-1.5 w-1.5' : 'h-[7px] w-[7px]'}`}
            />
          </span>
          <span className={`font-semibold text-ink ${compact ? 'text-xs' : 'text-[13px]'}`}>
            TwitchScope
          </span>
        </div>
        {showChrome && (
          <div className={`flex ${compact ? 'gap-0.5' : 'gap-1'}`}>
            <button
              type="button"
              onClick={onRefresh}
              aria-label={browser.i18n.getMessage('refreshButton')}
              className={`flex items-center justify-center rounded-lg text-ink-muted hover:bg-tile ${compact ? 'h-5 w-5 text-xs' : 'h-6 w-6 text-sm'}`}
            >
              ⟳
            </button>
            <button
              type="button"
              onClick={onSettings}
              aria-label={browser.i18n.getMessage('settingsButton')}
              className={`flex items-center justify-center rounded-lg text-ink-muted hover:bg-tile ${compact ? 'h-5 w-5 text-xs' : 'h-6 w-6 text-sm'}`}
            >
              ⚙
            </button>
          </div>
        )}
      </div>
      {showChrome && (
        <nav className="flex border-b border-hairline">
          {TABS.map(({ id, key }) => (
            <button
              key={key}
              type="button"
              aria-current={id === activeTab ? 'page' : undefined}
              onClick={() => onTabChange(id)}
              className={`flex-1 border-b-2 text-center font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand ${
                compact ? 'py-1.5 text-[11px]' : 'py-[9px] text-xs'
              } ${
                id === activeTab ? 'border-brand text-brand' : 'border-transparent text-ink-muted'
              }`}
            >
              {browser.i18n.getMessage(key)}
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}

export default PopupHeader;
