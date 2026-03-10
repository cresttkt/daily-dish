'use client';

type Props = {
  label: string;
  onClick: () => void;
  className?: string;
};

export default function MiniButton({ label, onClick, className = '' }: Props) {
  return (
    <button
      onClick={onClick}
      // 枠線(色#000の25%, 1px)、影(#000の25%, 1px)、太字を適用
      className={`text-main-font active:bg-thin-gray shrink-0 rounded-sm border border-black/25 bg-white px-2 py-1 text-[10px] font-bold shadow-[0_1px_1px_rgba(0,0,0,0.25)] transition-colors ${className}`}
    >
      {label}
    </button>
  );
}
