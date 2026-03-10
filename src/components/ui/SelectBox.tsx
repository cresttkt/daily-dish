'use client';

type Option = {
  value: string;
  label: string;
};

type Props = {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
};

export default function SelectBox({
  value,
  onChange,
  options,
  placeholder = '選択してください',
}: Props) {
  return (
    <div className="relative w-full">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        // appearance-noneで標準の矢印を消し、丸み(rounded-full)・文字色・枠線を緑に統一
        className="border-main-green text-main-green w-full appearance-none rounded-full border bg-white px-4 py-1.5 text-[12px] font-bold focus:outline-none"
      >
        <option value="">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {/* カスタムの▼アイコン (幅10px, 高さ8px) を右端に絶対配置 */}
      <div className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2">
        <svg
          width="10"
          height="8"
          viewBox="0 0 10 8"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M5 8L0 0H10L5 8Z" fill="#669966" />
        </svg>
      </div>
    </div>
  );
}
