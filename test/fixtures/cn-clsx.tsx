import { cn } from '@/lib/utils';
import clsx from 'clsx';
import classnames from 'classnames';

export function Merged({ active }: { active: boolean }) {
  return (
    <>
      <div className={cn('flex', 'items-center', active && 'p-4')}>A</div>
      <div className={clsx('flex', 'gap-2', active ? 'p-4' : 'p-2')}>B</div>
      <div className={classnames('w-full', 'h-auto')}>C</div>
    </>
  );
}
