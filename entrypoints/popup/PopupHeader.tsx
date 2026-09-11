import { browser } from 'wxt/browser';

const TAB_KEYS = ['tabFollowed', 'tabPopular', 'tabBrowse', 'tabSearch'] as const;

interface PopupHeaderProps {
  /** Icons + tabs only make sense once the user is connected. */
  showChrome: boolean;
  onRefresh?: () => void;
}

function PopupHeader({ showChrome, onRefresh }: PopupHeaderProps) {
  return (
    <div>
      <div className="flex h-11 items-center justify-between border-b border-hairline px-3">
        <div className="flex items-center gap-2">
          <span className="relative block h-5 w-5 rounded-full border-2 border-brand">
            <span className="absolute -bottom-0.5 -right-0.5 block h-1.5 w-1.5 rounded-full bg-brand" />
          </span>
          <span className="text-[13px] font-semibold text-ink">TwitchScope</span>
        </div>
        {showChrome && (
          <div className="flex gap-1">
            <button
              type="button"
              onClick={onRefresh}
              aria-label={browser.i18n.getMessage('refreshButton')}
              className="flex h-6 w-6 items-center justify-center rounded-lg text-ink-muted hover:bg-tile"
            >
              ⟳
            </button>
            <button
              type="button"
              onClick={() => browser.runtime.openOptionsPage()}
              aria-label={browser.i18n.getMessage('settingsButton')}
              className="flex h-6 w-6 items-center justify-center rounded-lg text-ink-muted hover:bg-tile"
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
              className={
                index === 0
                  ? 'flex-1 border-b-2 border-brand py-[9px] text-center text-xs font-semibold text-brand'
                  : 'flex-1 border-b-2 border-transparent py-[9px] text-center text-xs font-semibold text-ink-muted'
              }
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
