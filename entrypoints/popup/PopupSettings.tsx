import { browser } from 'wxt/browser';
import type { Density } from '@/lib/settings/types';

const DENSITY_OPTIONS = ['compact', 'comfortable'] as const;

interface PopupSettingsProps {
  density: Density;
  onDensityChange: (next: Density) => void;
  onBack: () => void;
}

function PopupSettings({ density, onDensityChange, onBack }: PopupSettingsProps) {
  return (
    <div>
      <div className="flex h-11 items-center gap-2 border-b border-hairline px-3">
        <button
          type="button"
          onClick={onBack}
          aria-label={browser.i18n.getMessage('settingsBackButton')}
          className="flex h-6 w-6 items-center justify-center rounded-lg text-ink-muted hover:bg-tile"
        >
          ←
        </button>
        <span className="text-[13px] font-semibold text-ink">
          {browser.i18n.getMessage('settingsPageTitle')}
        </span>
      </div>
      <div className="flex min-h-[200px] flex-col gap-3 p-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
          {browser.i18n.getMessage('settingsDensityLabel')}
        </h2>
        <div className="inline-flex w-fit gap-0.5 rounded-lg border border-hairline bg-tile p-0.5">
          {DENSITY_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={density === option}
              onClick={() => onDensityChange(option)}
              className={`rounded-md px-3.5 py-1.5 text-xs font-semibold ${
                density === option ? 'bg-brand text-white dark:text-[#18181B]' : 'text-ink-muted'
              }`}
            >
              {browser.i18n.getMessage(
                option === 'compact' ? 'settingsDensityCompact' : 'settingsDensityComfortable',
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default PopupSettings;
