// Shared by every settings section.

interface SegmentedControlProps<T extends string> {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (next: T) => void;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  return (
    <div className="inline-flex w-fit gap-0.5 rounded-lg border border-hairline bg-tile p-0.5">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={`rounded-md px-3.5 py-1.5 text-xs font-semibold ${
            value === option.value ? 'bg-brand text-white dark:text-[#18181B]' : 'text-ink-muted'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

interface ToggleSwitchProps {
  checked: boolean;
  label: string;
  size?: 'sm' | 'md';
  onChange: (next: boolean) => void;
}

const TRACK = { sm: 'h-[18px] w-8', md: 'h-5 w-9' } as const;
const KNOB = { sm: 'h-3.5 w-3.5', md: 'h-4 w-4' } as const;
const KNOB_ON = { sm: 'left-4', md: 'left-[18px]' } as const;

export function ToggleSwitch({ checked, label, size = 'md', onChange }: ToggleSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative flex-none rounded-full transition-colors motion-reduce:transition-none ${TRACK[size]} ${
        checked ? 'bg-brand' : 'bg-hairline'
      }`}
    >
      <span
        className={`absolute top-0.5 block rounded-full bg-white transition-all motion-reduce:transition-none ${KNOB[size]} ${
          checked ? KNOB_ON[size] : 'left-0.5'
        }`}
      />
    </button>
  );
}

export function SettingsRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-ink">{label}</span>
      {children}
    </div>
  );
}

interface IntervalSelectProps {
  value: number;
  options: readonly number[];
  label: string;
  format: (minutes: number) => string;
  onChange: (next: number) => void;
}

export function IntervalSelect({ value, options, label, format, onChange }: IntervalSelectProps) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(event) => onChange(Number(event.target.value))}
      className="rounded-lg border border-hairline bg-panel px-3 py-2 text-[13px] text-ink"
    >
      {options.map((minutes) => (
        <option key={minutes} value={minutes}>
          {format(minutes)}
        </option>
      ))}
    </select>
  );
}
