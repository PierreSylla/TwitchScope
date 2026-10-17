import { useState } from 'react';
import { t } from '@/lib/i18n/messages';
import {
  AccountSection,
  ChannelNotificationsSection,
  DensitySection,
  LanguageSection,
  NotificationsSection,
  ThemeSection,
} from '@/components/SettingsSections';

function App() {
  const [, forceRender] = useState(0);
  return (
    <div className="mx-auto max-w-[640px] overflow-hidden rounded-xl border border-hairline bg-panel shadow-[0_1px_3px_rgba(0,0,0,.08)] dark:shadow-[0_1px_3px_rgba(0,0,0,.3)]">
      <div className="border-b border-hairline px-8 py-6">
        <h1 className="text-lg font-bold text-ink">{t('settingsPageTitle')}</h1>
      </div>
      <div className="flex flex-col gap-8 p-8">
        <AccountSection />
        <NotificationsSection />
        <ChannelNotificationsSection />
        <ThemeSection />
        <DensitySection />
        <LanguageSection onChange={() => forceRender((n) => n + 1)} />
      </div>
    </div>
  );
}

export default App;
