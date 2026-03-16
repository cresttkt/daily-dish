# 献立カレンダー DB連携 完全版手順書（空保存の確認モーダル追加版）

## STEP 1: 不要ファイルの削除とパッケージのインストール

過去のエラー原因となるキャッシュを消去し、必要なパッケージを確実にインストールします。

1. ターミナルで `Ctrl + C` を押し、ローカルサーバーを完全に停止します。
2. プロジェクト直下の `.next` フォルダを削除します。
3. プロジェクト直下の `.env.local` フォルダがあれば削除します。
4. ターミナルで以下のコマンドを実行します。

npm install pg @prisma/adapter-pg
npm install -D @types/pg @prisma/config tsx typescript @types/node

## STEP 2: 環境変数 (.env) の設定

プロジェクト直下の `.env` を以下の内容にします。（※パスワードの `!` は `%21` に変換し、ポートは5432を使用します）

DATABASE_URL="postgresql://postgres.[あなたのプロジェクトID]:[パスワード(%21変換済)]@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres"
DIRECT_URL="postgresql://postgres.[あなたのプロジェクトID]:[パスワード(%21変換済)]@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres"

## STEP 3: データベーススキーマ (prisma/schema.prisma)

`prisma/schema.prisma` を以下のコードで「完全に上書き」してください。

generator client {
provider = "prisma-client-js"
}

datasource db {
provider = "postgresql"
}

model Menu {
date String @db.Char(8)
meals_id Int
recipes_id Int
recipe Recipe @relation(fields: [recipes_id], references: [id])
@@id([date, meals_id, recipes_id])
@@map("menus")
}
model Recipe {
id Int @id @default(autoincrement())
name String @db.VarChar(255)
category String @db.Char(1)
image String? @db.VarChar(255)
how_to_make Json?
tags RecipeTag[]
ingredients RecipeIngredient[]
tools RecipeTool[]
menus Menu[]
@@map("recipes")
}
model Tag {
id Int @id @default(autoincrement())
name String @db.VarChar(255)
recipes RecipeTag[]
@@map("tags")
}
model Tool {
id Int @id @default(autoincrement())
name String @db.VarChar(255)
quantity String @default("0") @db.Char(1)
recipes RecipeTool[]
@@map("tools")
}
model Ingredient {
id Int @id @default(autoincrement())
name String @db.VarChar(255)
quantity String @default("0") @db.Char(1)
recipes RecipeIngredient[]
@@map("ingredients")
}
model RecipeTag {
recipes_id Int
tags_id Int
recipe Recipe @relation(fields: [recipes_id], references: [id])
tag Tag @relation(fields: [tags_id], references: [id])
@@id([recipes_id, tags_id])
@@map("recipes_tags")
}
model RecipeIngredient {
recipes_id Int
ingredients_id Int
recipe Recipe @relation(fields: [recipes_id], references: [id])
ingredient Ingredient @relation(fields: [ingredients_id], references: [id])
@@id([recipes_id, ingredients_id])
@@map("recipes_ingredients")
}
model RecipeTool {
recipes_id Int
tools_id Int
recipe Recipe @relation(fields: [recipes_id], references: [id])
tool Tool @relation(fields: [tools_id], references: [id])
@@id([recipes_id, tools_id])
@@map("recipes_tools")
}

## STEP 4: CLI設定 (prisma.config.ts)

プロジェクト直下に `prisma.config.ts` を新規作成（または上書き）し、以下のコードを記述してください。

import 'dotenv/config'
import { defineConfig } from '@prisma/config'

export default defineConfig({
schema: 'prisma/schema.prisma',
datasource: {
url: process.env.DIRECT_URL,
},
migrations: {
seed: 'npx tsx prisma/seed.ts',
},
})

## STEP 5: Prismaクライアント (src/lib/prisma.ts)

`src/lib/prisma.ts` を以下のコードで「完全に上書き」してください。

import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const connectionString = process.env.DIRECT_URL;

if (!connectionString) {
throw new Error("❌ DIRECT_URL が設定されていません！");
}

const pool = new Pool({
connectionString,
ssl: {
rejectUnauthorized: false,
},
});

const adapter = new PrismaPg(pool as any);
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
globalForPrisma.prisma ||
new PrismaClient({
adapter,
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;

## STEP 6: シードスクリプト (prisma/seed.ts)

`prisma/seed.ts` を以下のコードで「完全に上書き」してください。

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

const tagHealthy = await prisma.tag.create({ data: { name: 'ヘルシー' } });
const tagEasy = await prisma.tag.create({ data: { name: '簡単' } });
const tagFast = await prisma.tag.create({ data: { name: '時短' } });
const tagMeat = await prisma.tag.create({ data: { name: '肉' } });
const tagFish = await prisma.tag.create({ data: { name: '魚' } });
const tagVeg = await prisma.tag.create({ data: { name: '野菜' } });
const tagSoup = await prisma.tag.create({ data: { name: '汁物' } });
const tagBento = await prisma.tag.create({ data: { name: 'お弁当' } });
const tagJapanese = await prisma.tag.create({ data: { name: '和食' } });
const tagChinese = await prisma.tag.create({ data: { name: '中華' } });

await prisma.recipe.create({
data: {
name: '鶏胸肉のオイマヨ炒め', category: '2',
tags: { create: [{ tags_id: tagFast.id }, { tags_id: tagMeat.id }] }
}
});

await prisma.recipe.create({
data: {
name: '白ご飯', category: '1',
tags: { create: [{ tags_id: tagEasy.id }, { tags_id: tagJapanese.id }] }
}
});

await prisma.recipe.create({
data: {
name: 'ほうれん草の胡麻和え', category: '3',
tags: { create: [{ tags_id: tagHealthy.id }, { tags_id: tagVeg.id }, { tags_id: tagEasy.id }] }
}
});

await prisma.recipe.create({
data: {
name: '豆腐とわかめの味噌汁', category: '4',
tags: { create: [{ tags_id: tagEasy.id }, { tags_id: tagJapanese.id }, { tags_id: tagHealthy.id }, { tags_id: tagSoup.id }] }
}
});

await prisma.recipe.create({
data: {
name: '鮭の塩焼き', category: '2',
tags: { create: [{ tags_id: tagEasy.id }, { tags_id: tagFish.id }, { tags_id: tagJapanese.id }] }
}
});

await prisma.recipe.create({
data: {
name: 'チャーハン', category: '1',
tags: { create: [{ tags_id: tagFast.id }, { tags_id: tagChinese.id }] }
}
});

console.log('✅ テスト用レシピ・タグの投入が完了しました！');
}

main()
.catch((e) => {
console.error(e);
process.exit(1);
})
.finally(async () => {
await prisma.$disconnect();
});

## STEP 7: レシピ取得API (src/app/api/recipes/route.ts)

`src/app/api/recipes/route.ts` を以下のコードで「完全に上書き」してください。

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

const CATEGORY_MAP: Record<string, string> = {
'1': '主食', '2': '主菜', '3': '副菜', '4': '汁物', '5': 'その他'
};

export async function GET() {
try {
const recipes = await prisma.recipe.findMany({
include: { tags: { include: { tag: true } } }
});

    const formattedRecipes = recipes.map(r => ({
      id: r.id.toString(),
      category: CATEGORY_MAP[r.category] || 'その他',
      name: r.name,
      image: r.image || '',
      tags: r.tags.map(rt => rt.tag.name)
    }));

    const tags = await prisma.tag.findMany();
    const tagNames = tags.map(t => t.name);

    return NextResponse.json({ recipes: formattedRecipes, tags: tagNames });

} catch (error) {
console.error(error);
return NextResponse.json({ error: 'Failed to fetch recipes' }, { status: 500 });
}
}

## STEP 8: 献立取得・保存API (src/app/api/menus/route.ts)

`src/app/api/menus/route.ts` を以下のコードで「完全に上書き」してください。

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

const CATEGORY_MAP: Record<string, string> = { '1': '主食', '2': '主菜', '3': '副菜', '4': '汁物', '5': 'その他' };
const MEAL_MAP = { 1: 'breakfast', 2: 'lunch', 3: 'dinner' };
const REVERSE_MEAL_MAP: Record<string, number> = { 'breakfast': 1, 'lunch': 2, 'dinner': 3 };

export async function GET(request: NextRequest) {
const searchParams = request.nextUrl.searchParams;
const month = searchParams.get('month');

if (!month) return NextResponse.json({ error: 'Month parameter is required' }, { status: 400 });

try {
const menus = await prisma.menu.findMany({
where: { date: { startsWith: month } },
include: { recipe: { include: { tags: { include: { tag: true } } } } }
});

    const result: Record<string, any> = {};

    menus.forEach(menu => {
      const dateStr = `${menu.date.slice(0, 4)}-${menu.date.slice(4, 6)}-${menu.date.slice(6, 8)}`;
      if (!result[dateStr]) result[dateStr] = { breakfast: [], lunch: [], dinner: [] };

      const mealKey = MEAL_MAP[menu.meals_id as keyof typeof MEAL_MAP];
      if (mealKey) {
        result[dateStr][mealKey].push({
          id: menu.recipe.id.toString(),
          category: CATEGORY_MAP[menu.recipe.category] || 'その他',
          name: menu.recipe.name,
          image: menu.recipe.image || '',
          tags: menu.recipe.tags.map(rt => rt.tag.name)
        });
      }
    });

    return NextResponse.json(result);

} catch (error) {
console.error(error);
return NextResponse.json({ error: 'Failed to fetch menus' }, { status: 500 });
}
}

export async function POST(request: NextRequest) {
try {
const body = await request.json();
const { date, data } = body;
const dbDate = date.replace(/-/g, '');

    const newMenus: any[] = [];

    Object.entries(data).forEach(([mealKey, recipes]) => {
      const meals_id = REVERSE_MEAL_MAP[mealKey];
      (recipes as any[]).forEach(r => {
        if (r.id) {
          newMenus.push({
            date: dbDate,
            meals_id,
            recipes_id: parseInt(r.id, 10)
          });
        }
      });
    });

    await prisma.$transaction([
      prisma.menu.deleteMany({ where: { date: dbDate } }),
      prisma.menu.createMany({ data: newMenus })
    ]);

    return NextResponse.json({ success: true });

} catch (error) {
console.error(error);
return NextResponse.json({ error: 'Failed to save menus' }, { status: 500 });
}
}

## STEP 9: 献立編集ポップアップUI (src/components/overlays/calendar/MealEditPopup.tsx)

★追加要件（空の場合の確認モーダル）を実装したバージョンです！
`src/components/overlays/calendar/MealEditPopup.tsx` を以下のコードで「完全に上書き」してください。

'use client';

import { useState, useMemo, useEffect } from 'react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import RadioButton from '@/components/ui/RadioButton';
import CheckboxButton from '@/components/ui/CheckboxButton';
import SelectBox from '@/components/ui/SelectBox';
import MiniButton from '@/components/ui/MiniButton';

export type RecipeItem = { id?: string; category: string; name: string; image: string; tags: string[] };
export type DailyMealData = { breakfast: RecipeItem[]; lunch: RecipeItem[]; dinner: RecipeItem[] };

type Props = {
date: Date;
initialData: DailyMealData;
onClose: () => void;
onSave: (updatedData: DailyMealData) => void;
};

export default function MealEditPopup({ date, initialData, onClose, onSave }: Props) {
const [isClosing, setIsClosing] = useState(false);
const [isLoading, setIsLoading] = useState(false);
const [isFetchingRecipes, setIsFetchingRecipes] = useState(true);
const [showEmptyConfirm, setShowEmptyConfirm] = useState(false); // ★ 追加: 空の確認モーダル表示フラグ

const [availableRecipes, setAvailableRecipes] = useState<RecipeItem[]>([]);
const [availableTags, setAvailableTags] = useState<string[]>([]);

const [targetMeal, setTargetMeal] = useState<'breakfast' | 'lunch' | 'dinner'>('breakfast');
const [selectedCategory, setSelectedCategory] = useState('主食');
const [selectedTags, setSelectedTags] = useState<string[]>([]);
const [isTagExpanded, setIsTagExpanded] = useState(false);
const [selectedRecipeName, setSelectedRecipeName] = useState('');

const [errorMessage, setErrorMessage] = useState('');
const [saveErrorMessage, setSaveErrorMessage] = useState('');

const [addedMeals, setAddedMeals] = useState<DailyMealData>(JSON.parse(JSON.stringify(initialData)));
const dateStr = format(date, 'yyyy/MM/dd(E)', { locale: ja });

useEffect(() => {
const fetchRecipes = async () => {
try {
const res = await fetch('/api/recipes');
if (res.ok) {
const data = await res.json();
setAvailableRecipes(data.recipes || []);
setAvailableTags(data.tags || []);
}
} catch (err) {
console.error("Failed to fetch recipes", err);
} finally {
setIsFetchingRecipes(false);
}
};
fetchRecipes();
}, []);

const toggleTag = (tag: string) => setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);

const filteredRecipes = useMemo(() => {
return availableRecipes.filter(recipe => {
const matchCategory = recipe.category === selectedCategory;
const matchTags = selectedTags.length === 0 || selectedTags.every(t => recipe.tags.includes(t));
return matchCategory && matchTags;
});
}, [availableRecipes, selectedCategory, selectedTags]);

const recipeOptions = filteredRecipes.map(r => ({ value: r.name, label: r.name }));

const handleAdd = () => {
if (!selectedRecipeName) { setErrorMessage('レシピを選択してください'); return; }
const recipe = availableRecipes.find(r => r.name === selectedRecipeName);
if (!recipe) return;
setAddedMeals(prev => ({ ...prev, [targetMeal]: [...prev[targetMeal], { ...recipe }] }));
setSelectedRecipeName(''); setErrorMessage(''); setSaveErrorMessage('');
};

const handleDelete = (mealType: 'breakfast' | 'lunch' | 'dinner', index: number) => {
setAddedMeals(prev => ({ ...prev, [mealType]: prev[mealType].filter((\_, i) => i !== index) }));
};

// ★ 変更: 空の場合は確認モーダルを出す処理に変更
const handleSaveClick = () => {
const isAllEmpty = addedMeals.breakfast.length === 0 && addedMeals.lunch.length === 0 && addedMeals.dinner.length === 0;
if (isAllEmpty) {
setShowEmptyConfirm(true);
return;
}
executeSave();
};

// ★ 変更: 実際の保存処理（空の場合もここを通る）
const executeSave = async () => {
setShowEmptyConfirm(false);
setSaveErrorMessage('');
setIsLoading(true);
await onSave(addedMeals);
setIsLoading(false);
};

return (
<div className={`fixed top-0 right-0 left-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-[70] bg-white flex flex-col shadow-lg ${isClosing ? 'animate-slide-out-right' : 'animate-slide-in-right'}`} onAnimationEnd={() => { if(isClosing) onClose(); }}>
{(isLoading || isFetchingRecipes) && (
<div className="absolute inset-0 z-[80] bg-white/60 flex flex-col justify-center items-center">
<div className="w-10 h-10 border-4 border-normal-gray border-t-main-green rounded-full animate-spin"></div>
<p className="text-main-green font-bold text-[12px] mt-3">{isFetchingRecipes ? 'レシピ読込中...' : '保存中...'}</p>
</div>
)}

      {/* ★ 追加: 献立が空の場合の確認モーダル */}
      {showEmptyConfirm && (
        <div className="absolute inset-0 z-[90] bg-black/40 flex justify-center items-center p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-sm flex flex-col items-center shadow-xl">
            <p className="text-main-font text-[14px] font-bold text-center mb-6 leading-relaxed">
              献立が設定されていませんが<br />このまま保存してもよろしいですか？<br/>
              <span className="text-[10px] font-normal text-gray-500">※登録済みの献立もクリアされます</span>
            </p>
            <div className="flex gap-4 w-full">
              <button onClick={() => setShowEmptyConfirm(false)} className="flex-1 py-3 bg-normal-gray text-white font-bold rounded-md text-[14px]">いいえ</button>
              <button onClick={executeSave} className="flex-1 py-3 bg-main-green text-white font-bold rounded-md text-[14px]">はい</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center h-14 px-4 shrink-0 bg-white border-b border-normal-gray relative z-10">
        <button onClick={() => setIsClosing(true)} className="p-2 -ml-2 z-10"><svg width="12" height="19" viewBox="0 0 12 19" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M0.5 10.3182L9.92857 0.5L11.5 2.13636L3.64286 10.3182L11.5 16.8636L9.92857 18.5L0.5 10.3182Z" fill="#669966" stroke="#669966" strokeLinejoin="round"/></svg></button>
        <h2 className="absolute inset-0 flex items-center justify-center text-[18px] font-bold text-main-font pointer-events-none">{dateStr}の献立を編集</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 bg-thin-gray">
        <div className="bg-white p-4 rounded-md shadow-sm flex flex-col gap-6">
          <div className="flex flex-col">
            <h3 className="text-[16px] font-bold border-l-[4px] border-main-green pl-2 mb-2 text-main-font">内容選択</h3>
            <hr className="border-t-[1.5px] border-dotted border-main-green mb-4" />
            <div className="mb-4">
              <p className="text-[12px] font-bold text-main-font mb-2">● 対象</p>
              <div className="flex gap-2">{[{id:'breakfast',label:'朝食'},{id:'lunch',label:'昼食'},{id:'dinner',label:'夕食'}].map(meal => <RadioButton key={meal.id} label={meal.label} isSelected={targetMeal === meal.id} onClick={() => setTargetMeal(meal.id as any)} />)}</div>
            </div>
            <div className="mb-4">
              <p className="text-[12px] font-bold text-main-font mb-2">● 分類</p>
              <div className="flex flex-wrap gap-2">{['主食', '主菜', '副菜', '汁物', 'その他'].map(cat => <RadioButton key={cat} label={cat} isSelected={selectedCategory === cat} onClick={() => { setSelectedCategory(cat); setSelectedRecipeName(''); setErrorMessage(''); }} />)}</div>
            </div>
            <div className="mb-4">
              <p className="text-[12px] font-bold text-main-font mb-2">● タグ選択</p>
              {availableTags.length > 0 ? (
                <div className={`flex flex-wrap gap-2 overflow-hidden ${isTagExpanded ? '' : 'max-h-[68px]'}`}>
                  {availableTags.map(tag => <CheckboxButton key={tag} label={tag} isSelected={selectedTags.includes(tag)} onClick={() => toggleTag(tag)} />)}
                </div>
              ) : (
                <p className="text-[10px] text-gray-400">タグがありません</p>
              )}
              <button onClick={() => setIsTagExpanded(!isTagExpanded)} className="text-[12px] text-main-green font-bold w-full flex justify-center items-center gap-1 mt-3">
                {isTagExpanded ? 'タグを隠す' : '更にタグを表示する'}
                {isTagExpanded ? <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M5 0L10 8H0L5 0Z" fill="#669966"/></svg> : <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M5 8L0 0H10L5 8Z" fill="#669966"/></svg>}
              </button>
            </div>
            <div className="mb-1">
              <p className="text-[12px] font-bold text-main-font mb-2">● レシピ名</p>
              <SelectBox value={selectedRecipeName} onChange={(val) => { setSelectedRecipeName(val); if(val) setErrorMessage(''); }} options={recipeOptions} />
              <div className="h-4 mt-1 px-2">{errorMessage && <p className="text-red-500 text-[10px] font-bold leading-none pt-1">{errorMessage}</p>}</div>
            </div>
            <div className="flex justify-center mt-1">
              <button onClick={handleAdd} className="text-main-green text-[14px] font-bold border border-main-green bg-white rounded-md px-6 py-2 shadow-[0_2px_0_var(--color-main-green)] active:translate-y-[2px] active:shadow-none transition-all flex items-center gap-1"><span className="text-[16px] leading-none">+</span> 追加する</button>
            </div>
          </div>
          <div className="flex flex-col">
            <h3 className="text-[16px] font-bold border-l-[4px] border-main-green pl-2 mb-2 text-main-font">追加済みの献立リスト</h3>
            <hr className="border-t-[1.5px] border-dotted border-main-green mb-4" />
            <div className="flex flex-col gap-6">
              {[{type:'breakfast',title:'朝食',data:addedMeals.breakfast,bgColor:'bg-breakfast',borderColor:'border-red-400'},{type:'lunch',title:'昼食',data:addedMeals.lunch,bgColor:'bg-lunch',borderColor:'border-orange-400'},{type:'dinner',title:'夕食',data:addedMeals.dinner,bgColor:'bg-dinner',borderColor:'border-main-green'}].map(section => (
                <div key={section.type} className="flex flex-col">
                  <p className="text-[12px] font-bold text-main-font mb-2">● {section.title}</p>
                  {section.data.length === 0 ? (<p className="text-[10px] text-gray-400 pl-3">追加されていません</p>) : (
                    <div className={`${section.bgColor} p-3 rounded-md flex flex-col`}>
                      {section.data.map((item, idx) => (
                        <div key={idx} className={`flex items-center gap-2 ${idx !== section.data.length - 1 ? `pb-3 mb-3 border-b-[1.5px] border-dotted ${section.borderColor}` : ''}`}>
                          <span className="text-[10px] bg-white border border-normal-gray px-1 py-[2px] rounded-sm whitespace-nowrap shrink-0 text-main-font font-bold">{item.category}</span>
                          <div className="w-10 h-10 rounded-full overflow-hidden border border-normal-gray shrink-0 bg-normal-gray flex justify-center items-center">
                            {item.image ? <img src={item.image} alt={item.name} className="w-full h-full object-cover" /> : <span className="text-[8px] text-white font-bold leading-tight text-center">NO<br/>IMAGE</span>}
                          </div>
                          <div className="flex flex-col flex-1 min-w-0"><span className="text-[12px] font-bold text-main-font leading-tight truncate">{item.name}</span>{item.tags && item.tags.length > 0 && <span className="text-[9px] text-gray-500 mt-1 truncate">{item.tags.join('、')}</span>}</div>
                          <MiniButton label="削除" onClick={() => handleDelete(section.type as any, idx)} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="p-4 bg-white shrink-0 border-t border-thin-gray shadow-[0_-2px_10px_rgba(0,0,0,0.02)] z-10 relative">
        {saveErrorMessage && (
          <div className="absolute -top-10 left-0 right-0 flex justify-center pointer-events-none">
            <span className="bg-white/90 backdrop-blur-sm border border-red-200 text-red-500 text-[11px] font-bold px-6 py-1.5 rounded-full shadow-[0_2px_4px_rgba(0,0,0,0.05)]">{saveErrorMessage}</span>
          </div>
        )}
        <button onClick={handleSaveClick} className="w-full bg-main-green text-white font-bold py-3 rounded-md shadow-[0_3px_0_var(--color-dark-green)] active:translate-y-[3px] active:shadow-none transition-all text-[14px]">登録する</button>
      </div>
    </div>

);
}

## STEP 10: カレンダーTOP画面UI (src/app/page.tsx)

`src/app/page.tsx` を以下のコードで「完全に上書き」してください。

'use client';

import { useState, useEffect } from 'react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isToday } from 'date-fns';
import { ja } from 'date-fns/locale';
import { useSwipeable } from 'react-swipeable';
import MainButton from '@/components/ui/MainButton';
import SecondButton from '@/components/ui/SecondButton';
import MealConfirmPopup from '@/components/overlays/calendar/MealConfirmPopup';
import MealEditPopup, { DailyMealData } from '@/components/overlays/calendar/MealEditPopup';
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
console.error("Failed to fetch menus", err);
} finally {
setIsLoading(false);
}
};
fetchMenus();
}, [currentDate]);

const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
const resetToToday = () => setCurrentDate(new Date());

const handlers = useSwipeable({ onSwipedLeft: nextMonth, onSwipedRight: prevMonth, preventScrollOnSwipe: true, trackMouse: true });

const monthStart = startOfMonth(currentDate); const monthEnd = endOfMonth(monthStart);
const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }); const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });
const weeksCount = calendarDays.length / 7; const weekDays = ['月', '火', '水', '木', '金', '土', '日'];

const selectedDateStr = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '';
const currentMealData = mealDB[selectedDateStr] || { breakfast: [], lunch: [], dinner: [] };

const handleSaveMeal = async (updatedData: DailyMealData) => {
try {
const res = await fetch('/api/menus', {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({
date: selectedDateStr,
data: updatedData
})
});

      if (res.ok) {
        setMealDB(prev => ({ ...prev, [selectedDateStr]: updatedData }));
        setIsEditing(false);
        setSelectedDate(null);
      } else {
        alert("保存に失敗しました");
      }
    } catch (err) {
      console.error(err);
      alert("通信エラーが発生しました");
    }

};

const handleGeneratedMeal = (data: any) => {
alert(`${data.period === '1day' ? '1日分' : '1週間分'}の献立生成は未実装です`);
setIsAutoGenerating(false);
};

return (
<div className="flex flex-col min-h-full bg-white relative" {...handlers}>
<div className="flex items-center justify-between px-4 py-3 bg-thin-gray">
<div className="flex justify-start flex-1"><SecondButton label="Today" onClick={resetToToday} /></div>
<div className="flex items-center justify-center space-x-2 flex-1">
<button onClick={prevMonth} className="text-main-green text-xl font-bold px-2">◀</button>
<h2 className="text-[18px] font-bold text-main-font whitespace-nowrap">
{format(currentDate, 'yyyy年M月', { locale: ja })}
</h2>
<button onClick={nextMonth} className="text-main-green text-xl font-bold px-2">▶</button>
</div>
<div className="flex justify-end flex-1"><MainButton label="自動生成" iconSrc="/icons/icon_meal.png" onClick={() => setIsAutoGenerating(true)} /></div>
</div>

      <div className="grid grid-cols-7 bg-main-green">
        {weekDays.map(day => <div key={day} className="text-center py-1 text-white text-[12px] font-bold border-r border-[#83b083] last:border-none">{day}</div>)}
      </div>

      <div className="grid grid-cols-7 bg-white h-[64vh] relative" style={{ gridTemplateRows: `repeat(${weeksCount}, minmax(0, 1fr))` }}>
        {isLoading && (
          <div className="absolute inset-0 bg-white/50 flex justify-center items-center z-10">
            <div className="w-8 h-8 border-4 border-normal-gray border-t-main-green rounded-full animate-spin"></div>
          </div>
        )}

        {calendarDays.map((date) => {
          const dateStr = format(date, 'yyyy-MM-dd');
          const isCurrentMonth = isSameMonth(date, currentDate); const isTodayDate = isToday(date); const dayOfWeek = date.getDay();

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
            <div key={dateStr} onClick={() => setSelectedDate(date)} className={`border-b border-r border-normal-gray p-[2px] flex flex-col items-center overflow-hidden ${bgColor} active:bg-thin-gray transition-colors cursor-pointer`}>
              <span className={`text-[12px] font-bold ${textColor}`}>{format(date, 'd')}</span>
              <div className="w-full flex flex-col gap-[2px] mt-1 px-[2px]">
                {tags.map((meal) => {
                  let tagClass = '';
                  if (meal === '朝食') tagClass = 'bg-breakfast text-red-500';
                  if (meal === '昼食') tagClass = 'bg-lunch text-orange-500';
                  if (meal === '夕食') tagClass = 'bg-dinner text-blue-600';
                  return <div key={meal} className={`text-center text-[8px] font-bold rounded-sm w-full ${tagClass}`} style={{ padding: '2px 0', lineHeight: '1' }}>{meal}</div>;
                })}
              </div>
            </div>
          );
        })}
      </div>

      {selectedDate && <MealConfirmPopup date={selectedDate} mealData={currentMealData} onClose={() => setSelectedDate(null)} onEdit={() => setIsEditing(true)} />}
      {selectedDate && isEditing && <MealEditPopup date={selectedDate} initialData={currentMealData} onClose={() => setIsEditing(false)} onSave={handleSaveMeal} />}
      {isAutoGenerating && <MealAutoGeneratePopup onClose={() => setIsAutoGenerating(false)} onGenerate={handleGeneratedMeal} />}
    </div>

);
}

## STEP 11: 実行コマンド

ターミナルで以下のコマンドを上から順番に実行してください。

npx prisma generate
npx prisma db push
npx prisma db seed
npm run dev

「✅ テスト用レシピ・タグの投入が完了しました！」と表示され、サーバーが起動したら完了です。
