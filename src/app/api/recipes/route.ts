import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

const CATEGORY_MAP: Record<string, string> = {
  '1': '主食',
  '2': '主菜',
  '3': '副菜',
  '4': '汁物',
  '5': 'その他',
};

export async function GET() {
  try {
    const recipes = await prisma.recipe.findMany({
      include: { tags: { include: { tag: true } } },
    });

    const formattedRecipes = recipes.map((r) => ({
      id: r.id.toString(),
      category: CATEGORY_MAP[r.category] || 'その他',
      name: r.name,
      image: r.image || '',
      tags: r.tags.map((rt) => rt.tag.name),
    }));

    const tags = await prisma.tag.findMany();
    const tagNames = tags.map((t) => t.name);

    return NextResponse.json({ recipes: formattedRecipes, tags: tagNames });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Failed to fetch recipes' },
      { status: 500 },
    );
  }
}
