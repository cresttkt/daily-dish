'use client';

type Props = {
  label: string;
  onClick: () => void;
};

export default function SecondButton({ label, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className="text-main-green border-main-green rounded border bg-white px-3 py-1 text-[10px] font-bold shadow-[0_2px_0_var(--color-main-green)] transition-all active:translate-y-[2px] active:shadow-none"
    >
      {label}
    </button>
  );
}
