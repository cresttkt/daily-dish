'use client';

import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import RadioButton from '@/components/ui/RadioButton';
import CheckboxButton from '@/components/ui/CheckboxButton';
import SelectBox from '@/components/ui/SelectBox';
import MiniButton from '@/components/ui/MiniButton';

export type RecipeItem = {
  id?: string;
  category: string;
  name: string;
  image: string;
  tags: string[];
};
export type DailyMealData = {
  breakfast: RecipeItem[];
  lunch: RecipeItem[];
  dinner: RecipeItem[];
};

type Props = {
  date: Date;
  initialData: DailyMealData;
  onClose: () => void;
  onSave: (updatedData: DailyMealData) => void;
};

const MOCK_TAGS = [
  'ヘルシー',
  '簡単',
  '時短',
  '作り置き',
  '和食',
  '洋食',
  '中華',
  '魚',
  '肉',
  '野菜',
  'お弁当',
  '節約',
];
const MOCK_RECIPES: RecipeItem[] = [
  {
    id: '1',
    category: '主菜',
    name: '鶏胸肉のオイマヨ炒め',
    image: '',
    tags: ['時短', '肉'],
  },
  {
    id: '2',
    category: '主食',
    name: '白ご飯',
    image: '',
    tags: ['簡単', '和食'],
  },
  {
    id: '3',
    category: '副菜',
    name: 'ほうれん草の胡麻和え',
    image: '',
    tags: ['ヘルシー', '野菜', '簡単'],
  },
  {
    id: '4',
    category: '汁物',
    name: '豆腐とわかめの味噌汁',
    image: '',
    tags: ['簡単', '和食', 'ヘルシー'],
  },
  {
    id: '5',
    category: '主菜',
    name: '鮭の塩焼き',
    image: '',
    tags: ['簡単', '魚', '和食'],
  },
  {
    id: '6',
    category: '主食',
    name: 'チャーハン',
    image: '',
    tags: ['時短', '中華'],
  },
];

export default function MealEditPopup({
  date,
  initialData,
  onClose,
  onSave,
}: Props) {
  const [isClosing, setIsClosing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [targetMeal, setTargetMeal] = useState<
    'breakfast' | 'lunch' | 'dinner'
  >('breakfast');
  const [selectedCategory, setSelectedCategory] = useState('主食');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isTagExpanded, setIsTagExpanded] = useState(false);

  const [selectedRecipeName, setSelectedRecipeName] = useState('');

  const [errorMessage, setErrorMessage] = useState('');
  const [saveErrorMessage, setSaveErrorMessage] = useState('');

  const [addedMeals, setAddedMeals] = useState<DailyMealData>(
    JSON.parse(JSON.stringify(initialData)),
  );

  const dateStr = format(date, 'yyyy/MM/dd(E)', { locale: ja });

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const filteredRecipes = useMemo(() => {
    return MOCK_RECIPES.filter((recipe) => {
      const matchCategory = recipe.category === selectedCategory;
      const matchTags =
        selectedTags.length === 0 ||
        selectedTags.every((t) => recipe.tags.includes(t));
      return matchCategory && matchTags;
    });
  }, [selectedCategory, selectedTags]);

  const recipeOptions = filteredRecipes.map((r) => ({
    value: r.name,
    label: r.name,
  }));

  const handleAdd = () => {
    if (!selectedRecipeName) {
      setErrorMessage('レシピを選択してください');
      return;
    }

    const recipe = MOCK_RECIPES.find((r) => r.name === selectedRecipeName);
    if (!recipe) return;

    setAddedMeals((prev) => ({
      ...prev,
      [targetMeal]: [...prev[targetMeal], { ...recipe }],
    }));

    setSelectedRecipeName('');
    setErrorMessage('');
    setSaveErrorMessage('');
  };

  const handleDelete = (
    mealType: 'breakfast' | 'lunch' | 'dinner',
    index: number,
  ) => {
    setAddedMeals((prev) => ({
      ...prev,
      [mealType]: prev[mealType].filter((_, i) => i !== index),
    }));
  };

  const handleSaveClick = async () => {
    const isAllEmpty =
      addedMeals.breakfast.length === 0 &&
      addedMeals.lunch.length === 0 &&
      addedMeals.dinner.length === 0;
    if (isAllEmpty) {
      setSaveErrorMessage('献立が登録されていません');
      return;
    }

    setSaveErrorMessage('');
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsLoading(false);
    onSave(addedMeals);
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
      {isLoading && (
        <div className="absolute inset-0 z-[80] flex flex-col items-center justify-center bg-white/60">
          <div className="border-normal-gray border-t-main-green h-10 w-10 animate-spin rounded-full border-4"></div>
          <p className="text-main-green mt-3 text-[12px] font-bold">
            保存中...
          </p>
        </div>
      )}

      {/* ヘッダー */}
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
          {dateStr}の献立を編集
        </h2>
      </div>

      {/* メインコンテンツ */}
      <div className="bg-thin-gray flex-1 overflow-y-auto p-4">
        <div className="flex flex-col gap-6 rounded-md bg-white p-4 shadow-sm">
          {/* --- 内容選択エリア --- */}
          <div className="flex flex-col">
            <h3 className="border-main-green text-main-font mb-2 border-l-[4px] pl-2 text-[16px] font-bold">
              内容選択
            </h3>
            <hr className="border-main-green mb-4 border-t-[1.5px] border-dotted" />

            <div className="mb-4">
              <p className="text-main-font mb-2 text-[12px] font-bold">
                ● 対象
              </p>
              <div className="flex gap-2">
                {[
                  { id: 'breakfast', label: '朝食' },
                  { id: 'lunch', label: '昼食' },
                  { id: 'dinner', label: '夕食' },
                ].map((meal) => (
                  <RadioButton
                    key={meal.id}
                    label={meal.label}
                    isSelected={targetMeal === meal.id}
                    onClick={() => setTargetMeal(meal.id as any)}
                  />
                ))}
              </div>
            </div>

            <div className="mb-4">
              <p className="text-main-font mb-2 text-[12px] font-bold">
                ● 分類
              </p>
              <div className="flex flex-wrap gap-2">
                {['主食', '主菜', '副菜', '汁物', 'その他'].map((cat) => (
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
              <p className="text-main-font mb-2 text-[12px] font-bold">
                ● タグ選択
              </p>
              <div
                className={`flex flex-wrap gap-2 overflow-hidden ${isTagExpanded ? '' : 'max-h-[68px]'}`}
              >
                {MOCK_TAGS.map((tag) => (
                  <CheckboxButton
                    key={tag}
                    label={tag}
                    isSelected={selectedTags.includes(tag)}
                    onClick={() => toggleTag(tag)}
                  />
                ))}
              </div>

              <button
                onClick={() => setIsTagExpanded(!isTagExpanded)}
                className="text-main-green mt-3 flex w-full items-center justify-center gap-1 text-[12px] font-bold"
              >
                {isTagExpanded ? 'タグを隠す' : '更にタグを表示する'}

                {isTagExpanded ? (
                  <svg
                    width="10"
                    height="8"
                    viewBox="0 0 10 8"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M5 0L10 8H0L5 0Z" fill="#669966" />
                  </svg>
                ) : (
                  <svg
                    width="10"
                    height="8"
                    viewBox="0 0 10 8"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M5 8L0 0H10L5 8Z" fill="#669966" />
                  </svg>
                )}
              </button>
            </div>

            {/* レシピ名選択 */}
            <div className="mb-1">
              <p className="text-main-font mb-2 text-[12px] font-bold">
                ● レシピ名
              </p>
              <SelectBox
                value={selectedRecipeName}
                onChange={(val) => {
                  setSelectedRecipeName(val);
                  if (val) setErrorMessage('');
                }}
                options={recipeOptions}
              />
              <div className="mt-1 h-4 px-2">
                {errorMessage && (
                  <p className="pt-1 text-[10px] leading-none font-bold text-red-500">
                    {errorMessage}
                  </p>
                )}
              </div>
            </div>

            {/* 追加ボタン */}
            <div className="mt-1 flex justify-center">
              <button
                onClick={handleAdd}
                className="text-main-green border-main-green flex items-center gap-1 rounded-md border bg-white px-6 py-2 text-[14px] font-bold shadow-[0_2px_0_var(--color-main-green)] transition-all active:translate-y-[2px] active:shadow-none"
              >
                <span className="text-[16px] leading-none">+</span> 追加する
              </button>
            </div>
          </div>

          {/* --- 追加済みの献立リストエリア --- */}
          <div className="flex flex-col">
            <h3 className="border-main-green text-main-font mb-2 border-l-[4px] pl-2 text-[16px] font-bold">
              追加済みの献立リスト
            </h3>
            <hr className="border-main-green mb-4 border-t-[1.5px] border-dotted" />

            <div className="flex flex-col gap-6">
              {[
                {
                  type: 'breakfast',
                  title: '朝食',
                  data: addedMeals.breakfast,
                  bgColor: 'bg-breakfast',
                  borderColor: 'border-red-400',
                },
                {
                  type: 'lunch',
                  title: '昼食',
                  data: addedMeals.lunch,
                  bgColor: 'bg-lunch',
                  borderColor: 'border-orange-400',
                },
                {
                  type: 'dinner',
                  title: '夕食',
                  data: addedMeals.dinner,
                  bgColor: 'bg-dinner',
                  borderColor: 'border-main-green',
                },
              ].map((section) => (
                <div key={section.type} className="flex flex-col">
                  <p className="text-main-font mb-2 text-[12px] font-bold">
                    ● {section.title}
                  </p>
                  {section.data.length === 0 ? (
                    <p className="pl-3 text-[10px] text-gray-400">
                      追加されていません
                    </p>
                  ) : (
                    <div
                      className={`${section.bgColor} flex flex-col rounded-md p-3`}
                    >
                      {section.data.map((item, idx) => {
                        const isLast = idx === section.data.length - 1;
                        return (
                          <div
                            key={idx}
                            className={`flex items-center gap-2 ${!isLast ? `mb-3 border-b-[1.5px] border-dotted pb-3 ${section.borderColor}` : ''}`}
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
                            <div className="flex min-w-0 flex-1 flex-col">
                              <span className="text-main-font truncate text-[12px] leading-tight font-bold">
                                {item.name}
                              </span>
                              {item.tags && item.tags.length > 0 && (
                                <span className="mt-1 truncate text-[9px] text-gray-500">
                                  {item.tags.join('、')}
                                </span>
                              )}
                            </div>

                            <MiniButton
                              label="削除"
                              onClick={() =>
                                handleDelete(section.type as any, idx)
                              }
                            />
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
      <div className="border-thin-gray relative z-10 shrink-0 border-t bg-white p-4 shadow-[0_-2px_10px_rgba(0,0,0,0.02)]">
        {/* 登録エラーメッセージを透過帯で表示 */}
        {saveErrorMessage && (
          <div className="pointer-events-none absolute -top-10 right-0 left-0 flex justify-center">
            <span className="rounded-full border border-red-200 bg-white/90 px-6 py-1.5 text-[11px] font-bold text-red-500 shadow-[0_2px_4px_rgba(0,0,0,0.05)] backdrop-blur-sm">
              {saveErrorMessage}
            </span>
          </div>
        )}
        <button
          onClick={handleSaveClick}
          className="bg-main-green w-full rounded-md py-3 text-[14px] font-bold text-white shadow-[0_3px_0_var(--color-dark-green)] transition-all active:translate-y-[3px] active:shadow-none"
        >
          登録する
        </button>
      </div>
    </div>
  );
}
