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
  isToday,
} from 'date-fns';
import { ja } from 'date-fns/locale';
import { useSwipeable } from 'react-swipeable';
// エイリアス（@/）を使ったインポート
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
    trackMouse: true,
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
    <div className="flex min-h-full flex-col bg-white" {...handlers}>
      {/*_ 1. カレンダー操作ヘッダー _*/}
      <div className="bg-thin-gray flex items-center justify-between px-4 py-3">
        <div className="flex flex-1 justify-start">
          <SecondButton label="Today" onClick={resetToToday} />
        </div>

        <div className="flex flex-1 items-center justify-center space-x-2">
          <button
            onClick={prevMonth}
            className="text-main-green px-2 text-xl font-bold"
          >
            ◀
          </button>
          <h2 className="text-main-font text-[18px] font-bold whitespace-nowrap">
            {format(currentDate, 'yyyy年M月', { locale: ja })}
          </h2>
          <button
            onClick={nextMonth}
            className="text-main-green px-2 text-xl font-bold"
          >
            ▶
          </button>
        </div>

        <div className="flex flex-1 justify-end">
          <MainButton
            label="自動生成"
            iconSrc="/icons/icon_meal.png"
            onClick={handleAutoGenerateClick}
          />
        </div>
      </div>

      {/* 2. 曜日ヘッダー */}
      <div className="bg-main-green grid grid-cols-7">
        {weekDays.map((day) => (
          <div
            key={day}
            className="border-r border-[#83b083] py-1 text-center text-[12px] font-bold text-white last:border-none"
          >
            {day}
          </div>
        ))}
      </div>

      {/* 3. カレンダーグリッド本体 */}
      <div
        className="grid h-[64vh] grid-cols-7 bg-white"
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
              className={`border-normal-gray flex flex-col items-center overflow-hidden border-r border-b p-[2px] ${bgColor} active:bg-thin-gray transition-colors`}
            >
              <span className={`text-[12px] font-bold ${textColor}`}>
                {format(date, 'd')}
              </span>

              <div className="mt-1 flex w-full flex-col gap-[2px] px-[2px]">
                {dailyMeals.map((meal) => {
                  let tagClass = '';
                  if (meal === '朝食') tagClass = 'bg-breakfast text-red-500';
                  if (meal === '昼食') tagClass = 'bg-lunch text-orange-500';
                  if (meal === '夕食') tagClass = 'bg-dinner text-blue-600';

                  return (
                    <div
                      key={meal}
                      className={`w-full rounded-sm text-center text-[8px] font-bold ${tagClass}`}
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
