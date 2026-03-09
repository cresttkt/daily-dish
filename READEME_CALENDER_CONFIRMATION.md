# 献立カレンダーTOP & 献立確認ポップアップ 実装手順書 (Step 2: データ連動修正・完全版)

## STEP 1: スライドイン/アウトアニメーションの追加 (src/app/globals.scss)

（※前回実装済みの場合はスキップしてください）
既存の src/app/globals.scss の末尾に以下を追記（上書き）してください。

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

## STEP 2: 献立確認ポップアップの作成 (src/components/overlays/calendar/MealConfirmPopup.tsx)

（※前回実装済みの場合は確認のみでOKです）
src/components/overlays/calendar/MealConfirmPopup.tsx を以下のコードにしてください。

'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

type Props = {
date: Date;
onClose: () => void;
onEdit: () => void;
};

// --- ポップアップ検証用のダミーデータ ---
const getMockData = (date: Date) => {
const day = date.getDate();
// 毎月1日、15日、25日をダミーデータありとする
if (day === 1 || day === 15 || day === 25) {
return {
breakfast: [
{ category: '主食', name: '白ご飯', image: '', tags: ['ヘルシー', '簡単'] },
{ category: '主菜', name: '鮭の塩焼き', image: '', tags: ['ヘルシー', '簡単'] },
{ category: '副菜', name: 'ほうれん草の胡麻和え', image: '', tags: ['ヘルシー', '簡単'] },
],
lunch: [
{ category: '主食', name: '白ご飯', image: '', tags: ['ヘルシー', '簡単'] },
{ category: '主菜', name: '鮭の塩焼き', image: '', tags: ['ヘルシー', '簡単'] },
{ category: '副菜', name: 'ほうれん草の胡麻和え', image: '', tags: ['ヘルシー', '簡単'] },
],
dinner: [
{ category: '主食', name: '白ご飯', image: '', tags: ['ヘルシー', '簡単'] },
],
};
}
return { breakfast: [], lunch: [], dinner: [] };
};

export default function MealConfirmPopup({ date, onClose, onEdit }: Props) {
const [isClosing, setIsClosing] = useState(false);

const dateStr = format(date, 'yyyy/MM/dd(E)', { locale: ja });
const mockData = getMockData(date);
const isEmpty = mockData.breakfast.length === 0 && mockData.lunch.length === 0 && mockData.dinner.length === 0;

const mealSections = [
{ type: 'breakfast', title: '朝食', data: mockData.breakfast, bgColor: 'bg-breakfast', borderColor: 'border-red-400' },
{ type: 'lunch', title: '昼食', data: mockData.lunch, bgColor: 'bg-lunch', borderColor: 'border-orange-400' },
{ type: 'dinner', title: '夕食', data: mockData.dinner, bgColor: 'bg-dinner', borderColor: 'border-main-green' },
];

const handleCloseClick = () => setIsClosing(true);

const handleAnimationEnd = () => {
if (isClosing) onClose();
};

const handleRecipeClick = (recipeName: string) => {
alert(`「${recipeName}」のレシピ詳細ポップアップを開きます\n（今後のStepで実装予定）`);
};

return (

<div
className={`fixed top-0 right-0 left-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-[60] bg-white flex flex-col shadow-lg ${isClosing ? 'animate-slide-out-right' : 'animate-slide-in-right'}`}
onAnimationEnd={handleAnimationEnd} >
{/_ 1. ポップアップ内ヘッダー _/}
<div className="flex items-center h-14 px-4 shrink-0 bg-white border-b border-normal-gray relative">
<button onClick={handleCloseClick} className="p-2 -ml-2 z-10">
<svg width="12" height="19" viewBox="0 0 12 19" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M0.5 10.3182L9.92857 0.5L11.5 2.13636L3.64286 10.3182L11.5 16.8636L9.92857 18.5L0.5 10.3182Z" fill="#669966" stroke="#669966" strokeLinejoin="round"/>
</svg>
</button>
<h2 className="absolute inset-0 flex items-center justify-center text-[20px] font-bold text-main-font pointer-events-none">
{dateStr}の献立
</h2>
</div>

      {/* 2. メインコンテンツ（スクロール領域） */}
      <div className="flex-1 overflow-y-auto p-4 bg-white">
        {isEmpty ? (
          <div className="flex justify-center items-center h-40">
            <p className="text-main-font font-bold">献立が未登録です</p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {mealSections.map((section) => {
              if (section.data.length === 0) return null;

              return (
                <div key={section.type} className="flex flex-col">
                  {/* セクションタイトル */}
                  <h3 className="text-[16px] font-bold border-l-[4px] border-main-green pl-2 mb-2 text-main-font">
                    {section.title}
                  </h3>
                  <hr className="border-t-[1.5px] border-dotted border-main-green mb-3" />

                  {/* 献立リスト枠 */}
                  <div className={`${section.bgColor} p-3 rounded-md flex flex-col`}>
                    {section.data.map((item, idx) => {
                      const isLast = idx === section.data.length - 1;
                      return (
                        <div
                          key={idx}
                          onClick={() => handleRecipeClick(item.name)}
                          className={`flex items-center gap-3 cursor-pointer active:bg-thin-gray transition-colors ${!isLast ? `pb-3 mb-3 border-b-[1.5px] border-dotted ${section.borderColor}` : ''}`}
                        >
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

                          <div className="flex flex-col">
                            <span className="text-[12px] font-bold text-main-font leading-tight">{item.name}</span>
                            {item.tags && item.tags.length > 0 && (
                              <span className="text-[9px] text-gray-500 mt-1">{item.tags.join('、')}</span>
                            )}
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

      {/* 3. 編集ボタン（下部固定エリア） */}
      <div className="p-4 bg-white shrink-0 border-t border-thin-gray shadow-[0_-2px_10px_rgba(0,0,0,0.02)]">
        <button
          onClick={onEdit}
          className="w-full bg-main-green text-white font-bold py-3 rounded-md shadow-[0_3px_0_var(--color-dark-green)] active:translate-y-[3px] active:shadow-none transition-all text-[14px]"
        >
          献立を編集する
        </button>
      </div>

    </div>

);
}

## STEP 3: カレンダーTOP画面への組み込み (src/app/page.tsx)

カレンダーのマス目に表示するタグも、ポップアップと同じ「毎月1日、15日、25日」に連動するように修正しました。
既存の src/app/page.tsx を以下のコードに上書きしてください。

'use client';

import { useState } from 'react';
import {
format,
addMonths,
subMonths,
startOfMonth,
endOfMonth,
startOfWeek,
endOfWeek,
eachDayOfInterval,
isSameMonth,
isToday
} from 'date-fns';
import { ja } from 'date-fns/locale';
import { useSwipeable } from 'react-swipeable';
import MainButton from '@/components/ui/MainButton';
import SecondButton from '@/components/ui/SecondButton';
import MealConfirmPopup from '@/components/overlays/calendar/MealConfirmPopup';

// --- カレンダーマス用のダミーデータ取得ロジック ---
// ポップアップ側の getMockData と条件を合わせて連動させます
const getMealTagsForDate = (date: Date) => {
const day = date.getDate();
if (day === 1 || day === 15 || day === 25) {
return ['朝食', '昼食', '夕食'];
}
return [];
};

export default function CalendarPage() {
const [currentDate, setCurrentDate] = useState(new Date());
const [selectedDate, setSelectedDate] = useState<Date | null>(null);

const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
const resetToToday = () => setCurrentDate(new Date());

const handlers = useSwipeable({
onSwipedLeft: () => nextMonth(),
onSwipedRight: () => prevMonth(),
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

const handleDayClick = (date: Date) => setSelectedDate(date);
const handleClosePopup = () => setSelectedDate(null);
const handleEditMeal = () => alert('献立編集ポップアップを開きます');
const handleAutoGenerateClick = () => alert('献立自動生成ポップアップを開きます');

return (

<div className="flex flex-col min-h-full bg-white relative" {...handlers}>
{/* 1. カレンダー操作ヘッダー */}
<div className="flex items-center justify-between px-4 py-3 bg-thin-gray">
<div className="flex justify-start flex-1">
<SecondButton label="Today" onClick={resetToToday} />
</div>

        <div className="flex items-center justify-center space-x-2 flex-1">
          <button onClick={prevMonth} className="text-main-green text-xl font-bold px-2">◀</button>
          <h2 className="text-[18px] font-bold text-main-font whitespace-nowrap">
            {format(currentDate, 'yyyy年M月', { locale: ja })}
          </h2>
          <button onClick={nextMonth} className="text-main-green text-xl font-bold px-2">▶</button>
        </div>

        <div className="flex justify-end flex-1">
          <MainButton label="自動生成" iconSrc="/icons/icon_meal.png" onClick={handleAutoGenerateClick} />
        </div>
      </div>

      {/* 2. 曜日ヘッダー */}
      <div className="grid grid-cols-7 bg-main-green">
        {weekDays.map((day) => (
          <div key={day} className="text-center py-1 text-white text-[12px] font-bold border-r border-[#83b083] last:border-none">
            {day}
          </div>
        ))}
      </div>

      {/* 3. カレンダーグリッド本体 */}
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

          // 固定データではなく、日付を元にタグ配列を取得する
          const dailyMeals = getMealTagsForDate(date);

          return (
            <div
              key={dateStr}
              onClick={() => handleDayClick(date)}
              className={`border-b border-r border-normal-gray p-[2px] flex flex-col items-center overflow-hidden ${bgColor} active:bg-thin-gray transition-colors`}
            >
              <span className={`text-[12px] font-bold ${textColor}`}>{format(date, 'd')}</span>

              <div className="w-full flex flex-col gap-[2px] mt-1 px-[2px]">
                {dailyMeals.map((meal) => {
                  let tagClass = '';
                  if (meal === '朝食') tagClass = 'bg-breakfast text-red-500';
                  if (meal === '昼食') tagClass = 'bg-lunch text-orange-500';
                  if (meal === '夕食') tagClass = 'bg-dinner text-blue-600';

                  return (
                    <div
                      key={meal}
                      className={`text-center text-[8px] font-bold rounded-sm w-full ${tagClass}`}
                      style={{ padding: '2px 0', lineHeight: '1' }}
                    >
                      {meal}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* 4. ポップアップ呼び出し */}
      {selectedDate && (
        <MealConfirmPopup
          date={selectedDate}
          onClose={handleClosePopup}
          onEdit={handleEditMeal}
        />
      )}
    </div>

);
}

## STEP 4: 動作確認

1. ブラウザで確認し、今月（または他のどの月でも）の「1日」「15日」「25日」のマスに「朝食・昼食・夕食」のタグが表示されているか確認します。
2. タグが表示されている日をタップし、ポップアップ内にも同じようにデータが表示されるか確認します。
3. タグがない日をタップし、「献立が未登録です」と表示されるか確認します。
