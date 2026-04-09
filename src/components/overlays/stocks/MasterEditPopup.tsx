'use client';

import { useState, useEffect } from 'react';
import SelectBox from '@/components/ui/SelectBox';

type Props = {
  type: 'ingredients' | 'tools';
  initialData?: { id: number; name: string; quantity: string } | null;
  onClose: () => void;
  onSuccess: () => void;
  isNested?: boolean;
};

const ING_QTY_OPTIONS = [
  { value: '0', label: '無し' },
  { value: '1', label: '少ない' },
  { value: '2', label: '普通' },
  { value: '3', label: '多い' },
];
const TOOL_QTY_OPTIONS = [
  { value: '0', label: '無し' },
  { value: '1', label: '有り' },
];

export default function MasterEditPopup({
  type,
  initialData,
  onClose,
  onSuccess,
  isNested = false,
}: Props) {
  const [isClosing, setIsClosing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('0');

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setQuantity(initialData.quantity);
    }
  }, [initialData]);

  const title = `${type === 'ingredients' ? '材料' : '道具'}を${initialData ? '編集' : '新規追加'}`;
  const options = type === 'ingredients' ? ING_QTY_OPTIONS : TOOL_QTY_OPTIONS;

  const handleCloseClick = () => setIsClosing(true);
  const handleAnimationEnd = () => {
    if (isClosing) onClose();
  };

  const handleSave = async () => {
    if (!name.trim()) {
      alert('名前を入力してください');
      return;
    }

    setIsSaving(true);
    try {
      const url = initialData
        ? `/api/stocks/${type}/${initialData.id}`
        : `/api/stocks/${type}`;
      const method = initialData ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), quantity }),
      });

      if (res.ok) {
        setIsClosing(true);
        onSuccess();
      } else {
        const errorData = await res.json();
        alert(errorData.error || '保存に失敗しました');
        setIsSaving(false);
      }
    } catch (err) {
      alert('通信エラーが発生しました');
      setIsSaving(false);
    }
  };

  const bottomClass = isNested
    ? 'bottom-0'
    : 'bottom-[calc(4rem+env(safe-area-inset-bottom))]';

  return (
    <div
      className={`fixed top-0 right-0 left-0 z-[90] flex flex-col bg-white shadow-lg ${bottomClass} ${isClosing ? 'animate-slide-out-right' : 'animate-slide-in-right'}`}
      onAnimationEnd={handleAnimationEnd}
    >
      <div className="border-normal-gray relative z-10 flex h-14 shrink-0 items-center border-b bg-white px-4">
        <button
          onClick={handleCloseClick}
          className="z-10 -ml-2 p-2 active:opacity-50"
        >
          <svg
            width="12"
            height="19"
            viewBox="0 0 12 19"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M11.5 16.8636L3.64286 10.3182L11.5 2.13636L9.92857 0.5L0.5 10.3182L9.92857 18.5L11.5 16.8636Z"
              fill="#669966"
            />
          </svg>
        </button>
        <h2 className="text-main-font pointer-events-none absolute inset-0 flex items-center justify-center text-[18px] font-bold">
          {title}
        </h2>
      </div>

      <div className="bg-thin-gray flex-1 overflow-y-auto p-4 pb-24">
        <div className="flex flex-col gap-6 rounded-md bg-white p-4 shadow-sm">
          <div>
            <h3 className="border-main-green mb-2 border-l-[4px] pl-2 text-[14px] font-bold">
              {type === 'ingredients' ? '材料名' : '道具名'}
            </h3>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="border-main-green text-main-font focus:ring-main-green w-full rounded-sm border px-3 py-2 text-[14px] outline-none focus:ring-1"
              placeholder="名前を入力"
            />
          </div>

          <div>
            <h3 className="border-main-green mb-2 border-l-[4px] pl-2 text-[14px] font-bold">
              在庫量
            </h3>
            <SelectBox
              value={quantity}
              onChange={setQuantity}
              options={options}
              placeholder="選択してください"
            />
          </div>
        </div>
      </div>

      <div className="border-thin-gray absolute right-0 bottom-0 left-0 z-10 border-t bg-white p-4 shadow-[0_-2px_10px_rgba(0,0,0,0.02)]">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-main-green flex w-full items-center justify-center rounded-md py-3 text-[14px] font-bold text-white shadow-[0_3px_0_var(--color-dark-green)] transition-all active:translate-y-[3px] active:shadow-none disabled:opacity-50"
        >
          {isSaving ? (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
          ) : (
            '保存する'
          )}
        </button>
      </div>
    </div>
  );
}
