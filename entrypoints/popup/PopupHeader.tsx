import { browser } from 'wxt/browser';
import type { Density } from '@/lib/settings/types';

const TAB_KEYS = ['tabFollowed', 'tabPopular', 'tabBrowse', 'tabSearch'] as const;

interface PopupHeaderProps {
  /** Icons + tabs only make sense once the user is connected. */
  showChrome: boolean;
  density: Density;
  onRefresh?: () => void;
  onSettings: () => void;
}

function PopupHeader({ showChrome, density, onRefresh, onSettings }: PopupHeaderProps) {
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
        <div className="flex border-b border-hairline">
          {TAB_KEYS.map((key, index) => (
            <span
              key={key}
              className={`flex-1 border-b-2 text-center font-semibold ${compact ? 'py-1.5 text-[11px]' : 'py-[9px] text-xs'} ${
                index === 0 ? 'border-brand text-brand' : 'border-transparent text-ink-muted'
              }`}
            >
              {browser.i18n.getMessage(key)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default PopupHeader;
