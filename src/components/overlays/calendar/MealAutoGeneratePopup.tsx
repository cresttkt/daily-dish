'use client';

import { useState, useMemo } from 'react';
import { addDays, format, parseISO, isValid } from 'date-fns';
import { ja } from 'date-fns/locale';
import RadioButton from '@/components/ui/RadioButton';
import CheckboxButton from '@/components/ui/CheckboxButton';
import SelectBox from '@/components/ui/SelectBox';
import MiniButton from '@/components/ui/MiniButton';

type Props = {
  onClose: () => void;
  onGenerate: (data: any) => void;
};

// モックデータ（自動生成用なのでカテゴリと名前のみ定義）
const MOCK_RECIPES = [
  { id: '1', category: '主菜', name: '鶏の唐揚げ' },
  { id: '2', category: '主食', name: '白ご飯' },
  { id: '3', category: '副菜', name: 'ほうれん草の胡麻和え' },
  { id: '4', category: '汁物', name: '豆腐とわかめの味噌汁' },
  { id: '5', category: '主菜', name: '鮭の塩焼き' },
  { id: '6', category: '主食', name: 'チャーハン' },
];

export default function MealAutoGeneratePopup({ onClose, onGenerate }: Props) {
  const [isClosing, setIsClosing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // --- フォームステート ---
  const [period, setPeriod] = useState<'1day' | '1week'>('1day');
  const [startDate, setStartDate] = useState('');
  const [excludeDates, setExcludeDates] = useState<string[]>([]);

  const [requiredCategory, setRequiredCategory] = useState('主食');
  const [requiredRecipe, setRequiredRecipe] = useState('');
  const [requiredRecipesList, setRequiredRecipesList] = useState<
    { category: string; recipe: string }[]
  >([]);

  // --- エラー制御 ---
  const [dateError, setDateError] = useState('');
  const [recipeError, setRecipeError] = useState('');
  const [generateError, setGenerateError] = useState('');

  // startDateを起点に1週間分の日付リストを生成（除外日チェックボックス用）
  const weekDates = useMemo(() => {
    if (!startDate) return [];
    const start = parseISO(startDate);
    if (!isValid(start)) return [];
    return Array.from({ length: 7 }).map((_, i) => {
      const d = addDays(start, i);
      return {
        value: format(d, 'yyyy-MM-dd'),
        label: format(d, 'M/d(E)', { locale: ja }),
      };
    });
  }, [startDate]);

  // 分類によるレシピの絞り込み
  const filteredRecipes = useMemo(() => {
    return MOCK_RECIPES.filter((r) => r.category === requiredCategory).map(
      (r) => ({ value: r.name, label: r.name }),
    );
  }, [requiredCategory]);

  // 除外日のチェックボックス切り替え処理
  const handleToggleExclude = (dateValue: string) => {
    setExcludeDates((prev) =>
      prev.includes(dateValue)
        ? prev.filter((v) => v !== dateValue)
        : [...prev, dateValue],
    );
  };

  // 必須レシピのリスト追加処理
  const handleAddRequiredRecipe = () => {
    if (!requiredRecipe) {
      setRecipeError('レシピを選択してください');
      return;
    }
    setRequiredRecipesList((prev) => [
      ...prev,
      { category: requiredCategory, recipe: requiredRecipe },
    ]);
    setRequiredRecipe('');
    setRecipeError('');
  };

  // 必須レシピのリスト削除処理
  const handleRemoveRequiredRecipe = (index: number) => {
    setRequiredRecipesList((prev) => prev.filter((_, i) => i !== index));
  };

  // 生成するボタン押下時の処理
  const handleGenerateClick = async () => {
    if (!startDate) {
      setDateError(
        `${period === '1day' ? '対象日' : '開始日'}を選択してください`,
      );
      setGenerateError('日付が未選択です');
      return;
    }
    setDateError('');
    setGenerateError('');
    setIsLoading(true);

    // 擬似的な通信待機時間
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsLoading(false);

    onGenerate({
      period,
      startDate,
      excludeDates,
      requiredRecipes: requiredRecipesList,
    });
  };

  const handleCloseClick = () => setIsClosing(true);
  const handleAnimationEnd = () => {
    if (isClosing) onClose();
  };

  return (
    <div
      className={`fixed top-0 right-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] left-0 z-[70] flex flex-col bg-white shadow-lg ${isClosing ? 'animate-slide-out-right' : 'animate-slide-in-right'}`}
      onAnimationEnd={handleAnimationEnd}
    >
      {/* 生成中ローダー */}
      {isLoading && (
        <div className="absolute inset-0 z-[80] flex flex-col items-center justify-center bg-white/60">
          <div className="border-normal-gray border-t-main-green h-10 w-10 animate-spin rounded-full border-4"></div>
          <p className="text-main-green mt-3 text-[12px] font-bold">
            献立を生成中...
          </p>
        </div>
      )}

      {/* ポップアップ内ヘッダー */}
      <div className="border-normal-gray relative z-10 flex h-14 shrink-0 items-center border-b bg-white px-4">
        <button onClick={handleCloseClick} className="z-10 -ml-2 p-2">
          <svg
            width="12"
            height="19"
            viewBox="0 0 12 19"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M0.5 10.3182L9.92857 0.5L11.5 2.13636L3.64286 10.3182L11.5 16.8636L9.92857 18.5L0.5 10.3182Z"
              fill="#669966"
              stroke="#669966"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <h2 className="text-main-font pointer-events-none absolute inset-0 flex items-center justify-center text-[18px] font-bold">
          献立自動生成
        </h2>
      </div>

      {/* メインコンテンツ */}
      <div className="bg-thin-gray flex-1 overflow-y-auto p-4">
        <div className="flex flex-col gap-6 rounded-md bg-white p-4 shadow-sm">
          {/* --- 生成期間 --- */}
          <div className="flex flex-col">
            <h3 className="border-main-green text-main-font mb-2 border-l-[4px] pl-2 text-[16px] font-bold">
              生成期間
            </h3>
            <hr className="border-main-green mb-3 border-t-[1.5px] border-dotted" />
            <div className="flex gap-3">
              <RadioButton
                label="1日"
                isSelected={period === '1day'}
                onClick={() => {
                  setPeriod('1day');
                  setExcludeDates([]);
                }}
              />
              <RadioButton
                label="1週"
                isSelected={period === '1week'}
                onClick={() => setPeriod('1week')}
              />
            </div>
          </div>

          {/* --- 詳細日付指定 --- */}
          <div className="flex flex-col">
            <h3 className="border-main-green text-main-font mb-2 border-l-[4px] pl-2 text-[16px] font-bold">
              詳細日付指定
            </h3>
            <hr className="border-main-green mb-3 border-t-[1.5px] border-dotted" />

            <div className="mb-2">
              <p className="text-main-font mb-2 text-[12px] font-bold">
                ● {period === '1day' ? '対象日' : '開始日'}
              </p>

              {/* 日付入力欄 (ラッパーで枠線を描画し、input自体は透過させるハック) */}
              <div
                className={`relative w-full max-w-[200px] border ${dateError ? 'border-red-500' : 'border-main-green'} overflow-hidden rounded-full bg-white`}
              >
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    if (e.target.value) {
                      setDateError('');
                      setGenerateError('');
                    }
                  }}
                  className={`custom-date-input relative z-10 w-full bg-transparent py-1.5 pr-10 pl-4 text-[12px] font-bold focus:outline-none ${startDate ? 'text-main-font' : 'text-transparent'}`}
                />

                {/* 日付が未選択の時にのみ表示されるプレースホルダー */}
                {!startDate && (
                  <div className="pointer-events-none absolute top-1/2 left-4 z-0 -translate-y-1/2 text-[12px] font-bold text-gray-400">
                    日付を選択
                  </div>
                )}

                <div className="pointer-events-none absolute top-1/2 right-3 z-0 -translate-y-1/2">
                  <img
                    src="/icons/icon_calendar.png"
                    alt="calendar"
                    className="h-[14px] w-[14px] object-contain opacity-60"
                  />
                </div>
              </div>

              {/* エラーメッセージ用の高さを確保 */}
              <div className="mt-1 h-4 px-2">
                {dateError && (
                  <p className="pt-1 text-[10px] leading-none font-bold text-red-500">
                    {dateError}
                  </p>
                )}
              </div>
            </div>

            {/* 除外日（1週間の時のみ表示） */}
            {period === '1week' && (
              <div className="animate-fade-in mt-2">
                <p className="text-main-font mb-2 text-[12px] font-bold">
                  ● 除外日
                </p>
                {/* 開始日が未選択の場合は親切な案内文を表示 */}
                {!startDate ? (
                  <p className="px-2 text-[10px] font-bold text-gray-400">
                    ※ 開始日を選択すると、1週間分の日付が表示されます
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {weekDates.map((d) => (
                      <CheckboxButton
                        key={d.value}
                        label={d.label}
                        isSelected={excludeDates.includes(d.value)}
                        onClick={() => handleToggleExclude(d.value)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* --- 必須レシピ --- */}
          <div className="flex flex-col">
            <h3 className="border-main-green text-main-font mb-2 border-l-[4px] pl-2 text-[16px] font-bold">
              必須レシピ
            </h3>
            <hr className="border-main-green mb-3 border-t-[1.5px] border-dotted" />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-main-font mb-2 text-[12px] font-bold">
                  ● 分類
                </p>
                <SelectBox
                  value={requiredCategory}
                  onChange={(val) => {
                    setRequiredCategory(val);
                    setRequiredRecipe('');
                    setRecipeError('');
                  }}
                  options={[
                    { value: '主食', label: '主食' },
                    { value: '主菜', label: '主菜' },
                    { value: '副菜', label: '副菜' },
                    { value: '汁物', label: '汁物' },
                    { value: 'その他', label: 'その他' },
                  ]}
                />
              </div>
              <div>
                <p className="text-main-font mb-2 text-[12px] font-bold">
                  ● レシピ
                </p>
                <SelectBox
                  value={requiredRecipe}
                  onChange={(val) => {
                    setRequiredRecipe(val);
                    if (val) setRecipeError('');
                  }}
                  options={filteredRecipes}
                />
              </div>
            </div>

            {/* エラーメッセージ用の高さを確保 */}
            <div className="mt-1 h-4 px-2">
              {recipeError && (
                <p className="pt-1 text-[10px] leading-none font-bold text-red-500">
                  {recipeError}
                </p>
              )}
            </div>

            {/* 追加するボタン */}
            <div className="mt-1 flex justify-center">
              <button
                onClick={handleAddRequiredRecipe}
                className="text-main-green border-main-green flex items-center gap-1 rounded-md border bg-white px-6 py-2 text-[14px] font-bold shadow-[0_2px_0_var(--color-main-green)] transition-all active:translate-y-[2px] active:shadow-none"
              >
                <span className="text-[16px] leading-none">+</span> 追加する
              </button>
            </div>

            {/* 追加済み必須レシピリスト */}
            {requiredRecipesList.length > 0 && (
              <div className="bg-thin-gray mt-6 flex flex-col gap-2 rounded-md p-3">
                <p className="text-main-font border-normal-gray mb-1 border-b-[1.5px] border-dotted pb-2 text-[12px] font-bold">
                  追加済みの必須レシピ
                </p>
                {requiredRecipesList.map((item, idx) => (
                  <div
                    key={idx}
                    className="border-normal-gray flex items-center gap-2 border-b-[1.5px] border-dotted pb-2 last:border-none last:pb-0"
                  >
                    <span className="border-normal-gray text-main-font shrink-0 rounded-sm border bg-white px-1 py-[2px] text-[10px] font-bold">
                      {item.category}
                    </span>
                    <span className="text-main-font min-w-0 flex-1 truncate text-[12px] font-bold">
                      {item.recipe}
                    </span>
                    <MiniButton
                      label="削除"
                      onClick={() => handleRemoveRequiredRecipe(idx)}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* --- フッター（生成するボタン） --- */}
      <div className="border-thin-gray relative z-10 shrink-0 border-t bg-white p-4 shadow-[0_-2px_10px_rgba(0,0,0,0.02)]">
        {generateError && (
          <div className="pointer-events-none absolute -top-10 right-0 left-0 flex justify-center">
            <span className="rounded-full border border-red-200 bg-white/90 px-6 py-1.5 text-[11px] font-bold text-red-500 shadow-[0_2px_4px_rgba(0,0,0,0.05)] backdrop-blur-sm">
              {generateError}
            </span>
          </div>
        )}
        <button
          onClick={handleGenerateClick}
          className="bg-main-green w-full rounded-md py-3 text-[14px] font-bold text-white shadow-[0_3px_0_var(--color-dark-green)] transition-all active:translate-y-[3px] active:shadow-none"
        >
          生成する
        </button>
      </div>
    </div>
  );
}
