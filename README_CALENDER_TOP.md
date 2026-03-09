# 献立カレンダーTOP画面 実装手順書 (Step 1: 複数ボタン汎用化・エイリアス対応 完全版)

## STEP 1: カラーテーマの共通定義 (src/app/globals.scss)

（※前回実装済みの場合はスキップしてください）
src/app/globals.scss を開き、以下の内容で上書きしてください。

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

## STEP 2: 汎用メインボタンの作成 (src/components/ui/MainButton.tsx)

（※すでに作成済みの場合は確認のみでOKです）
src/components/ui/ フォルダ内に MainButton.tsx を作成し、以下を記述してください。

'use client';

type Props = {
label: string;
iconSrc: string;
onClick: () => void;
};

export default function MainButton({ label, iconSrc, onClick }: Props) {
return (
<button
      onClick={onClick}
      className="flex flex-col items-center justify-center bg-main-green text-white rounded px-2 py-1 shadow-[0_2px_0_var(--color-dark-green)] active:translate-y-[2px] active:shadow-none transition-all"
    >
<img src={iconSrc} alt={`${label} icon`} className="w-[12px] h-[12px] object-contain" />
<span className="text-[10px] font-bold mt-[2px]">{label}</span>
</button>
);
}

## STEP 3: 汎用サブボタンの作成 (src/components/ui/SecondButton.tsx)

（※すでに作成済みの場合は確認のみでOKです）
src/components/ui/ フォルダ内に SecondButton.tsx を新規作成し、以下を記述してください。

'use client';

type Props = {
label: string;
onClick: () => void;
};

export default function SecondButton({ label, onClick }: Props) {
return (
<button 
      onClick={onClick}
      className="text-main-green text-[10px] font-bold border border-main-green bg-white rounded px-3 py-1 shadow-[0_2px_0_var(--color-main-green)] active:translate-y-[2px] active:shadow-none transition-all"
    >
{label}
</button>
);
}

## STEP 4: カレンダーTOP画面の実装 (src/app/page.tsx)

汎用ボタンをエイリアス（@/）を使用してインポートします。
既存の src/app/page.tsx を以下のコードに書き換えてください。

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

const dummyMeals: Record<string, string[]> = {
'2025-11-01': ['朝食', '昼食', '夕食'],
'2025-11-02': ['朝食'],
'2025-11-08': ['昼食', '夕食'],
};

export default function CalendarPage() {
const [currentDate, setCurrentDate] = useState(new Date());

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

const handleDayClick = (date: Date) => {
alert(`${format(date, 'yyyy年MM月dd日')} の献立ポップアップを開きます`);
};

const handleAutoGenerateClick = () => {
alert('献立自動生成ポップアップを開きます');
};

return (
<div className="flex flex-col min-h-full bg-white" {...handlers}>
{/_ 1. カレンダー操作ヘッダー _/}
<div className="flex items-center justify-between px-4 py-3 bg-thin-gray">

        <div className="flex justify-start flex-1">
          <SecondButton
            label="Today"
            onClick={resetToToday}
          />
        </div>

        <div className="flex items-center justify-center space-x-2 flex-1">
          <button onClick={prevMonth} className="text-main-green text-xl font-bold px-2">◀</button>
          <h2 className="text-[18px] font-bold text-main-font whitespace-nowrap">
            {format(currentDate, 'yyyy年M月', { locale: ja })}
          </h2>
          <button onClick={nextMonth} className="text-main-green text-xl font-bold px-2">▶</button>
        </div>

        <div className="flex justify-end flex-1">
          <MainButton
            label="自動生成"
            iconSrc="/icons/icon_meal.png"
            onClick={handleAutoGenerateClick}
          />
        </div>
      </div>

      {/* 2. 曜日ヘッダー */}
      <div className="grid grid-cols-7 bg-main-green">
        {weekDays.map((day) => (
          <div
            key={day}
            className="text-center py-1 text-white text-[12px] font-bold border-r border-[#83b083] last:border-none"
          >
            {day}
          </div>
        ))}
      </div>

      {/* 3. カレンダーグリッド本体 */}
      <div
        className="grid grid-cols-7 bg-white h-[64vh]"
        style={{ gridTemplateRows: `repeat(${weeksCount}, minmax(0, 1fr))` }}
      >
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
          const dailyMeals = dummyMeals[dateStr] || [];

          return (
            <div
              key={dateStr}
              onClick={() => handleDayClick(date)}
              className={`border-b border-r border-normal-gray p-[2px] flex flex-col items-center overflow-hidden ${bgColor} active:bg-thin-gray transition-colors`}
            >
              <span className={`text-[12px] font-bold ${textColor}`}>
                {format(date, 'd')}
              </span>

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
    </div>

);
}

## STEP 5: 動作確認

1. VS Codeを再起動（またはファイルを保存し直し）して、エイリアス（@/）のインポートエラーが消えるか確認します。
2. ブラウザで確認し、「Today」ボタンが正常に表示され、影の沈み込みがMainButtonと同じ挙動になっているかチェックしてください。
3. 別の月に移動してから「Today」ボタンをクリックし、今月に戻る挙動が保たれているか確認してください。
