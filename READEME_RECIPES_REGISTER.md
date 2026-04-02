# レシピ管理機能 実装手順書（フェーズ2: レシピ一覧画面）

## 概要

レシピ管理のメインとなるトップ画面を作成します。登録済みのレシピをカード形式で3列で一覧表示し、リアルタイムでの名前検索、カテゴリタブ、タグ（複数選択のAND検索）による絞り込み機能を提供します。

## STEP 1: レシピ一覧画面の作成 (src/app/recipes/page.tsx)

`src/app/recipes/` フォルダ内の `page.tsx` を以下のコードで完全に上書きしてください。

'use client';

import { useState, useEffect, useMemo } from 'react';
import CheckboxButton from '@/components/ui/CheckboxButton';

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

// --- 検索・絞り込みステート ---
const [searchQuery, setSearchQuery] = useState('');
const [selectedCategory, setSelectedCategory] = useState('全て');
const [selectedTags, setSelectedTags] = useState<string[]>([]);
const [isTagExpanded, setIsTagExpanded] = useState(false);

// --- ポップアップ制御ステート（後続フェーズ用） ---
const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);
const [isAddPopupOpen, setIsAddPopupOpen] = useState(false);

// 初回マウント時に全レシピデータを取得
useEffect(() => {
const fetchRecipes = async () => {
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
fetchRecipes();
}, []);

// タグの選択・解除を切り替える処理
const toggleTag = (tag: string) => {
setSelectedTags(prev =>
prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
);
};

// --- 絞り込みロジック（リアルタイム） ---
const filteredRecipes = useMemo(() => {
return recipes.filter(recipe => {
// 1. 名前検索（入力がない場合は常にtrue）
const matchName = recipe.name.includes(searchQuery);
// 2. カテゴリ絞り込み（'全て'の場合は常にtrue）
const matchCategory = selectedCategory === '全て' || recipe.category === selectedCategory;
// 3. タグ絞り込み（AND検索：選択したすべてのタグを含んでいるか）
const matchTags = selectedTags.length === 0 || selectedTags.every(t => recipe.tags.includes(t));

      return matchName && matchCategory && matchTags;
    });

}, [recipes, searchQuery, selectedCategory, selectedTags]);

return (
// 画面全体をビューポートの高さに固定し、中身だけをスクロールさせる構造
<div className="flex flex-col h-[100dvh] bg-thin-gray pb-[calc(4rem+env(safe-area-inset-bottom))]">

      {/* メインコンテンツ（ここだけがスクロールする） */}
      {/* 末尾の余白を pb-32 に拡大し、スクロール最下部でボタンと被らないように調整 */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-32 relative">

        {/* 検索バー */}
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

        {/* カテゴリタブ */}
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

        {/* タグ絞り込みトグル */}
        <div className="flex justify-center mb-3">
          <button
            onClick={() => setIsTagExpanded(!isTagExpanded)}
            className="text-main-green font-bold text-[14px] flex items-center gap-1"
          >
            タグで絞り込む {isTagExpanded ? '▲' : '▼'}
          </button>
        </div>

        {/* 展開されるタグリスト */}
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

        {/* ローディング表示 */}
        {isLoading ? (
          <div className="flex justify-center items-center py-10">
            <div className="w-8 h-8 border-4 border-normal-gray border-t-main-green rounded-full animate-spin"></div>
          </div>
        ) : (
          /* レシピ一覧グリッド: 3列表示 */
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
                  {/* 画像エリア：白背景、4:3の長方形、下部罫線 */}
                  <div className="relative aspect-[4/3] bg-white flex justify-center items-center border-b border-normal-gray">
                    {/* 左上のカテゴリバッジ */}
                    <span className="absolute top-0 left-0 bg-gray-300 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-br-md z-10">
                      {recipe.category}
                    </span>

                    {/* 画像（ない場合はプレースホルダー） */}
                    {recipe.image ? (
                      <img src={recipe.image} alt={recipe.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[12px] font-bold text-gray-400 text-center leading-tight">NO<br/>IMAGE</span>
                    )}
                  </div>

                  <div className="p-2 flex flex-col flex-1">
                    {/* レシピ名（あらかじめ2行分の高さ: 28px を確保して開始位置を揃える） */}
                    <div className="h-[28px] mb-1">
                      <p className="text-main-green font-bold text-[11px] line-clamp-2 leading-tight">
                        {recipe.name}
                      </p>
                    </div>
                    {/* タグリスト（あらかじめ2行分の高さ: 20px を確保して開始位置を揃える） */}
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

      {/* レシピ追加ボタン（下部固定） */}
      <div className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom))] left-0 right-0 p-4 bg-gradient-to-t from-thin-gray via-thin-gray to-transparent z-30 pointer-events-none">
        <button
          onClick={() => setIsAddPopupOpen(true)}
          className="w-full bg-main-green text-white font-bold py-3.5 rounded-md shadow-[0_3px_0_var(--color-dark-green)] active:translate-y-[3px] active:shadow-none transition-all text-[15px] pointer-events-auto"
        >
          レシピ追加
        </button>
      </div>

    </div>

);
}

## STEP 2: 動作確認

ファイルの保存が完了したら、ローカルサーバー（npm run dev）を起動し、ブラウザで以下のURLにアクセスして動作を確認してください。
👉 **http://localhost:3000/recipes**

以下の機能が正しく動作することを確認します。

1. **カードレイアウトの統一:**
   - タイトルやタグの文字数（1行か2行か）に関わらず、すべてのカードの縦幅が同じサイズに揃っていること。
   - 隣り合うカード間で、タグの表示開始位置が綺麗に横に揃っていること。
2. **スクロールと表示:**
   - 一番下のカードが「レシピ追加」ボタンに隠れず、最後までスクロールできること。
3. **絞り込み機能の確認:**
   - 名前検索、カテゴリタブ、タグの掛け合わせ検索が正しく機能すること。
