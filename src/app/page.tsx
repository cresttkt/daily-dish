'use client';

import { useState, useEffect } from 'react';
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
import MainButton from '@/components/ui/MainButton';
import SecondButton from '@/components/ui/SecondButton';
import MealConfirmPopup from '@/components/overlays/calendar/MealConfirmPopup';
import MealEditPopup, {
  DailyMealData,
} from '@/components/overlays/calendar/MealEditPopup';
import MealAutoGeneratePopup from '@/components/overlays/calendar/MealAutoGeneratePopup';

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isAutoGenerating, setIsAutoGenerating] = useState(false);

  const [mealDB, setMealDB] = useState<Record<string, DailyMealData>>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchMenus = async () => {
      setIsLoading(true);
      const monthStr = format(currentDate, 'yyyyMM');
      try {
        const res = await fetch(`/api/menus?month=${monthStr}`);
        if (res.ok) {
          const data = await res.json();
          setMealDB(data);
        }
      } catch (err) {
        console.error('Failed to fetch menus', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchMenus();
  }, [currentDate]);

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const resetToToday = () => setCurrentDate(new Date());

  const handlers = useSwipeable({
    onSwipedLeft: nextMonth,
    onSwipedRight: prevMonth,
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

  const selectedDateStr = selectedDate
    ? format(selectedDate, 'yyyy-MM-dd')
    : '';
  const currentMealData = mealDB[selectedDateStr] || {
    breakfast: [],
    lunch: [],
    dinner: [],
  };

  const handleSaveMeal = async (updatedData: DailyMealData) => {
    try {
      const res = await fetch('/api/menus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedDateStr,
          data: updatedData,
        }),
      });

      if (res.ok) {
        setMealDB((prev) => ({ ...prev, [selectedDateStr]: updatedData }));
        setIsEditing(false);
        setSelectedDate(null);
      } else {
        alert('保存に失敗しました');
      }
    } catch (err) {
      console.error(err);
      alert('通信エラーが発生しました');
    }
  };

  const handleGeneratedMeal = (data: any) => {
    alert(
      `${data.period === '1day' ? '1日分' : '1週間分'}の献立を生成しました！\n(開始日: ${data.startDate})`,
    );
    setIsAutoGenerating(false);
  };

  return (
    <div className="relative flex min-h-full flex-col bg-white" {...handlers}>
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
            onClick={() => setIsAutoGenerating(true)}
          />
        </div>
      </div>

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

      <div
        className="relative grid h-[64vh] grid-cols-7 bg-white"
        style={{ gridTemplateRows: `repeat(${weeksCount}, minmax(0, 1fr))` }}
      >
        {isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/50">
            <div className="border-normal-gray border-t-main-green h-8 w-8 animate-spin rounded-full border-4"></div>
          </div>
        )}

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
              key={dateStr}
              onClick={() => setSelectedDate(date)}
              className={`border-normal-gray flex flex-col items-center overflow-hidden border-r border-b p-[2px] ${bgColor} active:bg-thin-gray cursor-pointer transition-colors`}
            >
              <span className={`text-[12px] font-bold ${textColor}`}>
                {format(date, 'd')}
              </span>
              <div className="mt-1 flex w-full flex-col gap-[2px] px-[2px]">
                {tags.map((meal) => {
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

      {selectedDate && (
        <MealConfirmPopup
          date={selectedDate}
          mealData={currentMealData}
          onClose={() => setSelectedDate(null)}
          onEdit={() => setIsEditing(true)}
        />
      )}
      {selectedDate && isEditing && (
        <MealEditPopup
          date={selectedDate}
          initialData={currentMealData}
          onClose={() => setIsEditing(false)}
          onSave={handleSaveMeal}
        />
      )}
      {isAutoGenerating && (
        <MealAutoGeneratePopup
          onClose={() => setIsAutoGenerating(false)}
          onGenerate={handleGeneratedMeal}
        />
      )}
    </div>
  );
}
