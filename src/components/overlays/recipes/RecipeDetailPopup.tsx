'use client';

import { useState, useEffect } from 'react';

type RecipeDetail = {
  id: string;
  category: string;
  name: string;
  image: string;
  ingredients: string[];
  tools: string[];
  how_to_make: string[];
  tags: string[];
};

type Props = {
  recipeId: string;
  onClose: () => void;
  onEdit: (recipeId: string) => void;
  onDeleteSuccess: () => void;
};

export default function RecipeDetailPopup({
  recipeId,
  onClose,
  onEdit,
  onDeleteSuccess,
}: Props) {
  const [isClosing, setIsClosing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [recipe, setRecipe] = useState<RecipeDetail | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const res = await fetch(`/api/recipes/${recipeId}`);
        if (res.ok) {
          const data = await res.json();
          setRecipe(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDetail();
  }, [recipeId]);

  const handleCloseClick = () => setIsClosing(true);
  const handleAnimationEnd = () => {
    if (isClosing) onClose();
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/recipes/${recipeId}`, { method: 'DELETE' });
      if (res.ok) {
        onDeleteSuccess();
        handleCloseClick();
      } else {
        alert('削除に失敗しました');
        setIsDeleting(false);
        setShowDeleteConfirm(false);
      }
    } catch (err) {
      console.error(err);
      alert('通信エラーが発生しました');
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div
      className={`fixed top-0 right-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] left-0 z-[70] flex flex-col bg-white shadow-lg ${isClosing ? 'animate-slide-out-right' : 'animate-slide-in-right'}`}
      onAnimationEnd={handleAnimationEnd}
    >
      {/* 削除確認モーダル */}
      {showDeleteConfirm && (
        <div className="absolute inset-0 z-[80] flex items-center justify-center bg-black/40 p-4">
          <div className="animate-scale-in-center flex w-full max-w-sm flex-col items-center rounded-md bg-white p-6 shadow-xl">
            <p className="text-main-font mb-2 font-bold">
              本当に削除しますか？
            </p>
            <p className="mb-6 text-center text-[12px] leading-relaxed font-bold text-red-500">
              ※献立カレンダーに登録されている場合、
              <br />
              該当の献立からも削除されます。
            </p>
            <div className="flex w-full gap-4">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="border-normal-gray flex-1 rounded-md border py-2 font-bold text-gray-500 active:bg-gray-100"
                disabled={isDeleting}
              >
                いいえ
              </button>
              <button
                onClick={handleDelete}
                className="flex flex-1 items-center justify-center rounded-md bg-red-500 py-2 font-bold text-white active:bg-red-600 disabled:opacity-50"
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                ) : (
                  'はい'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ヘッダー */}
      <div className="border-normal-gray relative z-10 flex h-14 shrink-0 items-center border-b bg-white px-4">
        <button
          onClick={handleCloseClick}
          className="z-10 -ml-2 p-2 active:opacity-50"
        >
          <svg
            width="12"
            height="19"
            viewBox="0 0 12 19"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M11.5 16.8636L3.64286 10.3182L11.5 2.13636L9.92857 0.5L0.5 10.3182L9.92857 18.5L11.5 16.8636Z"
              fill="#669966"
            />
          </svg>
        </button>
        <h2 className="text-main-font pointer-events-none absolute inset-0 flex items-center justify-center text-[18px] font-bold">
          {isLoading
            ? '読み込み中...'
            : recipe
              ? `${recipe.name}の詳細`
              : 'エラー'}
        </h2>
      </div>

      {/* メインコンテンツ */}
      <div className="bg-thin-gray flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <div className="border-normal-gray border-t-main-green h-10 w-10 animate-spin rounded-full border-4"></div>
          </div>
        ) : recipe ? (
          <div className="border-thin-gray overflow-hidden rounded-md border bg-white shadow-sm">
            {/* 画像エリア */}
            <div className="border-thin-gray relative flex aspect-[4/3] items-center justify-center border-b bg-white p-4">
              <span className="absolute top-4 left-4 z-10 rounded-sm bg-gray-300 px-2 py-0.5 text-[12px] font-bold text-white">
                {recipe.category}
              </span>
              {recipe.image ? (
                <img
                  src={recipe.image}
                  alt={recipe.name}
                  className="h-full max-h-[200px] w-full max-w-[200px] object-contain"
                />
              ) : (
                <span className="text-[14px] font-bold text-gray-400">
                  NO IMAGE
                </span>
              )}
            </div>

            <div className="flex flex-col gap-6 p-4">
              {/* 材料 */}
              <div>
                <h3 className="border-main-green text-main-font mb-2 border-l-[4px] pl-2 text-[16px] font-bold">
                  材料
                </h3>
                <hr className="border-main-green mb-3 border-t-[1.5px] border-dotted" />
                <ul className="text-main-font flex flex-col gap-1 pl-1 text-[14px]">
                  {recipe.ingredients.length > 0 ? (
                    recipe.ingredients.map((item, idx) => (
                      <li key={idx}>・ {item}</li>
                    ))
                  ) : (
                    <li className="text-gray-400">登録なし</li>
                  )}
                </ul>
              </div>

              {/* 道具 */}
              <div>
                <h3 className="border-main-green text-main-font mb-2 border-l-[4px] pl-2 text-[16px] font-bold">
                  道具
                </h3>
                <hr className="border-main-green mb-3 border-t-[1.5px] border-dotted" />
                <ul className="text-main-font flex flex-col gap-1 pl-1 text-[14px]">
                  {recipe.tools.length > 0 ? (
                    recipe.tools.map((item, idx) => (
                      <li key={idx}>・ {item}</li>
                    ))
                  ) : (
                    <li className="text-gray-400">登録なし</li>
                  )}
                </ul>
              </div>

              {/* 作り方 */}
              <div>
                <h3 className="border-main-green text-main-font mb-2 border-l-[4px] pl-2 text-[16px] font-bold">
                  作り方
                </h3>
                <hr className="border-main-green mb-3 border-t-[1.5px] border-dotted" />
                <ol className="text-main-font flex flex-col gap-2 pl-1 text-[14px]">
                  {recipe.how_to_make.length > 0 ? (
                    recipe.how_to_make.map((step, idx) => (
                      <li key={idx} className="flex gap-2">
                        <span className="font-bold">{idx + 1}.</span>
                        <span className="flex-1">{step}</span>
                      </li>
                    ))
                  ) : (
                    <li className="text-gray-400">登録なし</li>
                  )}
                </ol>
              </div>

              {/* タグ */}
              <div className="pt-2">
                <p className="text-main-green text-[12px] leading-relaxed font-bold break-words">
                  {recipe.tags.map((t) => `#${t}`).join(' ')}
                </p>
              </div>

              {/* ボタンエリア */}
              <div className="mt-2 flex gap-4 pt-4">
                <button
                  onClick={() => onEdit(recipe.id)}
                  className="border-main-green text-main-green flex-1 rounded-md border bg-white py-3 text-[14px] font-bold shadow-[0_2px_0_var(--color-main-green)] transition-all active:translate-y-[2px] active:shadow-none"
                >
                  編集する
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="border-main-green text-main-green flex-1 rounded-md border bg-white py-3 text-[14px] font-bold shadow-[0_2px_0_var(--color-main-green)] transition-all active:translate-y-[2px] active:shadow-none"
                >
                  削除する
                </button>
              </div>
            </div>
          </div>
        ) : (
          <p className="mt-10 text-center font-bold text-gray-500">
            レシピが見つかりません
          </p>
        )}
      </div>
    </div>
  );
}
