'use client';

import { useState, useEffect, useMemo } from 'react';
import CheckboxButton from '@/components/ui/CheckboxButton';
import RecipeDetailPopup from '@/components/overlays/recipes/RecipeDetailPopup';
import RecipeEditPopup from '@/components/overlays/recipes/RecipeEditPopup';

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
  const [editRecipeId, setEditRecipeId] = useState<string | null>(null);

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
      console.error('Failed to fetch recipes', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRecipes();
  }, []);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const filteredRecipes = useMemo(() => {
    return recipes.filter((recipe) => {
      const matchName = recipe.name.includes(searchQuery);
      const matchCategory =
        selectedCategory === '全て' || recipe.category === selectedCategory;
      const matchTags =
        selectedTags.length === 0 ||
        selectedTags.every((t) => recipe.tags.includes(t));
      return matchName && matchCategory && matchTags;
    });
  }, [recipes, searchQuery, selectedCategory, selectedTags]);

  return (
    <div className="bg-thin-gray flex h-[100dvh] flex-col pb-[calc(4rem+env(safe-area-inset-bottom))]">
      <div className="relative flex-1 overflow-y-auto px-4 pt-4 pb-32">
        <div className="mb-4 flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="レシピ名で検索"
            className="border-main-green focus:ring-main-green text-main-font flex-1 rounded-sm border bg-white px-3 py-2 text-[14px] outline-none focus:ring-1"
          />
          <button className="bg-main-green rounded-sm px-5 py-2 text-[14px] font-bold text-white shadow-sm active:translate-y-[1px]">
            検索
          </button>
        </div>

        <div className="mb-4 flex gap-1">
          {['全て', '主食', '主菜', '副菜', '汁物', 'その他'].map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`flex-1 rounded-sm border py-1.5 text-[12px] font-bold transition-colors ${
                  isSelected
                    ? 'bg-main-green border-main-green text-white'
                    : 'border-normal-gray bg-white text-gray-500'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        <div className="mb-3 flex justify-center">
          <button
            onClick={() => setIsTagExpanded(!isTagExpanded)}
            className="text-main-green flex items-center gap-1 text-[14px] font-bold"
          >
            タグで絞り込む {isTagExpanded ? '▲' : '▼'}
          </button>
        </div>

        {isTagExpanded && (
          <div className="animate-fade-in mb-4 flex flex-wrap gap-2">
            {availableTags.length === 0 ? (
              <p className="w-full text-center text-[12px] text-gray-400">
                登録されているタグがありません
              </p>
            ) : (
              availableTags.map((tag) => (
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
          <div className="flex items-center justify-center py-10">
            <div className="border-normal-gray border-t-main-green h-8 w-8 animate-spin rounded-full border-4"></div>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {filteredRecipes.length === 0 ? (
              <p className="col-span-3 py-10 text-center text-[12px] text-gray-400">
                該当するレシピが見つかりません
              </p>
            ) : (
              filteredRecipes.map((recipe) => (
                <div
                  key={recipe.id}
                  onClick={() => setSelectedRecipeId(recipe.id)}
                  className="active:bg-thin-gray flex cursor-pointer flex-col overflow-hidden rounded-md bg-white shadow-md transition-colors"
                >
                  <div className="border-normal-gray relative flex aspect-[4/3] items-center justify-center border-b bg-white">
                    <span className="absolute top-0 left-0 z-10 rounded-br-md bg-gray-300 px-1.5 py-0.5 text-[10px] font-bold text-white">
                      {recipe.category}
                    </span>
                    {recipe.image ? (
                      <img
                        src={recipe.image}
                        alt={recipe.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-center text-[12px] leading-tight font-bold text-gray-400">
                        NO
                        <br />
                        IMAGE
                      </span>
                    )}
                  </div>

                  <div className="flex flex-1 flex-col p-2">
                    <div className="mb-1 h-[28px]">
                      <p className="text-main-green line-clamp-2 text-[11px] leading-tight font-bold">
                        {recipe.name}
                      </p>
                    </div>
                    <div className="h-[20px]">
                      <p className="line-clamp-2 text-[8px] leading-tight text-gray-500">
                        {recipe.tags.map((t) => `#${t}`).join(' ')}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <div className="from-thin-gray via-thin-gray pointer-events-none fixed right-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] left-0 z-30 bg-gradient-to-t to-transparent p-4">
        <button
          onClick={() => setIsAddPopupOpen(true)}
          className="bg-main-green pointer-events-auto w-full rounded-md py-3.5 text-[15px] font-bold text-white shadow-[0_3px_0_var(--color-dark-green)] transition-all active:translate-y-[3px] active:shadow-none"
        >
          レシピ追加
        </button>
      </div>

      {selectedRecipeId && (
        <RecipeDetailPopup
          recipeId={selectedRecipeId}
          onClose={() => setSelectedRecipeId(null)}
          onEdit={(id) => {
            setEditRecipeId(id);
            setSelectedRecipeId(null);
          }}
          onDeleteSuccess={() => {
            setSelectedRecipeId(null);
            fetchRecipes();
          }}
        />
      )}

      {(isAddPopupOpen || editRecipeId) && (
        <RecipeEditPopup
          recipeId={editRecipeId || undefined}
          onClose={() => {
            setIsAddPopupOpen(false);
            setEditRecipeId(null);
          }}
          onSuccess={(type, newId) => {
            setIsAddPopupOpen(false);
            setEditRecipeId(null);
            fetchRecipes();
            if (type === 'edit' && newId) {
              setSelectedRecipeId(newId);
            }
          }}
        />
      )}
    </div>
  );
}
