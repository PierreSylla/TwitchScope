import type { ReactNode } from 'react';
import type { Density } from '@/lib/settings/types';
import { t } from '@/lib/i18n/messages';

const LIST_PADDING: Record<Density, string> = {
  compact: 'gap-1 p-2',
  comfortable: 'gap-3 p-3',
};

export function StreamList({
  density,
  header,
  children,
}: {
  density: Density;
  header?: ReactNode;
  children: ReactNode;
}) {
  if (!header) {
    return (
      <div className={`flex h-[480px] flex-col overflow-y-auto ${LIST_PADDING[density]}`}>
        {children}
      </div>
    );
  }
  // The frame owns the cap so the pinned header eats into the list rather than
  // adding to the popup's height; min-h-0 is what lets the list actually shrink.
  return (
    <div className="flex h-[480px] flex-col">
      {header}
      <div className={`flex min-h-0 flex-1 flex-col overflow-y-auto ${LIST_PADDING[density]}`}>
        {children}
      </div>
    </div>
  );
}

export function StreamSkeleton({ density }: { density: Density }) {
  return (
    <div className={`flex min-h-[480px] flex-col ${LIST_PADDING[density]}`}>
      {[0, 1, 2].map((i) => (
        <div key={i} className="overflow-hidden rounded-xl border border-hairline bg-tile">
          <div className="aspect-video bg-hairline" />
          <div className="flex flex-col gap-2 p-3">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-full bg-hairline" />
              <div className="flex flex-1 flex-col gap-1">
                <div className="h-2 w-3/5 rounded bg-hairline" />
                <div className="h-1.5 w-2/5 rounded bg-hairline" />
              </div>
            </div>
            <div className="h-1.5 w-4/5 rounded bg-hairline" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function StreamError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex min-h-[480px] flex-col items-center justify-center gap-3.5 p-8 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-red-500 text-lg font-bold text-red-500">
        !
      </div>
      <p className="max-w-[260px] text-[13px] leading-relaxed text-ink-muted">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="rounded-lg border border-hairline px-[18px] py-[9px] text-[13px] font-semibold text-ink"
      >
        {t('authRetryButton')}
      </button>
    </div>
  );
}

export function StreamEmpty({ message, children }: { message: string; children?: ReactNode }) {
  return (
    <div className="flex min-h-[480px] flex-col items-center justify-center gap-3 p-8 text-center">
      <span className="block h-11 w-11 rounded-full border-2 border-hairline" />
      <p className="max-w-[260px] text-[13px] leading-relaxed text-ink-muted">{message}</p>
      {children}
    </div>
  );
}
