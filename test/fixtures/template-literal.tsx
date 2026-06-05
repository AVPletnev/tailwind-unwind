export function Tab({ active }: { active: boolean }) {
  return (
    <button className={`flex p-4 ${active ? 'bg-blue-500' : 'bg-gray-200'}`}>
      Tab
    </button>
  );
}
