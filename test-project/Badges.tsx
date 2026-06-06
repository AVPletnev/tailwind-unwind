type BadgeProps = {
  children: React.ReactNode;
};

export function StatusBadge({ children }: BadgeProps) {
  return (
    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium">
      {children}
    </span>
  );
}

export function CountBadge({ children }: BadgeProps) {
  return (
    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium">
      {children}
    </span>
  );
}

export function TagBadge({ children }: BadgeProps) {
  return (
    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium">
      {children}
    </span>
  );
}
