# レシピ管理機能 実装手順書（フェーズ4: レシピ編集・追加ポップアップ）

## 概要

レシピの新規登録および既存レシピの編集を行うポップアップ画面を作成します。
材料ごとの分量設定に対応するためのデータベーススキーマ修正、初期データ投入、および共通UIモジュールを活用したデザインの統一を行います。

## STEP 1: データベーススキーマの修正と型の更新

レシピごとに材料の分量を持たせるため、中間テーブルに amount カラムを追加します。

1. prisma/schema.prisma を開き、RecipeIngredient モデルを以下のように修正（amountを追加）してください。

model RecipeIngredient {
recipes_id Int
ingredients_id Int
amount String? @db.VarChar(255)
recipe Recipe @relation(fields: [recipes_id], references: [id])
ingredient Ingredient @relation(fields: [ingredients_id], references: [id])
@@id([recipes_id, ingredients_id])
@@map("recipes_ingredients")
}

2. ターミナルで以下のコマンドを実行し、データベースに反映させます。
   npx prisma db push
   npx prisma generate

## STEP 2: マスタデータの初期投入 (prisma/seed.ts)

材料・道具の追加機能を検証できるよう、テスト用のマスタデータ（シードデータ）を投入します。
prisma/seed.ts を開き、以下の内容で上書きしてください。

import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

const connectionString = process.env.DIRECT_URL;
if (!connectionString) {
throw new Error("⚠️ .env ファイルに DIRECT_URL が設定されていません！");
}

const pool = new Pool({
connectionString,
ssl: { rejectUnauthorized: false },
});
const adapter = new PrismaPg(pool as any);
const prisma = new PrismaClient({ adapter });

async function main() {
await prisma.menu.deleteMany();
await prisma.recipeTag.deleteMany();
await prisma.recipeIngredient.deleteMany();
await prisma.recipeTool.deleteMany();
await prisma.recipe.deleteMany();
await prisma.tag.deleteMany();
await prisma.ingredient.deleteMany();
await prisma.tool.deleteMany();

const tags = await Promise.all(['ヘルシー', '簡単', '時短', '肉', '魚', '野菜', '汁物', 'お弁当', '和食', '中華'].map(name => prisma.tag.create({ data: { name } })));
const ingredients = await Promise.all(['にんじん', '玉ねぎ', 'じゃがいも', '豚肉', '鶏肉', '鮭', 'ほうれん草', '豆腐', 'わかめ', 'ご飯'].map(name => prisma.ingredient.create({ data: { name } })));
const tools = await Promise.all(['包丁', 'まな板', 'フライパン', '鍋', 'ボウル', 'ざる', '計量スプーン', '炊飯器'].map(name => prisma.tool.create({ data: { name } })));

console.log('✅ テスト用マスタデータの投入が完了しました！');
}

main()
.catch((e) => {
console.error(e);
process.exit(1);
})
.finally(async () => {
await prisma.$disconnect();
});

上書き後、ターミナルで以下のコマンドを実行してデータを投入してください。
npx prisma db seed

## STEP 3: マスタデータ取得APIの作成 (src/app/api/master/route.ts)

材料・道具・タグの一覧を取得するAPIです。
src/app/api/ 内に master フォルダを作成し、route.ts を作成して以下のコードを記述してください。

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
try {
const [ingredients, tools, tags] = await Promise.all([
prisma.ingredient.findMany({ orderBy: { id: 'asc' } }),
prisma.tool.findMany({ orderBy: { id: 'asc' } }),
prisma.tag.findMany({ orderBy: { id: 'asc' } })
]);
return NextResponse.json({ ingredients, tools, tags });
} catch (error) {
console.error('Master GET Error:', error);
return NextResponse.json({ error: 'Failed to fetch master data' }, { status: 500 });
}
}

## STEP 4: レシピ操作APIの修正 (src/app/api/recipes/[id]/route.ts & src/app/api/recipes/route.ts)

① 新規作成・一覧API (src/app/api/recipes/route.ts)
該当ファイルを以下のコードで完全に上書きしてください。

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

const CATEGORY_MAP: Record<string, string> = { '1': '主食', '2': '主菜', '3': '副菜', '4': '汁物', '5': 'その他' };

export async function GET(request: NextRequest) {
try {
const recipes = await prisma.recipe.findMany({
include: { tags: { include: { tag: true } } }
});
const formattedRecipes = recipes.map(r => ({
id: r.id.toString(),
category: CATEGORY_MAP[r.category] || 'その他',
name: r.name,
image: r.image || '',
tags: r.tags.map(t => t.tag.name)
}));
const allTags = Array.from(new Set(formattedRecipes.flatMap(r => r.tags)));
return NextResponse.json({ recipes: formattedRecipes, tags: allTags });
} catch (error) {
return NextResponse.json({ error: 'Failed to fetch recipes' }, { status: 500 });
}
}

export async function POST(request: NextRequest) {
try {
const body = await request.json();
const newRecipe = await prisma.$transaction(async (tx) => {
const recipe = await tx.recipe.create({
data: {
name: body.name,
category: body.category,
image: body.image || null,
how_to_make: body.how_to_make || []
}
});
if (body.ingredients?.length) {
await tx.recipeIngredient.createMany({
data: body.ingredients.map((i: any) => ({
recipes_id: recipe.id, ingredients_id: parseInt(i.id), amount: i.amount
}))
});
}
if (body.tools?.length) {
await tx.recipeTool.createMany({
data: body.tools.map((tId: string) => ({ recipes_id: recipe.id, tools_id: parseInt(tId) }))
});
}
if (body.tags?.length) {
await tx.recipeTag.createMany({
data: body.tags.map((tId: string) => ({ recipes_id: recipe.id, tags_id: parseInt(tId) }))
});
}
return recipe;
});
return NextResponse.json({ success: true, id: newRecipe.id });
} catch (error) {
console.error('Recipe POST Error:', error);
return NextResponse.json({ error: 'Failed to create recipe' }, { status: 500 });
}
}

② 詳細取得・更新・削除API (src/app/api/recipes/[id]/route.ts)
該当ファイルを以下のコードで完全に上書きしてください。

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

    if (!recipe) return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });

    const formattedRecipe = {
      id: recipe.id.toString(),
      category: recipe.category,
      categoryName: CATEGORY_MAP[recipe.category] || 'その他',
      name: recipe.name,
      image: recipe.image || '',
      how_to_make: recipe.how_to_make || [],
      ingredients: recipe.ingredients.map(i => ({ id: i.ingredients_id, name: i.ingredient.name, amount: (i as any).amount || '' })),
      tools: recipe.tools.map(t => ({ id: t.tools_id, name: t.tool.name })),
      tags: recipe.tags.map(t => ({ id: t.tags_id, name: t.tag.name }))
    };
    return NextResponse.json(formattedRecipe);

} catch (error) {
return NextResponse.json({ error: 'Failed to fetch recipe details' }, { status: 500 });
}
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
try {
const resolvedParams = await params;
const recipeId = parseInt(resolvedParams.id, 10);
const body = await request.json();

    await prisma.$transaction(async (tx) => {
      await tx.recipe.update({
        where: { id: recipeId },
        data: { name: body.name, category: body.category, image: body.image, how_to_make: body.how_to_make }
      });
      await tx.recipeIngredient.deleteMany({ where: { recipes_id: recipeId } });
      await tx.recipeTool.deleteMany({ where: { recipes_id: recipeId } });
      await tx.recipeTag.deleteMany({ where: { recipes_id: recipeId } });

      if (body.ingredients?.length) {
        await tx.recipeIngredient.createMany({
          data: body.ingredients.map((i: any) => ({ recipes_id: recipeId, ingredients_id: parseInt(i.id), amount: i.amount }))
        });
      }
      if (body.tools?.length) {
        await tx.recipeTool.createMany({
          data: body.tools.map((tId: string) => ({ recipes_id: recipeId, tools_id: parseInt(tId) }))
        });
      }
      if (body.tags?.length) {
        await tx.recipeTag.createMany({
          data: body.tags.map((tId: string) => ({ recipes_id: recipeId, tags_id: parseInt(tId) }))
        });
      }
    });
    return NextResponse.json({ success: true });

} catch (error) {
return NextResponse.json({ error: 'Failed to update recipe' }, { status: 500 });
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
return NextResponse.json({ error: 'Failed to delete recipe' }, { status: 500 });
}
}

## STEP 5: レシピ詳細ポップアップの修正 (src/components/overlays/recipes/RecipeDetailPopup.tsx)

データ構造の変更と改行表示（whitespace-pre-wrap）に対応させます。該当ファイルを以下の内容で完全に上書きしてください。

'use client';

import { useState, useEffect } from 'react';

type RecipeDetail = {
id: string;
category: string;
categoryName: string;
name: string;
image: string;
ingredients: { id: number; name: string; amount: string }[];
tools: { id: number; name: string }[];
how_to_make: string[];
tags: { id: number; name: string }[];
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
if (res.ok) setRecipe(await res.json());
} catch (err) {
console.error(err);
} finally {
setIsLoading(false);
}
};
fetchDetail();
}, [recipeId]);

const handleCloseClick = () => setIsClosing(true);
const handleAnimationEnd = () => { if (isClosing) onClose(); };

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
alert('通信エラーが発生しました');
setIsDeleting(false);
setShowDeleteConfirm(false);
}
};

return (
<div
className={`fixed top-0 right-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] left-0 z-[70] flex flex-col bg-white shadow-lg ${isClosing ? 'animate-slide-out-right' : 'animate-slide-in-right'}`}
onAnimationEnd={handleAnimationEnd} >
{showDeleteConfirm && (
<div className="absolute inset-0 z-[80] bg-black/40 flex items-center justify-center p-4">
<div className="bg-white rounded-md p-6 w-full max-w-sm flex flex-col items-center shadow-xl animate-scale-in-center">
<p className="text-main-font font-bold mb-2">本当に削除しますか？</p>
<p className="text-[12px] text-red-500 mb-6 text-center leading-relaxed font-bold">
※献立カレンダーに登録されている場合、<br />該当の献立からも削除されます。
</p>
<div className="flex gap-4 w-full">
<button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-2 border border-normal-gray rounded-md text-gray-500 font-bold active:bg-gray-100" disabled={isDeleting}>いいえ</button>
<button onClick={handleDelete} className="flex-1 py-2 bg-red-500 text-white rounded-md font-bold active:bg-red-600 disabled:opacity-50 flex justify-center items-center" disabled={isDeleting}>
{isDeleting ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : 'はい'}
</button>
</div>
</div>
</div>
)}

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

      <div className="bg-thin-gray flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex justify-center items-center h-full">
             <div className="w-10 h-10 border-4 border-normal-gray border-t-main-green rounded-full animate-spin"></div>
          </div>
        ) : recipe ? (
          <div className="bg-white rounded-md shadow-sm border border-thin-gray overflow-hidden">
            <div className="relative aspect-[4/3] bg-white flex justify-center items-center border-b border-thin-gray p-4">
              <span className="absolute top-4 left-4 bg-gray-300 text-white text-[12px] font-bold px-2 py-0.5 rounded-sm z-10">
                {recipe.categoryName}
              </span>
              {recipe.image ? (
                <img src={recipe.image} alt={recipe.name} className="w-full h-full object-contain max-w-[200px] max-h-[200px]" />
              ) : (
                <span className="text-[14px] font-bold text-gray-400">NO IMAGE</span>
              )}
            </div>

            <div className="p-4 flex flex-col gap-6">
              <div>
                <h3 className="text-[16px] font-bold border-l-[4px] border-main-green pl-2 mb-2 text-main-font">材料</h3>
                <hr className="border-t-[1.5px] border-dotted border-main-green mb-3" />
                <ul className="text-[14px] text-main-font flex flex-col gap-1 pl-1">
                  {recipe.ingredients.length > 0 ? (
                    recipe.ingredients.map((item, idx) => <li key={idx}>・ {item.name} {item.amount ? `（${item.amount}）` : ''}</li>)
                  ) : (
                    <li className="text-gray-400">登録なし</li>
                  )}
                </ul>
              </div>

              <div>
                <h3 className="text-[16px] font-bold border-l-[4px] border-main-green pl-2 mb-2 text-main-font">道具</h3>
                <hr className="border-t-[1.5px] border-dotted border-main-green mb-3" />
                <ul className="text-[14px] text-main-font flex flex-col gap-1 pl-1">
                  {recipe.tools.length > 0 ? (
                    recipe.tools.map((item, idx) => <li key={idx}>・ {item.name}</li>)
                  ) : (
                    <li className="text-gray-400">登録なし</li>
                  )}
                </ul>
              </div>

              <div>
                <h3 className="text-[16px] font-bold border-l-[4px] border-main-green pl-2 mb-2 text-main-font">作り方</h3>
                <hr className="border-t-[1.5px] border-dotted border-main-green mb-3" />
                <ol className="text-[14px] text-main-font flex flex-col gap-2 pl-1">
                  {recipe.how_to_make.length > 0 ? (
                    recipe.how_to_make.map((step, idx) => (
                      <li key={idx} className="flex gap-2 items-start">
                        <span className="font-bold shrink-0">{idx + 1}.</span>
                        <span className="flex-1 whitespace-pre-wrap break-words leading-relaxed">{step}</span>
                      </li>
                    ))
                  ) : (
                    <li className="text-gray-400">登録なし</li>
                  )}
                </ol>
              </div>

              <div className="pt-2">
                <p className="text-main-green text-[12px] font-bold leading-relaxed break-words">
                  {recipe.tags.map(t => `#${t.name}`).join(' ')}
                </p>
              </div>

              <div className="flex gap-4 pt-4 mt-2">
                <button onClick={() => onEdit(recipe.id)} className="flex-1 py-3 bg-white border border-main-green text-main-green font-bold text-[14px] rounded-md shadow-[0_2px_0_var(--color-main-green)] active:translate-y-[2px] active:shadow-none transition-all">
                  編集する
                </button>
                <button onClick={() => setShowDeleteConfirm(true)} className="flex-1 py-3 bg-white border border-main-green text-main-green font-bold text-[14px] rounded-md shadow-[0_2px_0_var(--color-main-green)] active:translate-y-[2px] active:shadow-none transition-all">
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

## STEP 6: レシピ編集・追加ポップアップの作成 (src/components/overlays/recipes/RecipeEditPopup.tsx)

UIの挙動とボタンデザインをすべてご指定の要件に統一したコンポーネントです。
src/components/overlays/recipes/ 内に RecipeEditPopup.tsx を新規作成し、以下のコードを記述してください。

'use client';

import { useState, useEffect } from 'react';
import RadioButton from '@/components/ui/RadioButton';
import CheckboxButton from '@/components/ui/CheckboxButton';
import SelectBox from '@/components/ui/SelectBox';
import MiniButton from '@/components/ui/MiniButton';

type MasterData = {
ingredients: { id: number; name: string }[];
tools: { id: number; name: string }[];
tags: { id: number; name: string }[];
};

type Props = {
recipeId?: string;
onClose: () => void;
onSuccess: (type: 'add' | 'edit', newId?: string) => void;
};

const CAT_TO_ID: Record<string, string> = { '主食': '1', '主菜': '2', '副菜': '3', '汁物': '4', 'その他': '5' };
const ID_TO_CAT: Record<string, string> = { '1': '主食', '2': '主菜', '3': '副菜', '4': '汁物', '5': 'その他' };

// 共通ボタンクラス（幅をフィットさせ、中央寄せで配置するためのスタイル）
const actionButtonClass = "w-fit text-main-green text-[14px] font-bold border border-main-green bg-white rounded-md px-6 py-2 shadow-[0_2px_0_var(--color-main-green)] active:translate-y-[2px] active:shadow-none transition-all flex justify-center items-center gap-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";

export default function RecipeEditPopup({ recipeId, onClose, onSuccess }: Props) {
const [isClosing, setIsClosing] = useState(false);
const [isLoading, setIsLoading] = useState(true);
const [isSaving, setIsSaving] = useState(false);

const [masters, setMasters] = useState<MasterData>({ ingredients: [], tools: [], tags: [] });

const [name, setName] = useState('');
const [image, setImage] = useState('');
const [categoryName, setCategoryName] = useState('');

const [ingredients, setIngredients] = useState<{id: string, amount: string}[]>([]);
const [tools, setTools] = useState<{id: string}[]>([]);
const [steps, setSteps] = useState<string[]>([]);

const [newIngId, setNewIngId] = useState('');
const [newIngAmount, setNewIngAmount] = useState('');
const [newToolId, setNewToolId] = useState('');
const [newStep, setNewStep] = useState('');
const [editingStepIndex, setEditingStepIndex] = useState<number | null>(null);

const [selectedTags, setSelectedTags] = useState<string[]>([]);
const [isTagExpanded, setIsTagExpanded] = useState(false);

useEffect(() => {
const fetchData = async () => {
try {
const masterRes = await fetch('/api/master');
if (masterRes.ok) setMasters(await masterRes.json());

        if (recipeId) {
          const detailRes = await fetch(`/api/recipes/${recipeId}`);
          if (detailRes.ok) {
            const data = await detailRes.json();
            setName(data.name);
            setImage(data.image);
            setCategoryName(ID_TO_CAT[data.category] || '');
            if (data.ingredients?.length) setIngredients(data.ingredients.map((i:any) => ({id: String(i.id), amount: i.amount})));
            if (data.tools?.length) setTools(data.tools.map((t:any) => ({id: String(t.id)})));
            if (data.how_to_make?.length) setSteps(data.how_to_make);
            if (data.tags?.length) setSelectedTags(data.tags.map((t:any) => String(t.id)));
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();

}, [recipeId]);

const handleCloseClick = () => setIsClosing(true);
const handleAnimationEnd = () => { if (isClosing) onClose(); };

const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
const file = e.target.files?.[0];
if (!file) return;
const localUrl = URL.createObjectURL(file);
setImage(localUrl);
};

const handleAddIngredient = () => {
if (!newIngId) return;
setIngredients([...ingredients, { id: newIngId, amount: newIngAmount }]);
setNewIngId('');
setNewIngAmount('');
};
const removeIngredient = (idx: number) => setIngredients(ingredients.filter((\_, i) => i !== idx));

const handleAddTool = () => {
if (!newToolId) return;
setTools([...tools, { id: newToolId }]);
setNewToolId('');
};
const removeTool = (idx: number) => setTools(tools.filter((\_, i) => i !== idx));

const handleAddStep = () => {
if (newStep.trim() === '') return;
setSteps([...steps, newStep.trim()]);
setNewStep('');
};
const removeStep = (idx: number) => setSteps(steps.filter((\_, i) => i !== idx));
const saveEditedStep = (idx: number, value: string) => {
const newArr = [...steps];
newArr[idx] = value;
setSteps(newArr);
};

const toggleTag = (id: string) => {
setSelectedTags(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
};

const handleMasterAlert = () => alert('マスタ管理画面への遷移は後続フェーズで実装します');

const handleSave = async () => {
if (!name.trim() || !categoryName) {
alert('レシピ名と分類は必須項目です');
return;
}

    setIsSaving(true);
    const validTools = tools.map(t => t.id);
    const categoryId = CAT_TO_ID[categoryName];

    const payload = {
      name,
      category: categoryId,
      image,
      ingredients,
      tools: validTools,
      how_to_make: steps,
      tags: selectedTags
    };

    try {
      const url = recipeId ? `/api/recipes/${recipeId}` : '/api/recipes';
      const method = recipeId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        onSuccess(recipeId ? 'edit' : 'add', recipeId || data.id);
      } else {
        alert('保存に失敗しました');
        setIsSaving(false);
      }
    } catch (err) {
      alert('通信エラーが発生しました');
      setIsSaving(false);
    }

};

const ingredientOptions = masters.ingredients.map(m => ({ value: String(m.id), label: m.name }));
const toolOptions = masters.tools.map(m => ({ value: String(m.id), label: m.name }));

return (
<div
className={`fixed top-0 right-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] left-0 z-[80] flex flex-col bg-white shadow-lg ${isClosing ? 'animate-slide-out-right' : 'animate-slide-in-right'}`}
onAnimationEnd={handleAnimationEnd} >
<div className="border-b border-normal-gray relative z-10 flex h-14 shrink-0 items-center bg-white px-4">
<button onClick={handleCloseClick} className="z-10 -ml-2 p-2 active:opacity-50">
<svg width="12" height="19" viewBox="0 0 12 19" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M11.5 16.8636L3.64286 10.3182L11.5 2.13636L9.92857 0.5L0.5 10.3182L9.92857 18.5L11.5 16.8636Z" fill="#669966"/>
</svg>
</button>
<h2 className="text-main-font pointer-events-none absolute inset-0 flex items-center justify-center text-[18px] font-bold">
{recipeId ? `${name}を編集` : 'レシピを新規追加'}
</h2>
</div>

      <div className="bg-thin-gray flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex justify-center items-center h-40">
            <div className="w-8 h-8 border-4 border-normal-gray border-t-main-green rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="bg-white rounded-md p-4 shadow-sm flex flex-col gap-6 mb-4">

            {/* レシピ名 */}
            <div>
              <h3 className="text-[14px] font-bold border-l-[4px] border-main-green pl-2 mb-2">レシピ名 <span className="text-red-500 text-[10px]">※必須</span></h3>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full border border-main-green rounded-sm px-3 py-2 text-[14px] text-main-font outline-none focus:ring-1 focus:ring-main-green" placeholder="例: 美味しいカレー" />
            </div>

            {/* レシピ画像 */}
            <div>
              <h3 className="text-[14px] font-bold border-l-[4px] border-main-green pl-2 mb-2">レシピ画像</h3>
              <div className="flex flex-col gap-2 items-start">
                 <label className={actionButtonClass}>
                  <span className="text-[16px] leading-none">+</span> アップロード
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                 </label>
                 {image && (
                   <div className="flex items-center gap-2 mt-1">
                     <span className="text-[10px] text-gray-500 font-bold bg-gray-100 px-2 py-1 rounded-sm">✓ 画像選択済み</span>
                     <button onClick={() => setImage('')} className="text-[10px] text-red-500 border border-red-500 px-2 py-1 rounded-sm">クリア</button>
                   </div>
                 )}
              </div>
            </div>

            {/* 分類 */}
            <div>
              <h3 className="text-[14px] font-bold border-l-[4px] border-main-green pl-2 mb-2">分類 <span className="text-red-500 text-[10px]">※必須</span></h3>
              <div className="flex flex-wrap gap-2">
                {['主食', '主菜', '副菜', '汁物', 'その他'].map(cat => (
                  <RadioButton key={cat} label={cat} isSelected={categoryName === cat} onClick={() => setCategoryName(cat)} />
                ))}
              </div>
            </div>

            {/* 材料 */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-[14px] font-bold border-l-[4px] border-main-green pl-2">材料</h3>
                <button onClick={handleMasterAlert} className="bg-main-green text-white text-[10px] px-2 py-1 rounded-sm font-bold">＋ 新規追加</button>
              </div>
              <hr className="border-t-[1.5px] border-dotted border-main-green mb-3" />
              <div className="flex flex-col gap-3">
                <div className="flex gap-2 items-center">
                  <div className="flex-1">
                    <SelectBox value={newIngId} onChange={setNewIngId} options={ingredientOptions} placeholder="選択してください" />
                  </div>
                  <input type="text" value={newIngAmount} onChange={(e) => setNewIngAmount(e.target.value)} placeholder="分量" className="w-20 border border-main-green rounded-sm px-2 py-1.5 text-[12px] text-main-font outline-none focus:ring-1 focus:ring-main-green" />
                </div>
                <div className="flex justify-center">
                  <button onClick={handleAddIngredient} disabled={!newIngId} className={actionButtonClass}>
                    <span className="text-[16px] leading-none">+</span> 追加する
                  </button>
                </div>

                {ingredients.length > 0 && (
                  <div className="mt-2 flex flex-col">
                    {ingredients.map((ing, idx) => {
                      const mName = masters.ingredients.find(m => String(m.id) === ing.id)?.name || '';
                      return (
                        <div key={idx} className="flex items-center justify-between py-2 border-b border-dotted border-main-green last:border-none">
                          <span className="text-[12px] font-bold text-main-font">{mName} {ing.amount ? `（${ing.amount}）` : ''}</span>
                          <MiniButton label="削除" onClick={() => removeIngredient(idx)} />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* 道具 */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-[14px] font-bold border-l-[4px] border-main-green pl-2">道具</h3>
                <button onClick={handleMasterAlert} className="bg-main-green text-white text-[10px] px-2 py-1 rounded-sm font-bold">＋ 新規追加</button>
              </div>
              <hr className="border-t-[1.5px] border-dotted border-main-green mb-3" />
              <div className="flex flex-col gap-3">
                <div>
                  <SelectBox value={newToolId} onChange={setNewToolId} options={toolOptions} placeholder="選択してください" />
                </div>
                <div className="flex justify-center">
                  <button onClick={handleAddTool} disabled={!newToolId} className={actionButtonClass}>
                    <span className="text-[16px] leading-none">+</span> 追加する
                  </button>
                </div>

                {tools.length > 0 && (
                  <div className="mt-2 flex flex-col">
                    {tools.map((tool, idx) => {
                      const mName = masters.tools.find(m => String(m.id) === tool.id)?.name || '';
                      return (
                        <div key={idx} className="flex items-center justify-between py-2 border-b border-dotted border-main-green last:border-none">
                          <span className="text-[12px] font-bold text-main-font">{mName}</span>
                          <MiniButton label="削除" onClick={() => removeTool(idx)} />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* 作り方 */}
            <div>
              <h3 className="text-[14px] font-bold border-l-[4px] border-main-green pl-2 mb-2">作り方 <span className="text-red-500 text-[10px]">※必須</span></h3>
              <hr className="border-t-[1.5px] border-dotted border-main-green mb-3" />

              <div className="flex flex-col gap-3">
                <textarea
                  value={newStep}
                  onChange={(e) => setNewStep(e.target.value)}
                  className="w-full border border-main-green rounded-sm px-3 py-2 text-[14px] text-main-font outline-none focus:ring-1 focus:ring-main-green"
                  rows={3}
                  placeholder="作り方を入力"
                ></textarea>
                <div className="flex justify-center">
                  <button onClick={handleAddStep} disabled={!newStep.trim()} className={actionButtonClass}>
                    <span className="text-[16px] leading-none">+</span> 追加する
                  </button>
                </div>
              </div>

              {steps.length > 0 && (
                <div className="mt-4 flex flex-col gap-0 border-t border-main-green border-dotted">
                  {steps.map((step, idx) => (
                    <div key={idx} className="flex items-start py-3 border-b border-dotted border-main-green gap-2 min-h-[44px]">
                      <span className="font-bold text-[12px] shrink-0 mt-1">{idx + 1}.</span>
                      {editingStepIndex === idx ? (
                        <div className="flex-1 flex gap-2 items-start">
                          <textarea
                            value={step}
                            onChange={(e) => saveEditedStep(idx, e.target.value)}
                            className="flex-1 border border-main-green rounded-sm px-2 py-1 text-[12px] text-main-font outline-none focus:ring-1 focus:ring-main-green resize-none overflow-hidden"
                            rows={step.split('\n').length || 1}
                          />
                          <button
                            onClick={() => setEditingStepIndex(null)}
                            disabled={step.trim() === ''}
                            className="border border-main-green text-main-green text-[10px] font-bold px-3 py-1.5 rounded-sm bg-white shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            完了
                          </button>
                        </div>
                      ) : (
                        <>
                          <span className="flex-1 text-[12px] text-main-font leading-relaxed whitespace-pre-wrap break-words mt-1">{step}</span>
                          <div className="flex gap-1 shrink-0 mt-1">
                            <MiniButton label="編集" onClick={() => setEditingStepIndex(idx)} />
                            <MiniButton label="削除" onClick={() => removeStep(idx)} />
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* タグ */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-[14px] font-bold border-l-[4px] border-main-green pl-2">タグ</h3>
                <button onClick={handleMasterAlert} className="bg-main-green text-white text-[10px] px-2 py-1 rounded-sm font-bold">＋ 新規追加</button>
              </div>
              <hr className="border-t-[1.5px] border-dotted border-main-green mb-3" />
              <div className="flex flex-col gap-2">
                 {masters.tags.length === 0 ? (
                   <p className="text-[12px] text-gray-500 text-center py-4">タグが登録されていません</p>
                 ) : (
                   <>
                     <div className={`flex flex-wrap gap-2 overflow-hidden ${isTagExpanded ? '' : 'max-h-[68px]'}`}>
                       {masters.tags.map(t => (
                         <CheckboxButton key={t.id} label={t.name} isSelected={selectedTags.includes(String(t.id))} onClick={() => toggleTag(String(t.id))} />
                       ))}
                     </div>
                     {masters.tags.length > 5 && (
                       <button onClick={() => setIsTagExpanded(!isTagExpanded)} className="text-[12px] text-main-green font-bold w-full flex justify-center items-center gap-1 mt-3">
                         {isTagExpanded ? 'タグを隠す' : '更にタグを表示する'}
                         {isTagExpanded ? <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M5 0L10 8H0L5 0Z" fill="#669966"/></svg> : <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M5 8L0 0H10L5 8Z" fill="#669966"/></svg>}
                       </button>
                     )}
                   </>
                 )}
              </div>
            </div>

          </div>
        )}
      </div>

      <div className="p-4 bg-white shrink-0 border-t border-thin-gray shadow-[0_-2px_10px_rgba(0,0,0,0.02)] z-10 relative">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full bg-main-green text-white font-bold py-3 rounded-md shadow-[0_3px_0_var(--color-dark-green)] active:translate-y-[3px] active:shadow-none transition-all text-[14px] flex justify-center items-center disabled:opacity-50"
        >
          {isSaving ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : '保存する'}
        </button>
      </div>
    </div>

);
}

## STEP 7: レシピ一覧画面 (src/app/recipes/page.tsx) の完全上書き

該当ファイルを以下のコードで完全に上書きしてください。

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
className="flex-1 bg-white border border-main-green rounded-sm px-3 py-2 text-[14px] outline-none focus:ring-1 focus:ring-main-green text-main-font"
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
                  isSelected ? 'bg-main-green text-white border-main-green' : 'bg-white text-gray-500 border-normal-gray'
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

## STEP 8: 動作確認

1. **画面遷移とUIの確認:** レシピ一覧画面から「レシピ追加」ボタンを押下し、ポップアップが開くことを確認します。セレクトボックスやラジオボタンなどのUIが共通モジュールになっており、各テキスト入力枠の線が緑色（border-main-green）に統一されていることを確認します。
2. **画像アップロードの確認:** 「＋アップロード」ボタンを押し、ローカルの画像ファイルが選択でき、画像のサムネイルと「✓ 画像選択済み」の表示が画面上に反映されることを確認します。
3. **材料・道具の追加・削除の確認:** セレクトボックスを展開し、マスタデータ（シードで投入した「にんじん」「包丁」など）が選択できることを確認します。項目を選び（材料は分量も入力し）「＋追加する」ボタンを押すと、下部にリストとして追加され、削除ボタンで消えることを確認します。
4. **作り方の追加・編集・削除と改行の確認:** 作り方のテキストエリアに改行を含めてテキストを入力し「＋追加する」ボタンを押すと、下部にリスト（連番付き）が生成され、改行が保持されて表示されることを確認します。
5. **作り方の編集とボタン非活性の確認:** 追加された作り方の「編集」ボタンを押し、表示の高さが変わらずにテキストエリアに切り替わることを確認します。文字を完全に空にすると「完了」ボタンが半透明になり押せなくなること、入力すると再度押せるようになることを確認します。
6. **タグの表示確認:** DBにタグが存在しない場合は「タグが登録されていません」と表示され、存在する場合はチェックボックスのリストが表示されることを確認します。
7. **保存ボタンのレイアウトと保存機能の確認:** 保存ボタンがフッターのナビゲーションバーのすぐ上に隙間なく固定されていることを確認します。必須項目を入力して保存ボタンを押し、一覧画面に新しいレシピが追加されることを確認します。
