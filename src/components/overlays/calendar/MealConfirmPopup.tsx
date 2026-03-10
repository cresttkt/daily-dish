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

export default function MealConfirmPopup({
  date,
  mealData,
  onClose,
  onEdit,
}: Props) {
  const [isClosing, setIsClosing] = useState(false);
  const dateStr = format(date, 'yyyy/MM/dd(E)', { locale: ja });
  const isEmpty =
    mealData.breakfast.length === 0 &&
    mealData.lunch.length === 0 &&
    mealData.dinner.length === 0;

  const mealSections = [
    {
      type: 'breakfast',
      title: '朝食',
      data: mealData.breakfast,
      bgColor: 'bg-breakfast',
      borderColor: 'border-red-400',
    },
    {
      type: 'lunch',
      title: '昼食',
      data: mealData.lunch,
      bgColor: 'bg-lunch',
      borderColor: 'border-orange-400',
    },
    {
      type: 'dinner',
      title: '夕食',
      data: mealData.dinner,
      bgColor: 'bg-dinner',
      borderColor: 'border-main-green',
    },
  ];

  const handleCloseClick = () => setIsClosing(true);
  const handleAnimationEnd = () => {
    if (isClosing) onClose();
  };
  const handleRecipeClick = (recipeName: string) =>
    alert(`「${recipeName}」のレシピ詳細へ`);

  return (
    <div
      className={`fixed top-0 right-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] left-0 z-[60] flex flex-col bg-white shadow-lg ${isClosing ? 'animate-slide-out-right' : 'animate-slide-in-right'}`}
      onAnimationEnd={handleAnimationEnd}
    >
      <div className="border-normal-gray relative flex h-14 shrink-0 items-center border-b bg-white px-4">
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
        <h2 className="text-main-font pointer-events-none absolute inset-0 flex items-center justify-center text-[20px] font-bold">
          {dateStr}の献立
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto bg-white p-4">
        {isEmpty ? (
          <div className="flex h-40 items-center justify-center">
            <p className="text-main-font font-bold">献立が未登録です</p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {mealSections.map((section) => {
              if (section.data.length === 0) return null;
              return (
                <div key={section.type} className="flex flex-col">
                  <h3 className="border-main-green text-main-font mb-2 border-l-[4px] pl-2 text-[16px] font-bold">
                    {section.title}
                  </h3>
                  <hr className="border-main-green mb-3 border-t-[1.5px] border-dotted" />
                  <div
                    className={`${section.bgColor} flex flex-col rounded-md p-3`}
                  >
                    {section.data.map((item, idx) => {
                      const isLast = idx === section.data.length - 1;
                      return (
                        <div
                          key={idx}
                          onClick={() => handleRecipeClick(item.name)}
                          className={`active:bg-thin-gray flex cursor-pointer items-center gap-3 transition-colors ${!isLast ? `mb-3 border-b-[1.5px] border-dotted pb-3 ${section.borderColor}` : ''}`}
                        >
                          <span className="border-normal-gray text-main-font shrink-0 rounded-sm border bg-white px-1 py-[2px] text-[10px] font-bold whitespace-nowrap">
                            {item.category}
                          </span>
                          <div className="border-normal-gray bg-normal-gray flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border">
                            {item.image ? (
                              <img
                                src={item.image}
                                alt={item.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <span className="text-center text-[8px] leading-tight font-bold text-white">
                                NO
                                <br />
                                IMAGE
                              </span>
                            )}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-main-font text-[12px] leading-tight font-bold">
                              {item.name}
                            </span>
                            {item.tags && item.tags.length > 0 && (
                              <span className="mt-1 text-[9px] text-gray-500">
                                {item.tags.join('、')}
                              </span>
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

      <div className="border-thin-gray shrink-0 border-t bg-white p-4 shadow-[0_-2px_10px_rgba(0,0,0,0.02)]">
        <button
          onClick={onEdit}
          className="bg-main-green w-full rounded-md py-3 text-[14px] font-bold text-white shadow-[0_3px_0_var(--color-dark-green)] transition-all active:translate-y-[3px] active:shadow-none"
        >
          献立を編集する
        </button>
      </div>
    </div>
  );
}
