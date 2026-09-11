import { browser } from 'wxt/browser';

export function sendMessage<TResponse>(message: unknown): Promise<TResponse> {
  return browser.runtime.sendMessage(message);
}
