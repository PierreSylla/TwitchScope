import { DEFAULT_POLLING_INTERVAL_MINUTES } from '../config';

export type Density = 'compact' | 'comfortable';

export const DEFAULT_DENSITY: Density = 'compact';

export interface NotificationSettings {
  enabled: boolean;
  intervalMinutes: number;
}

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  enabled: true,
  intervalMinutes: DEFAULT_POLLING_INTERVAL_MINUTES,
};


export const POLLING_INTERVAL_OPTIONS = [2, 5, 10, 15, 30] as const;
