export function Unknown() {
  return <button className={getClasses()}>Click</button>;
}

function getClasses(): string {
  return 'px-4 py-2';
}
