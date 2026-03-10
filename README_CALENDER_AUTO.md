# 献立自動生成ポップアップ 実装手順書 (Step 4: 完全版)

## STEP 1: 日付入力用のCSS追加 (src/app/globals.scss)

自動生成ポップアップで使用する日付ピッカーのカレンダーアイコンを独自のものに差し替えるため、CSSを追加します。
既存の `src/app/globals.scss` を以下の内容で上書きしてください。

@import "tailwindcss";

@theme {
--color-main-green: #669966;
--color-dark-green: #164716;
--color-main-font: #555555;
--color-normal-gray: #D9D9D9;
--color-thin-gray: #F5F5F5;
--color-white: #FFFFFF;
--color-breakfast: #FFE1E1;
--color-lunch: #FFF2DD;
--color-dinner: #F1EDFF;
}

@layer base {
html, body {
@apply h-full overflow-hidden bg-thin-gray text-main-font;
overscroll-behavior: none;
-webkit-tap-highlight-color: transparent;
-webkit-touch-callout: none;
user-select: none;
}
body {
padding-bottom: env(safe-area-inset-bottom);
}
}

@layer utilities {
@keyframes slide-in-right {
from { transform: translateX(100%); }
to { transform: translateX(0); }
}
@keyframes slide-out-right {
from { transform: translateX(0); }
to { transform: translateX(100%); }
}
.animate-slide-in-right {
animation: slide-in-right 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
.animate-slide-out-right {
animation: slide-out-right 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

/_ ネイティブのdate inputのアイコンを透明化して全体をクリック可能にする _/
.custom-date-input::-webkit-calendar-picker-indicator {
position: absolute;
top: 0;
left: 0;
right: 0;
bottom: 0;
width: 100%;
height: 100%;
opacity: 0;
cursor: pointer;
}
}

## STEP 2: 献立自動生成ポップアップの新規作成 (src/components/overlays/calendar/MealAutoGeneratePopup.tsx)

献立の自動生成を行うための新しいポップアップコンポーネントを作成します。（※Step3で作成した各種UIコンポーネントを使用します）
`src/components/overlays/calendar/MealAutoGeneratePopup.tsx` を新規作成し、以下のコードを記述してください。

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

// モックデータ
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
const [dateInputType, setDateInputType] = useState<'text' | 'date'>('text');
const [excludeDates, setExcludeDates] = useState<string[]>([]);
const [requiredCategory, setRequiredCategory] = useState('主食');
const [requiredRecipe, setRequiredRecipe] = useState('');
const [requiredRecipesList, setRequiredRecipesList] = useState<{category: string, recipe: string}[]>([]);

// --- エラー制御 ---
const [dateError, setDateError] = useState('');
const [recipeError, setRecipeError] = useState('');
const [generateError, setGenerateError] = useState('');

// 1週間分の日付リストを生成（除外日用）
const weekDates = useMemo(() => {
if (!startDate) return [];
const start = parseISO(startDate);
if (!isValid(start)) return [];
return Array.from({ length: 7 }).map((\_, i) => {
const d = addDays(start, i);
return {
value: format(d, 'yyyy-MM-dd'),
label: format(d, 'M/d(E)', { locale: ja })
};
});
}, [startDate]);

// レシピの絞り込み
const filteredRecipes = useMemo(() => {
return MOCK_RECIPES
.filter(r => r.category === requiredCategory)
.map(r => ({ value: r.name, label: r.name }));
}, [requiredCategory]);

const handleToggleExclude = (dateValue: string) => {
setExcludeDates(prev =>
prev.includes(dateValue) ? prev.filter(v => v !== dateValue) : [...prev, dateValue]
);
};

const handleAddRequiredRecipe = () => {
if (!requiredRecipe) {
setRecipeError('レシピを選択してください');
return;
}
setRequiredRecipesList(prev => [...prev, { category: requiredCategory, recipe: requiredRecipe }]);
setRequiredRecipe('');
setRecipeError('');
};

const handleRemoveRequiredRecipe = (index: number) => {
setRequiredRecipesList(prev => prev.filter((\_, i) => i !== index));
};

const handleGenerateClick = async () => {
if (!startDate) {
setDateError(`${period === '1day' ? '対象日' : '開始日'}を選択してください`);
setGenerateError('日付が未選択です');
return;
}
setDateError('');
setGenerateError('');
setIsLoading(true);

    // 擬似的な生成待機時間
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsLoading(false);

    onGenerate({ period, startDate, excludeDates, requiredRecipes: requiredRecipesList });

};

const handleCloseClick = () => setIsClosing(true);
const handleAnimationEnd = () => { if(isClosing) onClose(); };

return (
<div
className={`fixed top-0 right-0 left-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-[70] bg-white flex flex-col shadow-lg ${isClosing ? 'animate-slide-out-right' : 'animate-slide-in-right'}`}
onAnimationEnd={handleAnimationEnd} >
{isLoading && (
<div className="absolute inset-0 z-[80] bg-white/60 flex flex-col justify-center items-center">
<div className="w-10 h-10 border-4 border-normal-gray border-t-main-green rounded-full animate-spin"></div>
<p className="text-main-green font-bold text-[12px] mt-3">献立を生成中...</p>
</div>
)}

      <div className="flex items-center h-14 px-4 shrink-0 bg-white border-b border-normal-gray relative z-10">
        <button onClick={handleCloseClick} className="p-2 -ml-2 z-10">
          <svg width="12" height="19" viewBox="0 0 12 19" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0.5 10.3182L9.92857 0.5L11.5 2.13636L3.64286 10.3182L11.5 16.8636L9.92857 18.5L0.5 10.3182Z" fill="#669966" stroke="#669966" strokeLinejoin="round"/>
          </svg>
        </button>
        <h2 className="absolute inset-0 flex items-center justify-center text-[18px] font-bold text-main-font pointer-events-none">
          献立自動生成
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 bg-thin-gray">
        <div className="bg-white p-4 rounded-md shadow-sm flex flex-col gap-6">

          <div className="flex flex-col">
            <h3 className="text-[16px] font-bold border-l-[4px] border-main-green pl-2 mb-2 text-main-font">生成期間</h3>
            <hr className="border-t-[1.5px] border-dotted border-main-green mb-3" />
            <div className="flex gap-3">
              <RadioButton label="1日" isSelected={period === '1day'} onClick={() => { setPeriod('1day'); setExcludeDates([]); }} />
              <RadioButton label="1週" isSelected={period === '1week'} onClick={() => setPeriod('1week')} />
            </div>
          </div>

          <div className="flex flex-col">
            <h3 className="text-[16px] font-bold border-l-[4px] border-main-green pl-2 mb-2 text-main-font">詳細日付指定</h3>
            <hr className="border-t-[1.5px] border-dotted border-main-green mb-3" />

            <div className="mb-2">
              <p className="text-[12px] font-bold text-main-font mb-2">● {period === '1day' ? '対象日' : '開始日'}</p>
              <div className={`relative w-full max-w-[200px] border ${dateError ? 'border-red-500' : 'border-main-green'} rounded-full bg-white overflow-hidden`}>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    if (e.target.value) { setDateError(''); setGenerateError(''); }
                  }}
                  className={`custom-date-input w-full pl-4 pr-10 py-1.5 text-[12px] font-bold bg-transparent focus:outline-none relative z-10 ${startDate ? 'text-main-font' : 'text-transparent'}`}
                />
                {!startDate && (
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-[12px] font-bold pointer-events-none z-0">
                    日付を選択
                  </div>
                )}
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none z-0">
                  <img src="/icons/icon_calendar.png" alt="calendar" className="w-[14px] h-[14px] object-contain opacity-60" />
                </div>
              </div>
              <div className="h-4 mt-1 px-2">
                {dateError && <p className="text-red-500 text-[10px] font-bold leading-none pt-1">{dateError}</p>}
              </div>
            </div>

            {period === '1week' && (
              <div className="mt-2 animate-fade-in">
                <p className="text-[12px] font-bold text-main-font mb-2">● 除外日</p>
                {!startDate ? (
                  <p className="text-[10px] text-gray-400 font-bold px-2">※ 開始日を選択すると、1週間分の日付が表示されます</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {weekDates.map(d => (
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

          <div className="flex flex-col">
            <h3 className="text-[16px] font-bold border-l-[4px] border-main-green pl-2 mb-2 text-main-font">必須レシピ</h3>
            <hr className="border-t-[1.5px] border-dotted border-main-green mb-3" />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[12px] font-bold text-main-font mb-2">● 分類</p>
                <SelectBox
                  value={requiredCategory}
                  onChange={(val) => { setRequiredCategory(val); setRequiredRecipe(''); setRecipeError(''); }}
                  options={[
                    {value:'主食',label:'主食'}, {value:'主菜',label:'主菜'}, {value:'副菜',label:'副菜'}, {value:'汁物',label:'汁物'}, {value:'その他',label:'その他'}
                  ]}
                />
              </div>
              <div>
                <p className="text-[12px] font-bold text-main-font mb-2">● レシピ</p>
                <SelectBox
                  value={requiredRecipe}
                  onChange={(val) => { setRequiredRecipe(val); if(val) setRecipeError(''); }}
                  options={filteredRecipes}
                />
              </div>
            </div>

            <div className="h-4 mt-1 px-2">
              {recipeError && <p className="text-red-500 text-[10px] font-bold leading-none pt-1">{recipeError}</p>}
            </div>

            <div className="flex justify-center mt-1">
              <button
                onClick={handleAddRequiredRecipe}
                className="text-main-green text-[14px] font-bold border border-main-green bg-white rounded-md px-6 py-2 shadow-[0_2px_0_var(--color-main-green)] active:translate-y-[2px] active:shadow-none transition-all flex items-center gap-1"
              >
                <span className="text-[16px] leading-none">+</span> 追加する
              </button>
            </div>

            {requiredRecipesList.length > 0 && (
              <div className="mt-6 bg-thin-gray p-3 rounded-md flex flex-col gap-2">
                <p className="text-[12px] font-bold text-main-font border-b-[1.5px] border-dotted border-normal-gray pb-2 mb-1">
                  追加済みの必須レシピ
                </p>
                {requiredRecipesList.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 pb-2 border-b-[1.5px] border-dotted border-normal-gray last:border-none last:pb-0">
                    <span className="text-[10px] bg-white border border-normal-gray px-1 py-[2px] rounded-sm shrink-0 text-main-font font-bold">
                      {item.category}
                    </span>
                    <span className="text-[12px] font-bold text-main-font flex-1 min-w-0 truncate">
                      {item.recipe}
                    </span>
                    <MiniButton label="削除" onClick={() => handleRemoveRequiredRecipe(idx)} />
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>

      <div className="p-4 bg-white shrink-0 border-t border-thin-gray shadow-[0_-2px_10px_rgba(0,0,0,0.02)] z-10 relative">
        {generateError && (
          <div className="absolute -top-10 left-0 right-0 flex justify-center pointer-events-none">
            <span className="bg-white/90 backdrop-blur-sm border border-red-200 text-red-500 text-[11px] font-bold px-6 py-1.5 rounded-full shadow-[0_2px_4px_rgba(0,0,0,0.05)]">
              {generateError}
            </span>
          </div>
        )}
        <button
          onClick={handleGenerateClick}
          className="w-full bg-main-green text-white font-bold py-3 rounded-md shadow-[0_3px_0_var(--color-dark-green)] active:translate-y-[3px] active:shadow-none transition-all text-[14px]"
        >
          生成する
        </button>
      </div>
    </div>

);
}

## STEP 3: カレンダーTOP画面への組み込み (src/app/page.tsx)

作成した自動生成ポップアップをカレンダー画面から呼び出せるよう組み込みます。
既存の `src/app/page.tsx` を以下の内容で上書きしてください。

'use client';

import { useState } from 'react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isToday } from 'date-fns';
import { ja } from 'date-fns/locale';
import { useSwipeable } from 'react-swipeable';
import MainButton from '@/components/ui/MainButton';
import SecondButton from '@/components/ui/SecondButton';
import MealConfirmPopup from '@/components/overlays/calendar/MealConfirmPopup';
import MealEditPopup, { DailyMealData } from '@/components/overlays/calendar/MealEditPopup';
import MealAutoGeneratePopup from '@/components/overlays/calendar/MealAutoGeneratePopup';

const getInitialDB = () => {
const db: Record<string, DailyMealData> = {};
const currentMonth = format(new Date(), 'yyyy-MM');
const dummyMeals: DailyMealData = {
breakfast: [
{ category: '主食', name: '白ご飯', image: '', tags: ['簡単'] },
{ category: '主菜', name: '鮭の塩焼き', image: '', tags: ['簡単'] },
],
lunch: [
{ category: '主食', name: 'チャーハン', image: '', tags: ['時短'] },
],
dinner: []
};
db[`${currentMonth}-01`] = dummyMeals;
db[`${currentMonth}-15`] = dummyMeals;
db[`${currentMonth}-25`] = dummyMeals;
return db;
};

export default function CalendarPage() {
const [currentDate, setCurrentDate] = useState(new Date());

// ポップアップの表示制御ステート
const [selectedDate, setSelectedDate] = useState<Date | null>(null);
const [isEditing, setIsEditing] = useState(false);
const [isAutoGenerating, setIsAutoGenerating] = useState(false); // 自動生成ポップアップ用ステート

const [mealDB, setMealDB] = useState<Record<string, DailyMealData>>(getInitialDB());

const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
const resetToToday = () => setCurrentDate(new Date());

const handlers = useSwipeable({
onSwipedLeft: nextMonth,
onSwipedRight: prevMonth,
preventScrollOnSwipe: true,
trackMouse: true
});

const monthStart = startOfMonth(currentDate);
const monthEnd = endOfMonth(monthStart);
const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });
const weeksCount = calendarDays.length / 7;
const weekDays = ['月', '火', '水', '木', '金', '土', '日'];

const selectedDateStr = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '';
const currentMealData = mealDB[selectedDateStr] || { breakfast: [], lunch: [], dinner: [] };

const handleSaveMeal = (updatedData: DailyMealData) => {
setMealDB(prev => ({ ...prev, [selectedDateStr]: updatedData }));
setIsEditing(false);
setSelectedDate(null);
};

const handleGeneratedMeal = (data: any) => {
alert(`${data.period === '1day' ? '1日分' : '1週間分'}の献立を生成しました！\n(開始日: ${data.startDate})`);
setIsAutoGenerating(false);
};

return (
<div className="flex flex-col min-h-full bg-white relative" {...handlers}>
<div className="flex items-center justify-between px-4 py-3 bg-thin-gray">
<div className="flex justify-start flex-1"><SecondButton label="Today" onClick={resetToToday} /></div>
<div className="flex items-center justify-center space-x-2 flex-1">
<button onClick={prevMonth} className="text-main-green text-xl font-bold px-2">◀</button>
<h2 className="text-[18px] font-bold text-main-font whitespace-nowrap">{format(currentDate, 'yyyy年M月', { locale: ja })}</h2>
<button onClick={nextMonth} className="text-main-green text-xl font-bold px-2">▶</button>
</div>
<div className="flex justify-end flex-1">
{/_ 自動生成ボタン押下で isAutoGenerating を true にする _/}
<MainButton label="自動生成" iconSrc="/icons/icon_meal.png" onClick={() => setIsAutoGenerating(true)} />
</div>
</div>

      <div className="grid grid-cols-7 bg-main-green">
        {weekDays.map(day => <div key={day} className="text-center py-1 text-white text-[12px] font-bold border-r border-[#83b083] last:border-none">{day}</div>)}
      </div>

      <div className="grid grid-cols-7 bg-white h-[64vh]" style={{ gridTemplateRows: `repeat(${weeksCount}, minmax(0, 1fr))` }}>
        {calendarDays.map((date) => {
          const dateStr = format(date, 'yyyy-MM-dd');
          const isCurrentMonth = isSameMonth(date, currentDate);
          const isTodayDate = isToday(date);
          const dayOfWeek = date.getDay();

          let textColor = 'text-main-font';
          if (!isCurrentMonth) textColor = 'text-normal-gray';
          else if (dayOfWeek === 6) textColor = 'text-blue-500';
          else if (dayOfWeek === 0) textColor = 'text-red-500';

          const bgColor = isTodayDate ? 'bg-[#f0f9f0]' : 'bg-white';

          const dailyData = mealDB[dateStr];
          const tags = [];
          if (dailyData?.breakfast?.length > 0) tags.push('朝食');
          if (dailyData?.lunch?.length > 0) tags.push('昼食');
          if (dailyData?.dinner?.length > 0) tags.push('夕食');

          return (
            <div
              key={dateStr} onClick={() => setSelectedDate(date)}
              className={`border-b border-r border-normal-gray p-[2px] flex flex-col items-center overflow-hidden ${bgColor} active:bg-thin-gray transition-colors`}
            >
              <span className={`text-[12px] font-bold ${textColor}`}>{format(date, 'd')}</span>
              <div className="w-full flex flex-col gap-[2px] mt-1 px-[2px]">
                {tags.map((meal) => {
                  let tagClass = '';
                  if (meal === '朝食') tagClass = 'bg-breakfast text-red-500';
                  if (meal === '昼食') tagClass = 'bg-lunch text-orange-500';
                  if (meal === '夕食') tagClass = 'bg-dinner text-blue-600';
                  return <div key={meal} className={`text-center text-[8px] font-bold rounded-sm w-full ${tagClass}`} style={{ padding: '2px 0', lineHeight: '1' }}>{meal}</div>;
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* ポップアップ群 */}
      {selectedDate && (
        <MealConfirmPopup date={selectedDate} mealData={currentMealData} onClose={() => setSelectedDate(null)} onEdit={() => setIsEditing(true)} />
      )}
      {selectedDate && isEditing && (
        <MealEditPopup date={selectedDate} initialData={currentMealData} onClose={() => setIsEditing(false)} onSave={handleSaveMeal} />
      )}

      {/* 今回追加した献立自動生成ポップアップ */}
      {isAutoGenerating && (
        <MealAutoGeneratePopup onClose={() => setIsAutoGenerating(false)} onGenerate={handleGeneratedMeal} />
      )}
    </div>

);
}

## STEP 4: 動作確認

1. ヘッダー右上の「自動生成」ボタンをクリックし、ポップアップを開きます。
2. 日付未選択で「生成する」ボタンを押し、エラーが表示されることを確認します。
3. 「生成期間」を1週に変更し、開始日を選択すると除外日チェックボックスが表示されることを確認します。
4. 生成するボタンを押すと「献立を生成中...」というローダーが表示されることを確認します。
