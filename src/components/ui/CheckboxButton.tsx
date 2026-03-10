'use client';

type Props = {
  label: string;
  isSelected: boolean;
  onClick: () => void;
};

export default function CheckboxButton({ label, isSelected, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className={`flex h-[26px] items-center gap-1.5 rounded-full border px-2.5 text-[12px] transition-colors ${
        isSelected
          ? 'bg-main-green border-main-green font-bold text-white'
          : 'text-main-font border-main-green bg-white'
      }`}
    >
      <div className="flex h-[12px] w-[12px] shrink-0 items-center justify-center rounded-[2px] border border-gray-400 bg-white shadow-[inset_0_0_2px_#000]">
        {isSelected && (
          <span className="text-main-green text-[10px] leading-none font-bold">
            ✓
          </span>
        )}
      </div>
      <span className="leading-none">{label}</span>
    </button>
  );
}
