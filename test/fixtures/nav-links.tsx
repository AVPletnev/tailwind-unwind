export function NavOne() {
  return (
    <a
      className={({ isActive }) =>
        isActive
          ? 'no-underline text-lg whitespace-no-wrap flex px-[10px] py-[2px] text-accent'
          : 'no-underline text-lg whitespace-no-wrap flex px-[10px] py-[2px] text-light-text'
      }
    >
      One
    </a>
  );
}

export function NavTwo() {
  return (
    <a
      className={({ isActive }) =>
        isActive
          ? 'no-underline text-lg whitespace-no-wrap flex px-[10px] py-[2px] text-accent'
          : 'no-underline text-lg whitespace-no-wrap flex px-[10px] py-[2px] text-light-text'
      }
    >
      Two
    </a>
  );
}

export function NavThree() {
  return (
    <a
      className={({ isActive }) =>
        isActive
          ? 'no-underline text-lg whitespace-no-wrap flex px-[10px] py-[2px] text-accent'
          : 'no-underline text-lg whitespace-no-wrap flex px-[10px] py-[2px] text-light-text'
      }
    >
      Three
    </a>
  );
}
