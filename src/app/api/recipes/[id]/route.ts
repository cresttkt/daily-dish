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

    if (!recipe)
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });

    const formattedRecipe = {
      id: recipe.id.toString(),
      category: recipe.category,
      categoryName: CATEGORY_MAP[recipe.category] || 'その他',
      name: recipe.name,
      image: recipe.image || '',
      how_to_make: recipe.how_to_make || [],
      ingredients: recipe.ingredients.map((i) => ({
        id: i.ingredients_id,
        name: i.ingredient.name,
        amount: (i as any).amount || '',
      })),
      tools: recipe.tools.map((t) => ({ id: t.tools_id, name: t.tool.name })),
      tags: recipe.tags.map((t) => ({ id: t.tags_id, name: t.tag.name })),
    };
    return NextResponse.json(formattedRecipe);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch recipe details' },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const resolvedParams = await params;
    const recipeId = parseInt(resolvedParams.id, 10);
    const body = await request.json();

    await prisma.$transaction(async (tx) => {
      await tx.recipe.update({
        where: { id: recipeId },
        data: {
          name: body.name,
          category: body.category,
          image: body.image,
          how_to_make: body.how_to_make,
        },
      });
      await tx.recipeIngredient.deleteMany({ where: { recipes_id: recipeId } });
      await tx.recipeTool.deleteMany({ where: { recipes_id: recipeId } });
      await tx.recipeTag.deleteMany({ where: { recipes_id: recipeId } });

      if (body.ingredients?.length) {
        await tx.recipeIngredient.createMany({
          data: body.ingredients.map((i: any) => ({
            recipes_id: recipeId,
            ingredients_id: parseInt(i.id),
            amount: i.amount,
          })),
        });
      }
      if (body.tools?.length) {
        await tx.recipeTool.createMany({
          data: body.tools.map((tId: string) => ({
            recipes_id: recipeId,
            tools_id: parseInt(tId),
          })),
        });
      }
      if (body.tags?.length) {
        await tx.recipeTag.createMany({
          data: body.tags.map((tId: string) => ({
            recipes_id: recipeId,
            tags_id: parseInt(tId),
          })),
        });
      }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update recipe' },
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
    await prisma.$transaction([
      prisma.recipeIngredient.deleteMany({ where: { recipes_id: recipeId } }),
      prisma.recipeTool.deleteMany({ where: { recipes_id: recipeId } }),
      prisma.recipeTag.deleteMany({ where: { recipes_id: recipeId } }),
      prisma.menu.deleteMany({ where: { recipes_id: recipeId } }),
      prisma.recipe.delete({ where: { id: recipeId } }),
    ]);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete recipe' },
      { status: 500 },
    );
  }
}
