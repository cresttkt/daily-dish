import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const [ingredients, tools, tags] = await Promise.all([
      prisma.ingredient.findMany({ orderBy: { id: 'asc' } }),
      prisma.tool.findMany({ orderBy: { id: 'asc' } }),
      prisma.tag.findMany({ orderBy: { id: 'asc' } }),
    ]);
    return NextResponse.json({ ingredients, tools, tags });
  } catch (error) {
    console.error('Master GET Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch master data' },
      { status: 500 },
    );
  }
}
