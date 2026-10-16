import { browser } from 'wxt/browser';
import type { Density, NotificationSettings, Theme } from '@/lib/settings/types';
import { DENSITY_OPTIONS, THEME_OPTIONS } from '@/lib/settings/labels';
import { SegmentedControl, SettingsRow, ToggleSwitch } from '@/components/SettingsControls';

interface PopupSettingsProps {
  density: Density;
  theme: Theme;
  notifications: NotificationSettings;
  onDensityChange: (next: Density) => void;
  onThemeChange: (next: Theme) => void;
  onNotificationsChange: (next: NotificationSettings) => void;
  onBack: () => void;
}

function PopupSettings({
  density,
  theme,
  notifications,
  onDensityChange,
  onThemeChange,
  onNotificationsChange,
  onBack,
}: PopupSettingsProps) {
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
      <div className="flex min-h-[200px] flex-col gap-5 p-3">
        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
            {browser.i18n.getMessage('settingsNotificationsLabel')}
          </h2>
          <SettingsRow label={browser.i18n.getMessage('settingsNotificationsEnable')}>
            <ToggleSwitch
              checked={notifications.enabled}
              label={browser.i18n.getMessage('settingsNotificationsEnable')}
              onChange={(enabled) => onNotificationsChange({ ...notifications, enabled })}
            />
          </SettingsRow>
        </section>
        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
            {browser.i18n.getMessage('settingsThemeLabel')}
          </h2>
          <SegmentedControl options={THEME_OPTIONS} value={theme} onChange={onThemeChange} />
        </section>
        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
            {browser.i18n.getMessage('settingsDensityLabel')}
          </h2>
          <SegmentedControl options={DENSITY_OPTIONS} value={density} onChange={onDensityChange} />
        </section>
      </div>
    </div>
  );
}

export default PopupSettings;
