# レシピ管理機能 実装手順書（フェーズ3: レシピ詳細ポップアップ）

## 概要

選択したレシピの詳細な情報（画像、材料、道具、作り方、タグ）を表示するポップアップ画面を作成します。この画面からは、レシピの編集画面への遷移と、レシピの削除（関連データの完全消去）を実行できます。レシピ一覧画面および、献立カレンダー画面の双方から呼び出して使用します。

## STEP 1: 個別レシピ取得・削除APIの作成 (src/app/api/recipes/[id]/route.ts)

特定のIDに基づくレシピ情報の取得（GET）と、削除（DELETE）を行うためのAPIを作成します。
削除時には、関連するタグや材料の紐付けデータに加え、献立カレンダー（Menu）に登録されている該当レシピの履歴も一緒に削除し、データの不整合を防ぎます。

src/app/api/recipes/ 内に [id] というフォルダを作成し、その中に route.ts を作成して以下のコードを記述してください。

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

const CATEGORY_MAP: Record<string, string> = { '1': '主食', '2': '主菜', '3': '副菜', '4': '汁物', '5': 'その他' };

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
try {
const resolvedParams = await params;
const recipeId = parseInt(resolvedParams.id, 10);

    const recipe = await prisma.recipe.findUnique({
      where: { id: recipeId },
      include: {
        ingredients: { include: { ingredient: true } },
        tools: { include: { tool: true } },
        tags: { include: { tag: true } }
      }
    });

    if (!recipe) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });
    }

    const formattedRecipe = {
      id: recipe.id.toString(),
      category: CATEGORY_MAP[recipe.category] || 'その他',
      name: recipe.name,
      image: recipe.image || '',
      how_to_make: recipe.how_to_make || [],
      ingredients: recipe.ingredients.map(i => i.ingredient.name),
      tools: recipe.tools.map(t => t.tool.name),
      tags: recipe.tags.map(t => t.tag.name)
    };

    return NextResponse.json(formattedRecipe);

} catch (error) {
console.error('Recipe Detail GET Error:', error);
return NextResponse.json({ error: 'Failed to fetch recipe details' }, { status: 500 });
}
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
try {
const resolvedParams = await params;
const recipeId = parseInt(resolvedParams.id, 10);

    await prisma.$transaction([
      prisma.recipeIngredient.deleteMany({ where: { recipes_id: recipeId } }),
      prisma.recipeTool.deleteMany({ where: { recipes_id: recipeId } }),
      prisma.recipeTag.deleteMany({ where: { recipes_id: recipeId } }),
      prisma.menu.deleteMany({ where: { recipes_id: recipeId } }),
      prisma.recipe.delete({ where: { id: recipeId } })
    ]);

    return NextResponse.json({ success: true });

} catch (error) {
console.error('Recipe DELETE Error:', error);
return NextResponse.json({ error: 'Failed to delete recipe' }, { status: 500 });
}
}

## STEP 2: レシピ詳細ポップアップの作成 (src/components/overlays/recipes/RecipeDetailPopup.tsx)

詳細情報を表示し、削除の確認モーダルを備えたUIコンポーネントを作成します。

src/components/overlays/ 内に recipes フォルダを作成し、RecipeDetailPopup.tsx を新規作成して以下のコードを記述してください。

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

export default function RecipeDetailPopup({ recipeId, onClose, onEdit, onDeleteSuccess }: Props) {
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
onAnimationEnd={handleAnimationEnd} >
{/_ 削除確認モーダル _/}
{showDeleteConfirm && (
<div className="absolute inset-0 z-[80] bg-black/40 flex items-center justify-center p-4">
<div className="bg-white rounded-md p-6 w-full max-w-sm flex flex-col items-center shadow-xl animate-scale-in-center">
<p className="text-main-font font-bold mb-2">本当に削除しますか？</p>
<p className="text-[12px] text-red-500 mb-6 text-center leading-relaxed font-bold">
※献立カレンダーに登録されている場合、<br />該当の献立からも削除されます。
</p>
<div className="flex gap-4 w-full">
<button
onClick={() => setShowDeleteConfirm(false)}
className="flex-1 py-2 border border-normal-gray rounded-md text-gray-500 font-bold active:bg-gray-100"
disabled={isDeleting} >
いいえ
</button>
<button 
                onClick={handleDelete}
                className="flex-1 py-2 bg-red-500 text-white rounded-md font-bold active:bg-red-600 disabled:opacity-50 flex justify-center items-center"
                disabled={isDeleting}
              >
{isDeleting ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : 'はい'}
</button>
</div>
</div>
</div>
)}

      {/* ヘッダー */}
      <div className="border-b border-normal-gray relative z-10 flex h-14 shrink-0 items-center bg-white px-4">
        <button onClick={handleCloseClick} className="z-10 -ml-2 p-2 active:opacity-50">
          <svg width="12" height="19" viewBox="0 0 12 19" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M11.5 16.8636L3.64286 10.3182L11.5 2.13636L9.92857 0.5L0.5 10.3182L9.92857 18.5L11.5 16.8636Z" fill="#669966"/>
          </svg>
        </button>
        <h2 className="text-main-font pointer-events-none absolute inset-0 flex items-center justify-center text-[18px] font-bold">
          {isLoading ? '読み込み中...' : recipe ? `${recipe.name}の詳細` : 'エラー'}
        </h2>
      </div>

      {/* メインコンテンツ */}
      <div className="bg-thin-gray flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex justify-center items-center h-full">
             <div className="w-10 h-10 border-4 border-normal-gray border-t-main-green rounded-full animate-spin"></div>
          </div>
        ) : recipe ? (
          <div className="bg-white rounded-md shadow-sm border border-thin-gray overflow-hidden">
            {/* 画像エリア */}
            <div className="relative aspect-[4/3] bg-white flex justify-center items-center border-b border-thin-gray p-4">
              <span className="absolute top-4 left-4 bg-gray-300 text-white text-[12px] font-bold px-2 py-0.5 rounded-sm z-10">
                {recipe.category}
              </span>
              {recipe.image ? (
                <img src={recipe.image} alt={recipe.name} className="w-full h-full object-contain max-w-[200px] max-h-[200px]" />
              ) : (
                <span className="text-[14px] font-bold text-gray-400">NO IMAGE</span>
              )}
            </div>

            <div className="p-4 flex flex-col gap-6">
              {/* 材料 */}
              <div>
                <h3 className="text-[16px] font-bold border-l-[4px] border-main-green pl-2 mb-2 text-main-font">材料</h3>
                <hr className="border-t-[1.5px] border-dotted border-main-green mb-3" />
                <ul className="text-[14px] text-main-font flex flex-col gap-1 pl-1">
                  {recipe.ingredients.length > 0 ? (
                    recipe.ingredients.map((item, idx) => <li key={idx}>・ {item}</li>)
                  ) : (
                    <li className="text-gray-400">登録なし</li>
                  )}
                </ul>
              </div>

              {/* 道具 */}
              <div>
                <h3 className="text-[16px] font-bold border-l-[4px] border-main-green pl-2 mb-2 text-main-font">道具</h3>
                <hr className="border-t-[1.5px] border-dotted border-main-green mb-3" />
                <ul className="text-[14px] text-main-font flex flex-col gap-1 pl-1">
                  {recipe.tools.length > 0 ? (
                    recipe.tools.map((item, idx) => <li key={idx}>・ {item}</li>)
                  ) : (
                    <li className="text-gray-400">登録なし</li>
                  )}
                </ul>
              </div>

              {/* 作り方 */}
              <div>
                <h3 className="text-[16px] font-bold border-l-[4px] border-main-green pl-2 mb-2 text-main-font">作り方</h3>
                <hr className="border-t-[1.5px] border-dotted border-main-green mb-3" />
                <ol className="text-[14px] text-main-font flex flex-col gap-2 pl-1">
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
                <p className="text-main-green text-[12px] font-bold leading-relaxed break-words">
                  {recipe.tags.map(t => `#${t}`).join(' ')}
                </p>
              </div>

              {/* ボタンエリア */}
              <div className="flex gap-4 pt-4 mt-2">
                <button
                  onClick={() => onEdit(recipe.id)}
                  className="flex-1 py-3 bg-white border border-main-green text-main-green font-bold text-[14px] rounded-md shadow-[0_2px_0_var(--color-main-green)] active:translate-y-[2px] active:shadow-none transition-all"
                >
                  編集する
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex-1 py-3 bg-white border border-main-green text-main-green font-bold text-[14px] rounded-md shadow-[0_2px_0_var(--color-main-green)] active:translate-y-[2px] active:shadow-none transition-all"
                >
                  削除する
                </button>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-center mt-10 text-gray-500 font-bold">レシピが見つかりません</p>
        )}
      </div>
    </div>

);
}

## STEP 3: レシピ一覧画面への組み込み (src/app/recipes/page.tsx)

一覧画面からポップアップを呼び出せるように、src/app/recipes/page.tsx を以下のコードで完全に上書きしてください。

'use client';

import { useState, useEffect, useMemo } from 'react';
import CheckboxButton from '@/components/ui/CheckboxButton';
import RecipeDetailPopup from '@/components/overlays/recipes/RecipeDetailPopup';

export type Recipe = {
id: string;
category: string;
name: string;
image: string;
tags: string[];
};

export default function RecipesPage() {
const [recipes, setRecipes] = useState<Recipe[]>([]);
const [availableTags, setAvailableTags] = useState<string[]>([]);
const [isLoading, setIsLoading] = useState(true);

const [searchQuery, setSearchQuery] = useState('');
const [selectedCategory, setSelectedCategory] = useState('全て');
const [selectedTags, setSelectedTags] = useState<string[]>([]);
const [isTagExpanded, setIsTagExpanded] = useState(false);

const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);
const [isAddPopupOpen, setIsAddPopupOpen] = useState(false);

const fetchRecipes = async () => {
setIsLoading(true);
try {
const res = await fetch('/api/recipes');
if (res.ok) {
const data = await res.json();
setRecipes(data.recipes || []);
setAvailableTags(data.tags || []);
}
} catch (err) {
console.error("Failed to fetch recipes", err);
} finally {
setIsLoading(false);
}
};

useEffect(() => {
fetchRecipes();
}, []);

const toggleTag = (tag: string) => {
setSelectedTags(prev =>
prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
);
};

const filteredRecipes = useMemo(() => {
return recipes.filter(recipe => {
const matchName = recipe.name.includes(searchQuery);
const matchCategory = selectedCategory === '全て' || recipe.category === selectedCategory;
const matchTags = selectedTags.length === 0 || selectedTags.every(t => recipe.tags.includes(t));
return matchName && matchCategory && matchTags;
});
}, [recipes, searchQuery, selectedCategory, selectedTags]);

return (
<div className="flex flex-col h-[100dvh] bg-thin-gray pb-[calc(4rem+env(safe-area-inset-bottom))]">
<div className="flex-1 overflow-y-auto px-4 pt-4 pb-32 relative">
<div className="flex gap-2 mb-4">
<input
type="text"
value={searchQuery}
onChange={(e) => setSearchQuery(e.target.value)}
placeholder="レシピ名で検索"
className="flex-1 bg-white border border-normal-gray rounded-sm px-3 py-2 text-[14px] outline-none focus:border-main-green"
/>
<button className="bg-main-green text-white px-5 py-2 rounded-sm font-bold text-[14px] shadow-sm active:translate-y-[1px]">
検索
</button>
</div>

        <div className="flex gap-1 mb-4">
          {['全て', '主食', '主菜', '副菜', '汁物', 'その他'].map(cat => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`flex-1 py-1.5 text-[12px] font-bold rounded-sm border transition-colors ${
                  isSelected ? 'bg-normal-gray text-white border-normal-gray' : 'bg-white text-gray-500 border-normal-gray'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        <div className="flex justify-center mb-3">
          <button
            onClick={() => setIsTagExpanded(!isTagExpanded)}
            className="text-main-green font-bold text-[14px] flex items-center gap-1"
          >
            タグで絞り込む {isTagExpanded ? '▲' : '▼'}
          </button>
        </div>

        {isTagExpanded && (
          <div className="flex flex-wrap gap-2 mb-4 animate-fade-in">
            {availableTags.length === 0 ? (
              <p className="text-[12px] text-gray-400 w-full text-center">登録されているタグがありません</p>
            ) : (
              availableTags.map(tag => (
                <CheckboxButton
                  key={tag}
                  label={tag}
                  isSelected={selectedTags.includes(tag)}
                  onClick={() => toggleTag(tag)}
                />
              ))
            )}
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center items-center py-10">
            <div className="w-8 h-8 border-4 border-normal-gray border-t-main-green rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {filteredRecipes.length === 0 ? (
              <p className="col-span-3 text-center text-gray-400 text-[12px] py-10">該当するレシピが見つかりません</p>
            ) : (
              filteredRecipes.map(recipe => (
                <div
                  key={recipe.id}
                  onClick={() => setSelectedRecipeId(recipe.id)}
                  className="bg-white rounded-md overflow-hidden shadow-md active:bg-thin-gray transition-colors cursor-pointer flex flex-col"
                >
                  <div className="relative aspect-[4/3] bg-white flex justify-center items-center border-b border-normal-gray">
                    <span className="absolute top-0 left-0 bg-gray-300 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-br-md z-10">
                      {recipe.category}
                    </span>
                    {recipe.image ? (
                      <img src={recipe.image} alt={recipe.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[12px] font-bold text-gray-400 text-center leading-tight">NO<br/>IMAGE</span>
                    )}
                  </div>

                  <div className="p-2 flex flex-col flex-1">
                    <div className="h-[28px] mb-1">
                      <p className="text-main-green font-bold text-[11px] line-clamp-2 leading-tight">
                        {recipe.name}
                      </p>
                    </div>
                    <div className="h-[20px]">
                      <p className="text-gray-500 text-[8px] line-clamp-2 leading-tight">
                        {recipe.tags.map(t => `#${t}`).join(' ')}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <div className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom))] left-0 right-0 p-4 bg-gradient-to-t from-thin-gray via-thin-gray to-transparent z-30 pointer-events-none">
        <button
          onClick={() => setIsAddPopupOpen(true)}
          className="w-full bg-main-green text-white font-bold py-3.5 rounded-md shadow-[0_3px_0_var(--color-dark-green)] active:translate-y-[3px] active:shadow-none transition-all text-[15px] pointer-events-auto"
        >
          レシピ追加
        </button>
      </div>

      {selectedRecipeId && (
        <RecipeDetailPopup
          recipeId={selectedRecipeId}
          onClose={() => setSelectedRecipeId(null)}
          onEdit={(id) => {
            alert('編集機能はフェーズ4で実装します！');
          }}
          onDeleteSuccess={() => {
            setSelectedRecipeId(null);
            fetchRecipes();
          }}
        />
      )}
    </div>

);
}

## STEP 4: 献立カレンダー（献立詳細ポップアップ）からの呼び出し連携

献立確認ポップアップからレシピ詳細を開けるように、該当のファイル（src/components/overlays/MealConfirmPopup.tsx 等）を以下の内容で完全に上書きしてください。

'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { DailyMealData } from './MealEditPopup';
import RecipeDetailPopup from '@/components/overlays/recipes/RecipeDetailPopup';

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
const [detailRecipeId, setDetailRecipeId] = useState<string | null>(null);

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

return (
<div
className={`fixed top-0 right-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] left-0 z-[60] flex flex-col bg-white shadow-lg ${isClosing ? 'animate-slide-out-right' : 'animate-slide-in-right'}`}
onAnimationEnd={handleAnimationEnd} >
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
                          onClick={() => setDetailRecipeId(String(item.id))}
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

      {detailRecipeId && (
        <RecipeDetailPopup
          recipeId={detailRecipeId}
          onClose={() => setDetailRecipeId(null)}
          onEdit={(id) => {
            alert('編集機能はフェーズ4で実装します！');
          }}
          onDeleteSuccess={() => {
            setDetailRecipeId(null);
            onClose(); // 削除後にカレンダーデータを再取得させるため、一度このポップアップごと閉じさせる処理
          }}
        />
      )}
    </div>

);
}

## STEP 5: 動作確認

ファイルの保存が完了したら、ローカルサーバー（npm run dev）を再起動し、以下の手順ですべての機能が正しく動作するか確認してください。

1. **一覧画面からの詳細表示確認**
   - レシピ一覧画面（http://localhost:3000/recipes）を開きます。
   - いずれかのレシピカードをタップし、詳細ポップアップが開くことを確認します。
   - 画像が未登録のレシピを開き、「NO IMAGE」の背景色が真っ白になり、他の領域と区別できることを確認します。
2. **献立カレンダーからの詳細表示確認**
   - 献立カレンダー画面を開き、すでに献立が登録されている日付の「献立確認ポップアップ」を開きます。
   - ポップアップ内のレシピリストをタップし、その上にレシピ詳細ポップアップが開くことを確認します。
3. **削除機能と警告文の確認**
   - レシピ詳細ポップアップ下部の「削除する」ボタンを押下します。
   - 確認モーダルが表示され、「本当に削除しますか？」の文字の下に、赤文字で「※献立カレンダーに登録されている場合、該当の献立からも削除されます。」という警告が表示されることを確認します。
   - 「はい」を押下し、ポップアップが閉じた後、一覧画面（またはカレンダー）から該当のデータが正常に削除されていることを確認します。
