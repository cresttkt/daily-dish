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
import MainButton from '@/components/ui/MainButton';
import SecondButton from '@/components/ui/SecondButton';
import MealConfirmPopup from '@/components/overlays/calendar/MealConfirmPopup';
import MealEditPopup, {
  DailyMealData,
} from '@/components/overlays/calendar/MealEditPopup';
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
    dinner: [],
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
  const [isAutoGenerating, setIsAutoGenerating] = useState(false);

  const [mealDB, setMealDB] =
    useState<Record<string, DailyMealData>>(getInitialDB());

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

  const handleSaveMeal = (updatedData: DailyMealData) => {
    setMealDB((prev) => ({ ...prev, [selectedDateStr]: updatedData }));
    setIsEditing(false);
    setSelectedDate(null);
  };

  const handleGeneratedMeal = (data: any) => {
    // 実際はここでAPI等から生成されたデータを受け取って mealDB を一括更新します
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
          {/* 自動生成ボタンの onClick に展開処理を付与 */}
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

          const dailyData = mealDB[dateStr];
          const tags = [];
          if (dailyData?.breakfast?.length > 0) tags.push('朝食');
          if (dailyData?.lunch?.length > 0) tags.push('昼食');
          if (dailyData?.dinner?.length > 0) tags.push('夕食');

          return (
            <div
              key={dateStr}
              onClick={() => setSelectedDate(date)}
              className={`border-normal-gray flex flex-col items-center overflow-hidden border-r border-b p-[2px] ${bgColor} active:bg-thin-gray transition-colors`}
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

      {/* 既存のポップアップ群 */}
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

      {/* 自動生成ポップアップ */}
      {isAutoGenerating && (
        <MealAutoGeneratePopup
          onClose={() => setIsAutoGenerating(false)}
          onGenerate={handleGeneratedMeal}
        />
      )}
    </div>
  );
}
