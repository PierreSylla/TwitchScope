import { browser } from 'wxt/browser';
import { DEFAULT_DENSITY, type Density } from './types';

const STORAGE_KEY = 'density';

export async function getDensity(): Promise<Density> {
  const result = await browser.storage.sync.get(STORAGE_KEY);
  return (result[STORAGE_KEY] as Density | undefined) ?? DEFAULT_DENSITY;
}

export async function setDensity(density: Density): Promise<void> {
  await browser.storage.sync.set({ [STORAGE_KEY]: density });
}
