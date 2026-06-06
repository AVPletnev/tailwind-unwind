import { cva } from 'class-variance-authority';

const buttonVariants = cva('flex items-center px-4 py-2 rounded-lg', {
  variants: {
    intent: {
      primary: 'bg-blue-500 text-white',
      secondary: 'bg-gray-200 text-gray-900',
    },
  },
  defaultVariants: {
    intent: 'primary',
  },
});

export function CvaButton() {
  return <button className={buttonVariants()}>Save</button>;
}

export function CvaButtonDynamic({ intent }: { intent: 'primary' | 'secondary' }) {
  return <button className={buttonVariants({ intent })}>Save</button>;
}
