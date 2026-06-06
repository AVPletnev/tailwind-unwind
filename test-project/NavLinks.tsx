type NavLinkProps = {
  children: string;
};

/** NavLink-style: shared branch prefix + per-state text color. */
export function HomeNavLink({ children }: NavLinkProps) {
  return (
    <a
      className={({ isActive }) =>
        isActive
          ? 'no-underline text-lg whitespace-no-wrap flex px-[10px] py-[2px] text-accent'
          : 'no-underline text-lg whitespace-no-wrap flex px-[10px] py-[2px] text-light-text'
      }
    >
      {children}
    </a>
  );
}

export function AboutNavLink({ children }: NavLinkProps) {
  return (
    <a
      className={({ isActive }) =>
        isActive
          ? 'no-underline text-lg whitespace-no-wrap flex px-[10px] py-[2px] text-accent'
          : 'no-underline text-lg whitespace-no-wrap flex px-[10px] py-[2px] text-light-text'
      }
    >
      {children}
    </a>
  );
}

export function PricingNavLink({ children }: NavLinkProps) {
  return (
    <a
      className={({ isActive }) =>
        isActive
          ? 'no-underline text-lg whitespace-no-wrap flex px-[10px] py-[2px] text-accent'
          : 'no-underline text-lg whitespace-no-wrap flex px-[10px] py-[2px] text-light-text'
      }
    >
      {children}
    </a>
  );
}

export function ContactNavLink({ children }: NavLinkProps) {
  return (
    <a
      className={({ isActive }) =>
        isActive
          ? 'no-underline text-lg whitespace-no-wrap flex px-[10px] py-[2px] text-accent'
          : 'no-underline text-lg whitespace-no-wrap flex px-[10px] py-[2px] text-light-text'
      }
    >
      {children}
    </a>
  );
}
