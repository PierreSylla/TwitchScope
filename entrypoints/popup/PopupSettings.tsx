import { t } from '@/lib/i18n/messages';
import {
  AccountSection,
  ChannelNotificationsSection,
  DensitySection,
  LanguageSection,
  NotificationsSection,
  ThemeSection,
} from '@/components/SettingsSections';

interface PopupSettingsProps {
  onBack: () => void;
}

function PopupSettings({ onBack }: PopupSettingsProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex h-11 flex-none items-center gap-2 border-b border-hairline px-3">
        <button
          type="button"
          onClick={onBack}
          aria-label={t('settingsBackButton')}
          className="flex h-6 w-6 items-center justify-center rounded-lg text-ink-muted hover:bg-tile"
        >
          ←
        </button>
        <span className="text-[13px] font-semibold text-ink">{t('settingsPageTitle')}</span>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-3">
        <AccountSection />
        <NotificationsSection />
        <ChannelNotificationsSection />
        <ThemeSection />
        <DensitySection />
        <LanguageSection />
      </div>
    </div>
  );
}

export default PopupSettings;
