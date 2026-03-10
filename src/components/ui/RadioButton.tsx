'use client';

type Props = {
  label: string;
  isSelected: boolean;
  onClick: () => void;
};

export default function RadioButton({ label, isSelected, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      // 高さ24pxに変更、非選択時の枠線も border-main-green に統一
      className={`flex h-[24px] w-[54px] items-center justify-center rounded-full border text-[12px] font-bold transition-colors ${
        isSelected
          ? 'bg-main-green border-main-green text-white'
          : 'text-main-green border-main-green bg-white'
      }`}
    >
      {label}
    </button>
  );
}
