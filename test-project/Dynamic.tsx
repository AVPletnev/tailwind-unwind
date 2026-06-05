export function ActiveTab({ isActive }: { isActive: boolean }) {
  return (
    <button className={`flex p-4 ${isActive ? 'bg-blue-500' : 'bg-gray-200'}`}>
      Tab
    </button>
  );
}

export function DynamicButton() {
  return <button className={getClasses()}>Click</button>;
}

function getClasses(): string {
  return 'px-4 py-2 rounded';
}
