type SidebarLinkProps = {
  label: string;
};

/** Block-bodied className function with identical branches. */
export function DashboardLink({ label }: SidebarLinkProps) {
  return (
    <a
      className={({ isActive }) => {
        return isActive
          ? 'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium bg-muted'
          : 'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium bg-muted';
      }}
    >
      {label}
    </a>
  );
}

export function ProjectsLink({ label }: SidebarLinkProps) {
  return (
    <a
      className={({ isActive }) => {
        return isActive
          ? 'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium bg-muted'
          : 'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium bg-muted';
      }}
    >
      {label}
    </a>
  );
}

export function TeamLink({ label }: SidebarLinkProps) {
  return (
    <a
      className={({ isActive }) => {
        return isActive
          ? 'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium bg-muted'
          : 'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium bg-muted';
      }}
    >
      {label}
    </a>
  );
}
