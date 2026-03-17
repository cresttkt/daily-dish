import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { addDays, format } from 'date-fns';

const TARGET_MEALS = ['breakfast', 'lunch', 'dinner'];
const MEAL_ID_MAP: Record<string, number> = {
  breakfast: 1,
  lunch: 2,
  dinner: 3,
};

const MEAL_RULES: Record<string, Record<string, number>> = {
  breakfast: { '1': 1, '2': 1, '4': 0 },
  lunch: { '1': 1, '2': 1, '4': 1 },
  dinner: { '1': 1, '2': 1, '3': 2, '4': 1 },
};

function calculateScore(
  recipe: any,
  usedRecipeIds: Set<number>,
  mustIncludeIds: Set<number>,
): number {
  let score = 0;
  if (mustIncludeIds.has(recipe.id)) score += 1000;
  if (usedRecipeIds.has(recipe.id)) score -= 500;
  return score;
}

export async function POST(request: NextRequest) {
  try {
    const {
      startDate,
      period,
      mustIncludeRecipeIds = [],
      excludeDates = [],
    } = await request.json();

    const daysCount = period === '1week' ? 7 : 1;
    const start = new Date(startDate);

    const targetDates: string[] = [];
    for (let i = 0; i < daysCount; i++) {
      const d = addDays(start, i);
      const dateDash = format(d, 'yyyy-MM-dd'); // フロントエンドから来る除外日フォーマット
      const dateDb = format(d, 'yyyyMMdd'); // DB保存用フォーマット

      // UIで設定された「除外日」に含まれていない日付だけを生成対象にする
      if (!excludeDates.includes(dateDash)) {
        targetDates.push(dateDb);
      }
    }

    const allRecipes = await prisma.recipe.findMany();
    const existingMenus = await prisma.menu.findMany({
      where: { date: { in: targetDates } },
    });

    const usedRecipeIds = new Set<number>();
    const mustIncludeIds = new Set<number>(mustIncludeRecipeIds.map(Number));

    existingMenus.forEach((m) => usedRecipeIds.add(m.recipes_id));

    const newMenusToSave: any[] = [];

    for (const dateStr of targetDates) {
      const dailyExisting = existingMenus.filter((m) => m.date === dateStr);

      for (const mealType of TARGET_MEALS) {
        const mealId = MEAL_ID_MAP[mealType];
        const existingInThisMeal = dailyExisting.filter(
          (m) => m.meals_id === mealId,
        );
        const rules = MEAL_RULES[mealType];

        for (const [categoryId, requiredCount] of Object.entries(rules)) {
          const existingCount = existingInThisMeal.filter((m) => {
            const recipe = allRecipes.find((r) => r.id === m.recipes_id);
            return recipe?.category === categoryId;
          }).length;

          const neededCount = requiredCount - existingCount;

          if (neededCount > 0) {
            const candidates = allRecipes.filter(
              (r) => r.category === categoryId,
            );
            const scoredCandidates = candidates
              .map((r) => ({
                recipe: r,
                score: calculateScore(r, usedRecipeIds, mustIncludeIds),
              }))
              .sort((a, b) => {
                if (b.score !== a.score) return b.score - a.score;
                return Math.random() - 0.5;
              });

            for (
              let i = 0;
              i < neededCount && i < scoredCandidates.length;
              i++
            ) {
              const selectedRecipe = scoredCandidates[i].recipe;
              newMenusToSave.push({
                date: dateStr,
                meals_id: mealId,
                recipes_id: selectedRecipe.id,
              });
              usedRecipeIds.add(selectedRecipe.id);
              mustIncludeIds.delete(selectedRecipe.id);
            }
          }
        }
      }
    }

    if (newMenusToSave.length > 0) {
      await prisma.menu.createMany({ data: newMenusToSave });
    }

    return NextResponse.json({ success: true, count: newMenusToSave.length });
  } catch (error) {
    console.error('Generate API Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate menus' },
      { status: 500 },
    );
  }
}
