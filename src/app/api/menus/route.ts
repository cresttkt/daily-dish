import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

const CATEGORY_MAP: Record<string, string> = {
  '1': '主食',
  '2': '主菜',
  '3': '副菜',
  '4': '汁物',
  '5': 'その他',
};
const MEAL_MAP = { 1: 'breakfast', 2: 'lunch', 3: 'dinner' };
const REVERSE_MEAL_MAP: Record<string, number> = {
  breakfast: 1,
  lunch: 2,
  dinner: 3,
};

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const month = searchParams.get('month');

  if (!month)
    return NextResponse.json(
      { error: 'Month parameter is required' },
      { status: 400 },
    );

  try {
    const menus = await prisma.menu.findMany({
      where: { date: { startsWith: month } },
      include: { recipe: { include: { tags: { include: { tag: true } } } } },
    });

    const result: Record<string, any> = {};

    menus.forEach((menu) => {
      const dateStr = `${menu.date.slice(0, 4)}-${menu.date.slice(4, 6)}-${menu.date.slice(6, 8)}`;
      if (!result[dateStr])
        result[dateStr] = { breakfast: [], lunch: [], dinner: [] };

      const mealKey = MEAL_MAP[menu.meals_id as keyof typeof MEAL_MAP];
      if (mealKey) {
        result[dateStr][mealKey].push({
          id: menu.recipe.id.toString(),
          category: CATEGORY_MAP[menu.recipe.category] || 'その他',
          name: menu.recipe.name,
          image: menu.recipe.image || '',
          tags: menu.recipe.tags.map((rt) => rt.tag.name),
        });
      }
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Failed to fetch menus' },
      { status: 500 },
    );
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
      (recipes as any[]).forEach((r) => {
        if (r.id) {
          newMenus.push({
            date: dbDate,
            meals_id,
            recipes_id: parseInt(r.id, 10),
          });
        }
      });
    });

    await prisma.$transaction([
      prisma.menu.deleteMany({ where: { date: dbDate } }),
      prisma.menu.createMany({ data: newMenus }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Failed to save menus' },
      { status: 500 },
    );
  }
}
