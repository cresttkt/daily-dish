'use client';

type Props = {
  label: string;
  iconSrc: string;
  onClick: () => void;
};

export default function MainButton({ label, iconSrc, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className="bg-main-green flex flex-col items-center justify-center rounded px-2 py-1 text-white shadow-[0_2px_0_var(--color-dark-green)] transition-all active:translate-y-[2px] active:shadow-none"
    >
      <img
        src={iconSrc}
        alt={`${label} icon`}
        className="h-[12px] w-[12px] object-contain"
      />
      <span className="mt-[2px] text-[10px] font-bold">{label}</span>
    </button>
  );
}
