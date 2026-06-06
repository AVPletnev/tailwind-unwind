type TabProps = {
  label: string;
  isActive: boolean;
};

export function OverviewTab({ label, isActive }: TabProps) {
  return (
    <button
      className={`flex flex-1 items-center justify-center border-b-2 px-4 py-2 text-sm font-medium ${isActive ? 'border-primary text-primary' : 'border-transparent text-muted'}`}
    >
      {label}
    </button>
  );
}

export function AnalyticsTab({ label, isActive }: TabProps) {
  return (
    <button
      className={`flex flex-1 items-center justify-center border-b-2 px-4 py-2 text-sm font-medium ${isActive ? 'border-primary text-primary' : 'border-transparent text-muted'}`}
    >
      {label}
    </button>
  );
}

export function SettingsTab({ label, isActive }: TabProps) {
  return (
    <button
      className={`flex flex-1 items-center justify-center border-b-2 px-4 py-2 text-sm font-medium ${isActive ? 'border-primary text-primary' : 'border-transparent text-muted'}`}
    >
      {label}
    </button>
  );
}
