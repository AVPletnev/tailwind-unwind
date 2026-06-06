import { cn } from '@/lib/utils';

export function SettingsPanel({ children }: { children: React.ReactNode }) {
  return (
    <section className={cn('rounded-lg border border-border p-4 shadow-sm')}>
      {children}
    </section>
  );
}

export function ProfilePanel({ children }: { children: React.ReactNode }) {
  return (
    <section className={cn('rounded-lg border border-border p-4 shadow-sm')}>
      {children}
    </section>
  );
}

export function BillingPanel({ children }: { children: React.ReactNode }) {
  return (
    <section className={cn('rounded-lg border border-border p-4 shadow-sm')}>
      {children}
    </section>
  );
}

export function NotificationPanel({ children }: { children: React.ReactNode }) {
  return (
    <section
      className={cn(
        'rounded-lg border border-border p-4 shadow-sm',
        'space-y-4',
      )}
    >
      {children}
    </section>
  );
}
