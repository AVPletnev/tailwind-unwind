import { cn } from '@/lib/utils';

export function CnButton({ active }: { active: boolean }) {
  return (
    <button className={cn('flex', 'items-center', active && 'p-4')}>
      Click
    </button>
  );
}
