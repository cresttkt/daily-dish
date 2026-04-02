import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

const CATEGORY_MAP: Record<string, string> = {
  '1': '主食',
  '2': '主菜',
  '3': '副菜',
  '4': '汁物',
  '5': 'その他',
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const resolvedParams = await params;
    const recipeId = parseInt(resolvedParams.id, 10);

    const recipe = await prisma.recipe.findUnique({
      where: { id: recipeId },
      include: {
        ingredients: { include: { ingredient: true } },
        tools: { include: { tool: true } },
        tags: { include: { tag: true } },
      },
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
      ingredients: recipe.ingredients.map((i) => i.ingredient.name),
      tools: recipe.tools.map((t) => t.tool.name),
      tags: recipe.tags.map((t) => t.tag.name),
    };

    return NextResponse.json(formattedRecipe);
  } catch (error) {
    console.error('Recipe Detail GET Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recipe details' },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const resolvedParams = await params;
    const recipeId = parseInt(resolvedParams.id, 10);

    // トランザクションで関連データをすべて削除。献立(menu)テーブルのデータも消去する。
    await prisma.$transaction([
      prisma.recipeIngredient.deleteMany({ where: { recipes_id: recipeId } }),
      prisma.recipeTool.deleteMany({ where: { recipes_id: recipeId } }),
      prisma.recipeTag.deleteMany({ where: { recipes_id: recipeId } }),
      prisma.menu.deleteMany({ where: { recipes_id: recipeId } }), // カレンダー側の献立連携データを削除
      prisma.recipe.delete({ where: { id: recipeId } }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Recipe DELETE Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete recipe' },
      { status: 500 },
    );
  }
}
