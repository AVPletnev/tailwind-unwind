type ButtonProps = {
  children: React.ReactNode;
};

export function PrimaryButton({ children }: ButtonProps) {
  return (
    <button className="inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors">
      {children}
    </button>
  );
}

export function SubmitButton({ children }: ButtonProps) {
  return (
    <button
      type="submit"
      className="inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors"
    >
      {children}
    </button>
  );
}

export function SaveButton({ children }: ButtonProps) {
  return (
    <button className="inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors">
      Save {children}
    </button>
  );
}

export function ConfirmButton({ children }: ButtonProps) {
  return (
    <button className="inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors">
      {children}
    </button>
  );
}
