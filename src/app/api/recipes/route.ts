import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

const CATEGORY_MAP: Record<string, string> = {
  '1': '主食',
  '2': '主菜',
  '3': '副菜',
  '4': '汁物',
  '5': 'その他',
};

export async function GET(request: NextRequest) {
  try {
    const recipes = await prisma.recipe.findMany({
      include: { tags: { include: { tag: true } } },
    });
    const formattedRecipes = recipes.map((r) => ({
      id: r.id.toString(),
      category: CATEGORY_MAP[r.category] || 'その他',
      name: r.name,
      image: r.image || '',
      tags: r.tags.map((t) => t.tag.name),
    }));
    const allTags = Array.from(
      new Set(formattedRecipes.flatMap((r) => r.tags)),
    );
    return NextResponse.json({ recipes: formattedRecipes, tags: allTags });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch recipes' },
      { status: 500 },
    );
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
          how_to_make: body.how_to_make || [],
        },
      });
      if (body.ingredients?.length) {
        await tx.recipeIngredient.createMany({
          data: body.ingredients.map((i: any) => ({
            recipes_id: recipe.id,
            ingredients_id: parseInt(i.id),
            amount: i.amount,
          })),
        });
      }
      if (body.tools?.length) {
        await tx.recipeTool.createMany({
          data: body.tools.map((tId: string) => ({
            recipes_id: recipe.id,
            tools_id: parseInt(tId),
          })),
        });
      }
      if (body.tags?.length) {
        await tx.recipeTag.createMany({
          data: body.tags.map((tId: string) => ({
            recipes_id: recipe.id,
            tags_id: parseInt(tId),
          })),
        });
      }
      return recipe;
    });
    return NextResponse.json({ success: true, id: newRecipe.id });
  } catch (error) {
    console.error('Recipe POST Error:', error);
    return NextResponse.json(
      { error: 'Failed to create recipe' },
      { status: 500 },
    );
  }
}
