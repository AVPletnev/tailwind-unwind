export function NavLinkLike({ isActive }: { isActive: boolean }) {
  return (
    <a
      className={({ isActive: active }) =>
        active
          ? 'no-underline text-lg whitespace-no-wrap flex px-[10px] py-[2px] text-accent'
          : 'no-underline text-lg whitespace-no-wrap flex px-[10px] py-[2px] text-light-text'
      }
    >
      Link
    </a>
  );
}

export function BlockBodyLink({ isActive }: { isActive: boolean }) {
  return (
    <a
      className={({ isActive: active }) => {
        return active ? 'flex p-4 bg-blue' : 'flex p-4 bg-blue';
      }}
    >
      Block
    </a>
  );
}
