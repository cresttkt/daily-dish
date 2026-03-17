# 献立カレンダー 自動生成ロジック 実装手順書（元デザイン維持・パス修正・アラート廃止版）

## STEP 1: 自動生成APIの作成 (src/app/api/generate/route.ts)

ご指定いただいた正規のディレクトリに配置します。UI側の「除外日」と「必須レシピ」に対応させた自動生成の頭脳となるAPIです。
`src/app/api/generate/route.ts` を新規作成（または上書き）し、以下のコードを記述してください。

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { addDays, format } from 'date-fns';

const TARGET_MEALS = ['breakfast', 'lunch', 'dinner'];
const MEAL_ID_MAP: Record<string, number> = { 'breakfast': 1, 'lunch': 2, 'dinner': 3 };

const MEAL_RULES: Record<string, Record<string, number>> = {
breakfast: { '1': 1, '2': 1, '4': 0 },
lunch: { '1': 1, '2': 1, '4': 1 },
dinner: { '1': 1, '2': 1, '3': 2, '4': 1 }
};

function calculateScore(recipe: any, usedRecipeIds: Set<number>, mustIncludeIds: Set<number>): number {
let score = 0;
if (mustIncludeIds.has(recipe.id)) score += 1000;
if (usedRecipeIds.has(recipe.id)) score -= 500;
return score;
}

export async function POST(request: NextRequest) {
try {
const { startDate, period, mustIncludeRecipeIds = [], excludeDates = [] } = await request.json();

    const daysCount = period === '1week' ? 7 : 1;
    const start = new Date(startDate);

    const targetDates: string[] = [];
    for (let i = 0; i < daysCount; i++) {
      const d = addDays(start, i);
      const dateDash = format(d, 'yyyy-MM-dd'); // フロントエンドから来る除外日フォーマット
      const dateDb = format(d, 'yyyyMMdd');     // DB保存用フォーマット

      // UIで設定された「除外日」に含まれていない日付だけを生成対象にする
      if (!excludeDates.includes(dateDash)) {
        targetDates.push(dateDb);
      }
    }

    const allRecipes = await prisma.recipe.findMany();
    const existingMenus = await prisma.menu.findMany({ where: { date: { in: targetDates } } });

    const usedRecipeIds = new Set<number>();
    const mustIncludeIds = new Set<number>(mustIncludeRecipeIds.map(Number));

    existingMenus.forEach(m => usedRecipeIds.add(m.recipes_id));

    const newMenusToSave: any[] = [];

    for (const dateStr of targetDates) {
      const dailyExisting = existingMenus.filter(m => m.date === dateStr);

      for (const mealType of TARGET_MEALS) {
        const mealId = MEAL_ID_MAP[mealType];
        const existingInThisMeal = dailyExisting.filter(m => m.meals_id === mealId);
        const rules = MEAL_RULES[mealType];

        for (const [categoryId, requiredCount] of Object.entries(rules)) {
          const existingCount = existingInThisMeal.filter(m => {
            const recipe = allRecipes.find(r => r.id === m.recipes_id);
            return recipe?.category === categoryId;
          }).length;

          const neededCount = requiredCount - existingCount;

          if (neededCount > 0) {
            const candidates = allRecipes.filter(r => r.category === categoryId);
            const scoredCandidates = candidates.map(r => ({
              recipe: r,
              score: calculateScore(r, usedRecipeIds, mustIncludeIds)
            })).sort((a, b) => {
              if (b.score !== a.score) return b.score - a.score;
              return Math.random() - 0.5;
            });

            for (let i = 0; i < neededCount && i < scoredCandidates.length; i++) {
              const selectedRecipe = scoredCandidates[i].recipe;
              newMenusToSave.push({ date: dateStr, meals_id: mealId, recipes_id: selectedRecipe.id });
              usedRecipeIds.add(selectedRecipe.id);
              mustIncludeIds.delete(selectedRecipe.id);
            }
          }
        }
      }
    }

    if (newMenusToSave.length > 0) {
      await prisma.menu.createMany({ data: newMenusToSave });
    }

    return NextResponse.json({ success: true, count: newMenusToSave.length });

} catch (error) {
console.error('Generate API Error:', error);
return NextResponse.json({ error: 'Failed to generate menus' }, { status: 500 });
}
}

## STEP 2: 自動生成UIの作成 (src/components/overlays/calendar/MealAutoGeneratePopup.tsx)

通信先を確実にご指定の `/api/generate` に変更し、完了時の `alert` を削除してシームレスに閉じるように変更しました。
`src/components/overlays/calendar/MealAutoGeneratePopup.tsx` を以下のコードで「完全に上書き」してください。

'use client';

import { useState, useMemo, useEffect } from 'react';
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

> ([]);

// DBから取得したレシピを格納するステート
const [availableRecipes, setAvailableRecipes] = useState<any[]>([]);

// --- エラー制御 ---
const [dateError, setDateError] = useState('');
const [recipeError, setRecipeError] = useState('');
const [generateError, setGenerateError] = useState('');

// DBから実際のレシピ一覧を取得
useEffect(() => {
const fetchRecipes = async () => {
try {
const res = await fetch('/api/recipes');
if (res.ok) {
const data = await res.json();
setAvailableRecipes(data.recipes || []);
}
} catch (err) {
console.error("Failed to fetch recipes", err);
}
};
fetchRecipes();
}, []);

// startDateを起点に1週間分の日付リストを生成
const weekDates = useMemo(() => {
if (!startDate) return [];
const start = parseISO(startDate);
if (!isValid(start)) return [];
return Array.from({ length: 7 }).map((\_, i) => {
const d = addDays(start, i);
return {
value: format(d, 'yyyy-MM-dd'),
label: format(d, 'M/d(E)', { locale: ja }),
};
});
}, [startDate]);

// DBから取得した availableRecipes で絞り込む
const filteredRecipes = useMemo(() => {
return availableRecipes.filter((r) => r.category === requiredCategory).map(
(r) => ({ value: r.name, label: r.name }),
);
}, [availableRecipes, requiredCategory]);

const handleToggleExclude = (dateValue: string) => {
setExcludeDates((prev) =>
prev.includes(dateValue)
? prev.filter((v) => v !== dateValue)
: [...prev, dateValue],
);
};

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

const handleRemoveRequiredRecipe = (index: number) => {
setRequiredRecipesList((prev) => prev.filter((\_, i) => i !== index));
};

// 実際のAPIにデータを送信する処理
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

    try {
      // 画面上のレシピ名から、DBのIDに変換する
      const mustIncludeRecipeIds = requiredRecipesList
        .map(req => {
          const found = availableRecipes.find(r => r.name === req.recipe);
          return found ? found.id : null;
        })
        .filter(id => id !== null);

      // ★ 修正箇所：正しいエンドポイントへリクエスト
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate,
          period,
          excludeDates, // 追加要件の除外日も送信
          mustIncludeRecipeIds
        })
      });

      if (res.ok) {
        const result = await res.json();
        // アラートを廃止し、そのままシームレスに閉じる処理へ
        setIsClosing(true);
        onGenerate(result);
      } else {
        setGenerateError("自動生成に失敗しました");
      }
    } catch (err) {
      console.error(err);
      setGenerateError("通信エラーが発生しました");
    } finally {
      setIsLoading(false);
    }

};

const handleCloseClick = () => setIsClosing(true);
const handleAnimationEnd = () => {
if (isClosing) onClose();
};

return (
<div
className={`fixed top-0 right-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] left-0 z-[70] flex flex-col bg-white shadow-lg ${isClosing ? 'animate-slide-out-right' : 'animate-slide-in-right'}`}
onAnimationEnd={handleAnimationEnd} >
{/_ 生成中ローダー _/}
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

            <div className="mt-1 h-4 px-2">
              {recipeError && (
                <p className="pt-1 text-[10px] leading-none font-bold text-red-500">
                  {recipeError}
                </p>
              )}
            </div>

            <div className="mt-1 flex justify-center">
              <button
                onClick={handleAddRequiredRecipe}
                className="text-main-green border-main-green flex items-center gap-1 rounded-md border bg-white px-6 py-2 text-[14px] font-bold shadow-[0_2px_0_var(--color-main-green)] transition-all active:translate-y-[2px] active:shadow-none"
              >
                <span className="text-[16px] leading-none">+</span> 追加する
              </button>
            </div>

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

## STEP 3: カレンダーTOP画面の連携 (src/app/page.tsx)

自動生成が完了した後に、カレンダーのデータを再取得して表示をシームレスに更新する処理です。
`src/app/page.tsx` の該当部分を以下のように修正してください。

// 修正後：自動生成完了時にデータを再取得する（アラートなし）
const handleGeneratedMeal = async () => {
setIsAutoGenerating(false);
setIsLoading(true);
const monthStr = format(currentDate, 'yyyyMM');
try {
const res = await fetch(`/api/menus?month=${monthStr}`);
if (res.ok) {
const data = await res.json();
setMealDB(data); // カレンダーの表示が最新に更新されます！
}
} catch (err) {
console.error(err);
} finally {
setIsLoading(false);
}
};

## STEP 4: 動作確認

ファイルの保存が完了したら、ブラウザで以下の機能が意図通りに動くか確認してください。

1. **カレンダー画面から自動生成を開く**
   - カレンダー右上の「自動生成」ボタンを押下し、ポップアップを開きます。
2. **必須レシピ機能とシームレスな更新のテスト**
   - 期間「1日」のまま、本日の日付を選択します。
   - 「必須レシピ」の分類とレシピ名を選択し、「追加する」ボタンを押してリストに登録します。
   - 「生成する」ボタンを押下します。
   - ローディングが終わると**ポップアップがアラート無しでスッと閉じ**、裏側のカレンダーに指定したレシピを含む献立が瞬時に反映されることを確認します。
3. **除外日（スキップ）機能のテスト**
   - 再度ポップアップを開き、期間を「1週」に変更します。
   - 開始日を選択すると表示される「除外日」のチェックボックスをいくつか選択します。
   - 「生成する」ボタンを押下します。
   - 生成後、除外日に指定した日付には献立が追加されておらず、それ以外の日付には正しく自動生成が適用されているか確認します。
