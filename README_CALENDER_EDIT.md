# 献立カレンダーTOP & ポップアップ一式 実装手順書 (Step 3: エラー帯追加・全ファイル完全版)

## STEP 1: スライドイン/アウトアニメーションの追加 (src/app/globals.scss)

既存の `src/app/globals.scss` を開き、末尾が以下のようになっていることを確認してください。

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
}

## STEP 2: 汎用UIコンポーネントの作成 (src/components/ui/)

### 1. ラジオボタン (src/components/ui/RadioButton.tsx)

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
className={`flex items-center justify-center w-[54px] h-[24px] rounded-full text-[12px] font-bold border transition-colors ${
        isSelected ? 'bg-main-green text-white border-main-green' : 'bg-white text-main-green border-main-green'
      }`} >
{label}
</button>
);
}

### 2. チェックボックス (src/components/ui/CheckboxButton.tsx)

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
className={`flex items-center gap-1.5 px-2.5 h-[26px] rounded-full text-[12px] border transition-colors ${
        isSelected ? 'bg-main-green text-white border-main-green font-bold' : 'bg-white text-main-font border-main-green'
      }`} >
<div className="w-[12px] h-[12px] rounded-[2px] border border-gray-400 shadow-[inset_0_0_2px_#000] flex items-center justify-center shrink-0 bg-white">
{isSelected && <span className="text-[10px] text-main-green leading-none font-bold">✓</span>}
</div>
<span className="leading-none">{label}</span>
</button>
);
}

### 3. セレクトボックス (src/components/ui/SelectBox.tsx)

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

export default function SelectBox({ value, onChange, options, placeholder = '選択してください' }: Props) {
return (
<div className="relative w-full">
<select
value={value}
onChange={(e) => onChange(e.target.value)}
className="appearance-none w-full border border-main-green rounded-full px-4 py-1.5 text-[12px] text-main-green font-bold bg-white focus:outline-none" >
<option value="">{placeholder}</option>
{options.map((opt) => (
<option key={opt.value} value={opt.value}>
{opt.label}
</option>
))}
</select>
<div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
<svg width="10" height="8" viewBox="0 0 10 8" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M5 8L0 0H10L5 8Z" fill="#669966"/>
</svg>
</div>
</div>
);
}

### 4. 汎用ミニボタン (src/components/ui/MiniButton.tsx)

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
className={`shrink-0 bg-white border border-black/25 text-main-font text-[10px] font-bold px-2 py-1 rounded-sm shadow-[0_1px_1px_rgba(0,0,0,0.25)] active:bg-thin-gray transition-colors ${className}`} >
{label}
</button>
);
}

## STEP 3: 献立確認ポップアップ (src/components/overlays/calendar/MealConfirmPopup.tsx)

既存の `MealConfirmPopup.tsx` を以下のコードに上書きしてください。

'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { DailyMealData } from './MealEditPopup';

type Props = {
date: Date;
mealData: DailyMealData;
onClose: () => void;
onEdit: () => void;
};

export default function MealConfirmPopup({ date, mealData, onClose, onEdit }: Props) {
const [isClosing, setIsClosing] = useState(false);
const dateStr = format(date, 'yyyy/MM/dd(E)', { locale: ja });
const isEmpty = mealData.breakfast.length === 0 && mealData.lunch.length === 0 && mealData.dinner.length === 0;

const mealSections = [
{ type: 'breakfast', title: '朝食', data: mealData.breakfast, bgColor: 'bg-breakfast', borderColor: 'border-red-400' },
{ type: 'lunch', title: '昼食', data: mealData.lunch, bgColor: 'bg-lunch', borderColor: 'border-orange-400' },
{ type: 'dinner', title: '夕食', data: mealData.dinner, bgColor: 'bg-dinner', borderColor: 'border-main-green' },
];

const handleCloseClick = () => setIsClosing(true);
const handleAnimationEnd = () => { if (isClosing) onClose(); };
const handleRecipeClick = (recipeName: string) => alert(`「${recipeName}」のレシピ詳細へ`);

return (
<div className={`fixed top-0 right-0 left-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-[60] bg-white flex flex-col shadow-lg ${isClosing ? 'animate-slide-out-right' : 'animate-slide-in-right'}`} onAnimationEnd={handleAnimationEnd}>
<div className="flex items-center h-14 px-4 shrink-0 bg-white border-b border-normal-gray relative">
<button onClick={handleCloseClick} className="p-2 -ml-2 z-10">
<svg width="12" height="19" viewBox="0 0 12 19" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M0.5 10.3182L9.92857 0.5L11.5 2.13636L3.64286 10.3182L11.5 16.8636L9.92857 18.5L0.5 10.3182Z" fill="#669966" stroke="#669966" strokeLinejoin="round"/>
</svg>
</button>
<h2 className="absolute inset-0 flex items-center justify-center text-[20px] font-bold text-main-font pointer-events-none">{dateStr}の献立</h2>
</div>

      <div className="flex-1 overflow-y-auto p-4 bg-white">
        {isEmpty ? (
          <div className="flex justify-center items-center h-40"><p className="text-main-font font-bold">献立が未登録です</p></div>
        ) : (
          <div className="flex flex-col gap-6">
            {mealSections.map((section) => {
              if (section.data.length === 0) return null;
              return (
                <div key={section.type} className="flex flex-col">
                  <h3 className="text-[16px] font-bold border-l-[4px] border-main-green pl-2 mb-2 text-main-font">{section.title}</h3>
                  <hr className="border-t-[1.5px] border-dotted border-main-green mb-3" />
                  <div className={`${section.bgColor} p-3 rounded-md flex flex-col`}>
                    {section.data.map((item, idx) => {
                      const isLast = idx === section.data.length - 1;
                      return (
                        <div key={idx} onClick={() => handleRecipeClick(item.name)} className={`flex items-center gap-3 cursor-pointer active:bg-thin-gray transition-colors ${!isLast ? `pb-3 mb-3 border-b-[1.5px] border-dotted ${section.borderColor}` : ''}`}>
                          <span className="text-[10px] bg-white border border-normal-gray px-1 py-[2px] rounded-sm whitespace-nowrap shrink-0 text-main-font font-bold">{item.category}</span>
                          <div className="w-10 h-10 rounded-full overflow-hidden border border-normal-gray shrink-0 bg-normal-gray flex justify-center items-center">
                            {item.image ? <img src={item.image} alt={item.name} className="w-full h-full object-cover" /> : <span className="text-[8px] text-white font-bold leading-tight text-center">NO<br/>IMAGE</span>}
                          </div>
                          <div className="flex flex-col"><span className="text-[12px] font-bold text-main-font leading-tight">{item.name}</span>
                            {item.tags && item.tags.length > 0 && <span className="text-[9px] text-gray-500 mt-1">{item.tags.join('、')}</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="p-4 bg-white shrink-0 border-t border-thin-gray shadow-[0_-2px_10px_rgba(0,0,0,0.02)]">
        <button onClick={onEdit} className="w-full bg-main-green text-white font-bold py-3 rounded-md shadow-[0_3px_0_var(--color-dark-green)] active:translate-y-[3px] active:shadow-none transition-all text-[14px]">
          献立を編集する
        </button>
      </div>
    </div>

);
}

## STEP 4: 献立編集ポップアップ (src/components/overlays/calendar/MealEditPopup.tsx)

登録エラーメッセージに控えめな帯（半透明背景）を付与しました。
既存の `MealEditPopup.tsx` を以下のコードに上書きしてください。

'use client';

import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import RadioButton from '@/components/ui/RadioButton';
import CheckboxButton from '@/components/ui/CheckboxButton';
import SelectBox from '@/components/ui/SelectBox';
import MiniButton from '@/components/ui/MiniButton';

export type RecipeItem = { id?: string; category: string; name: string; image: string; tags: string[] };
export type DailyMealData = { breakfast: RecipeItem[]; lunch: RecipeItem[]; dinner: RecipeItem[] };

type Props = {
date: Date;
initialData: DailyMealData;
onClose: () => void;
onSave: (updatedData: DailyMealData) => void;
};

const MOCK_TAGS = ['ヘルシー', '簡単', '時短', '作り置き', '和食', '洋食', '中華', '魚', '肉', '野菜', 'お弁当', '節約'];
const MOCK_RECIPES: RecipeItem[] = [
{ id: '1', category: '主菜', name: '鶏胸肉のオイマヨ炒め', image: '', tags: ['時短', '肉'] },
{ id: '2', category: '主食', name: '白ご飯', image: '', tags: ['簡単', '和食'] },
{ id: '3', category: '副菜', name: 'ほうれん草の胡麻和え', image: '', tags: ['ヘルシー', '野菜', '簡単'] },
{ id: '4', category: '汁物', name: '豆腐とわかめの味噌汁', image: '', tags: ['簡単', '和食', 'ヘルシー'] },
{ id: '5', category: '主菜', name: '鮭の塩焼き', image: '', tags: ['簡単', '魚', '和食'] },
{ id: '6', category: '主食', name: 'チャーハン', image: '', tags: ['時短', '中華'] },
];

export default function MealEditPopup({ date, initialData, onClose, onSave }: Props) {
const [isClosing, setIsClosing] = useState(false);
const [isLoading, setIsLoading] = useState(false);

const [targetMeal, setTargetMeal] = useState<'breakfast' | 'lunch' | 'dinner'>('breakfast');
const [selectedCategory, setSelectedCategory] = useState('主食');
const [selectedTags, setSelectedTags] = useState<string[]>([]);
const [isTagExpanded, setIsTagExpanded] = useState(false);

const [selectedRecipeName, setSelectedRecipeName] = useState('');

const [errorMessage, setErrorMessage] = useState('');
const [saveErrorMessage, setSaveErrorMessage] = useState('');

const [addedMeals, setAddedMeals] = useState<DailyMealData>(JSON.parse(JSON.stringify(initialData)));

const dateStr = format(date, 'yyyy/MM/dd(E)', { locale: ja });

const toggleTag = (tag: string) => {
setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
};

const filteredRecipes = useMemo(() => {
return MOCK_RECIPES.filter(recipe => {
const matchCategory = recipe.category === selectedCategory;
const matchTags = selectedTags.length === 0 || selectedTags.every(t => recipe.tags.includes(t));
return matchCategory && matchTags;
});
}, [selectedCategory, selectedTags]);

const recipeOptions = filteredRecipes.map(r => ({ value: r.name, label: r.name }));

const handleAdd = () => {
if (!selectedRecipeName) {
setErrorMessage('レシピを選択してください');
return;
}

    const recipe = MOCK_RECIPES.find(r => r.name === selectedRecipeName);
    if (!recipe) return;

    setAddedMeals(prev => ({
      ...prev,
      [targetMeal]: [...prev[targetMeal], { ...recipe }]
    }));

    setSelectedRecipeName('');
    setErrorMessage('');
    setSaveErrorMessage('');

};

const handleDelete = (mealType: 'breakfast' | 'lunch' | 'dinner', index: number) => {
setAddedMeals(prev => ({
...prev,
[mealType]: prev[mealType].filter((\_, i) => i !== index)
}));
};

const handleSaveClick = async () => {
const isAllEmpty = addedMeals.breakfast.length === 0 && addedMeals.lunch.length === 0 && addedMeals.dinner.length === 0;
if (isAllEmpty) {
setSaveErrorMessage('献立が登録されていません');
return;
}

    setSaveErrorMessage('');
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsLoading(false);
    onSave(addedMeals);

};

const handleCloseClick = () => setIsClosing(true);
const handleAnimationEnd = () => { if (isClosing) onClose(); };

return (
<div
className={`fixed top-0 right-0 left-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-[70] bg-white flex flex-col shadow-lg ${isClosing ? 'animate-slide-out-right' : 'animate-slide-in-right'}`}
onAnimationEnd={handleAnimationEnd} >
{isLoading && (
<div className="absolute inset-0 z-[80] bg-white/60 flex flex-col justify-center items-center">
<div className="w-10 h-10 border-4 border-normal-gray border-t-main-green rounded-full animate-spin"></div>
<p className="text-main-green font-bold text-[12px] mt-3">保存中...</p>
</div>
)}

      {/* ヘッダー */}
      <div className="flex items-center h-14 px-4 shrink-0 bg-white border-b border-normal-gray relative z-10">
        <button onClick={handleCloseClick} className="p-2 -ml-2 z-10">
          <svg width="12" height="19" viewBox="0 0 12 19" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0.5 10.3182L9.92857 0.5L11.5 2.13636L3.64286 10.3182L11.5 16.8636L9.92857 18.5L0.5 10.3182Z" fill="#669966" stroke="#669966" strokeLinejoin="round"/>
          </svg>
        </button>
        <h2 className="absolute inset-0 flex items-center justify-center text-[18px] font-bold text-main-font pointer-events-none">
          {dateStr}の献立を編集
        </h2>
      </div>

      {/* メインコンテンツ */}
      <div className="flex-1 overflow-y-auto p-4 bg-thin-gray">

        <div className="bg-white p-4 rounded-md shadow-sm flex flex-col gap-6">

          {/* --- 内容選択エリア --- */}
          <div className="flex flex-col">
            <h3 className="text-[16px] font-bold border-l-[4px] border-main-green pl-2 mb-2 text-main-font">内容選択</h3>
            <hr className="border-t-[1.5px] border-dotted border-main-green mb-4" />

            <div className="mb-4">
              <p className="text-[12px] font-bold text-main-font mb-2">● 対象</p>
              <div className="flex gap-2">
                {[
                  { id: 'breakfast', label: '朝食' },
                  { id: 'lunch', label: '昼食' },
                  { id: 'dinner', label: '夕食' }
                ].map(meal => (
                  <RadioButton key={meal.id} label={meal.label} isSelected={targetMeal === meal.id} onClick={() => setTargetMeal(meal.id as any)} />
                ))}
              </div>
            </div>

            <div className="mb-4">
              <p className="text-[12px] font-bold text-main-font mb-2">● 分類</p>
              <div className="flex flex-wrap gap-2">
                {['主食', '主菜', '副菜', '汁物', 'その他'].map(cat => (
                  <RadioButton
                    key={cat}
                    label={cat}
                    isSelected={selectedCategory === cat}
                    onClick={() => {
                      setSelectedCategory(cat);
                      setSelectedRecipeName('');
                      setErrorMessage('');
                    }}
                  />
                ))}
              </div>
            </div>

            <div className="mb-4">
              <p className="text-[12px] font-bold text-main-font mb-2">● タグ選択</p>
              <div className={`flex flex-wrap gap-2 overflow-hidden ${isTagExpanded ? '' : 'max-h-[68px]'}`}>
                {MOCK_TAGS.map(tag => (
                  <CheckboxButton key={tag} label={tag} isSelected={selectedTags.includes(tag)} onClick={() => toggleTag(tag)} />
                ))}
              </div>

              <button
                onClick={() => setIsTagExpanded(!isTagExpanded)}
                className="text-[12px] text-main-green font-bold w-full flex justify-center items-center gap-1 mt-3"
              >
                {isTagExpanded ? 'タグを隠す' : '更にタグを表示する'}

                {isTagExpanded ? (
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M5 0L10 8H0L5 0Z" fill="#669966"/>
                  </svg>
                ) : (
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M5 8L0 0H10L5 8Z" fill="#669966"/>
                  </svg>
                )}
              </button>
            </div>

            {/* レシピ名選択 */}
            <div className="mb-1">
              <p className="text-[12px] font-bold text-main-font mb-2">● レシピ名</p>
              <SelectBox
                value={selectedRecipeName}
                onChange={(val) => {
                  setSelectedRecipeName(val);
                  if(val) setErrorMessage('');
                }}
                options={recipeOptions}
              />
              <div className="h-4 mt-1 px-2">
                {errorMessage && (
                  <p className="text-red-500 text-[10px] font-bold leading-none pt-1">{errorMessage}</p>
                )}
              </div>
            </div>

            {/* 追加ボタン */}
            <div className="flex justify-center mt-1">
              <button
                onClick={handleAdd}
                className="text-main-green text-[14px] font-bold border border-main-green bg-white rounded-md px-6 py-2 shadow-[0_2px_0_var(--color-main-green)] active:translate-y-[2px] active:shadow-none transition-all flex items-center gap-1"
              >
                <span className="text-[16px] leading-none">+</span> 追加する
              </button>
            </div>
          </div>

          {/* --- 追加済みの献立リストエリア --- */}
          <div className="flex flex-col">
            <h3 className="text-[16px] font-bold border-l-[4px] border-main-green pl-2 mb-2 text-main-font">追加済みの献立リスト</h3>
            <hr className="border-t-[1.5px] border-dotted border-main-green mb-4" />

            <div className="flex flex-col gap-6">
              {[
                { type: 'breakfast', title: '朝食', data: addedMeals.breakfast, bgColor: 'bg-breakfast', borderColor: 'border-red-400' },
                { type: 'lunch', title: '昼食', data: addedMeals.lunch, bgColor: 'bg-lunch', borderColor: 'border-orange-400' },
                { type: 'dinner', title: '夕食', data: addedMeals.dinner, bgColor: 'bg-dinner', borderColor: 'border-main-green' },
              ].map(section => (
                <div key={section.type} className="flex flex-col">
                  <p className="text-[12px] font-bold text-main-font mb-2">● {section.title}</p>
                  {section.data.length === 0 ? (
                    <p className="text-[10px] text-gray-400 pl-3">追加されていません</p>
                  ) : (
                    <div className={`${section.bgColor} p-3 rounded-md flex flex-col`}>
                      {section.data.map((item, idx) => {
                        const isLast = idx === section.data.length - 1;
                        return (
                          <div key={idx} className={`flex items-center gap-2 ${!isLast ? `pb-3 mb-3 border-b-[1.5px] border-dotted ${section.borderColor}` : ''}`}>
                            <span className="text-[10px] bg-white border border-normal-gray px-1 py-[2px] rounded-sm whitespace-nowrap shrink-0 text-main-font font-bold">
                              {item.category}
                            </span>
                            <div className="w-10 h-10 rounded-full overflow-hidden border border-normal-gray shrink-0 bg-normal-gray flex justify-center items-center">
                              {item.image ? (
                                <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-[8px] text-white font-bold leading-tight text-center">NO<br/>IMAGE</span>
                              )}
                            </div>
                            <div className="flex flex-col flex-1 min-w-0">
                              <span className="text-[12px] font-bold text-main-font leading-tight truncate">{item.name}</span>
                              {item.tags && item.tags.length > 0 && (
                                <span className="text-[9px] text-gray-500 mt-1 truncate">{item.tags.join('、')}</span>
                              )}
                            </div>

                            <MiniButton label="削除" onClick={() => handleDelete(section.type as any, idx)} />

                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 登録するボタン */}
      <div className="p-4 bg-white shrink-0 border-t border-thin-gray shadow-[0_-2px_10px_rgba(0,0,0,0.02)] z-10 relative">
        {/* 登録エラーメッセージを透過帯で表示 */}
        {saveErrorMessage && (
          <div className="absolute -top-10 left-0 right-0 flex justify-center pointer-events-none">
            <span className="bg-white/90 backdrop-blur-sm border border-red-200 text-red-500 text-[11px] font-bold px-6 py-1.5 rounded-full shadow-[0_2px_4px_rgba(0,0,0,0.05)]">
              {saveErrorMessage}
            </span>
          </div>
        )}
        <button
          onClick={handleSaveClick}
          className="w-full bg-main-green text-white font-bold py-3 rounded-md shadow-[0_3px_0_var(--color-dark-green)] active:translate-y-[3px] active:shadow-none transition-all text-[14px]"
        >
          登録する
        </button>
      </div>
    </div>

);
}

## STEP 5: カレンダーTOP画面のデータ統合 (src/app/page.tsx)

既存の `src/app/page.tsx` を以下のコードに上書きしてください。

'use client';

import { useState } from 'react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isToday } from 'date-fns';
import { ja } from 'date-fns/locale';
import { useSwipeable } from 'react-swipeable';
import MainButton from '@/components/ui/MainButton';
import SecondButton from '@/components/ui/SecondButton';
import MealConfirmPopup from '@/components/overlays/calendar/MealConfirmPopup';
import MealEditPopup, { DailyMealData } from '@/components/overlays/calendar/MealEditPopup';

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
const [selectedDate, setSelectedDate] = useState<Date | null>(null);
const [isEditing, setIsEditing] = useState(false);

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

return (
<div className="flex flex-col min-h-full bg-white relative" {...handlers}>
<div className="flex items-center justify-between px-4 py-3 bg-thin-gray">
<div className="flex justify-start flex-1"><SecondButton label="Today" onClick={resetToToday} /></div>
<div className="flex items-center justify-center space-x-2 flex-1">
<button onClick={prevMonth} className="text-main-green text-xl font-bold px-2">◀</button>
<h2 className="text-[18px] font-bold text-main-font whitespace-nowrap">{format(currentDate, 'yyyy年M月', { locale: ja })}</h2>
<button onClick={nextMonth} className="text-main-green text-xl font-bold px-2">▶</button>
</div>
<div className="flex justify-end flex-1"><MainButton label="自動生成" iconSrc="/icons/icon_meal.png" onClick={() => alert('自動生成')} /></div>
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

      {selectedDate && (
        <MealConfirmPopup date={selectedDate} mealData={currentMealData} onClose={() => setSelectedDate(null)} onEdit={() => setIsEditing(true)} />
      )}

      {selectedDate && isEditing && (
        <MealEditPopup date={selectedDate} initialData={currentMealData} onClose={() => setIsEditing(false)} onSave={handleSaveMeal} />
      )}
    </div>

);
}

## STEP 6: 動作確認

1. 追加済みリストをすべて空にしてから「登録する」ボタンを押下してください。
2. ボタンの少し上に、後ろの要素がうっすら透ける美しい白枠の赤文字エラーメッセージが浮かび上がることを確認してください。
