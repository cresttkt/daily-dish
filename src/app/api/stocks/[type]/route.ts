import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> },
) {
  try {
    const resolvedParams = await params;
    const type = resolvedParams.type; // 'ingredients' | 'tools' | 'tags'
    const body = await request.json();

    let result;
    if (type === 'ingredients') {
      result = await prisma.ingredient.create({
        data: { name: body.name, quantity: body.quantity || '0' },
      });
    } else if (type === 'tools') {
      result = await prisma.tool.create({
        data: { name: body.name, quantity: body.quantity || '0' },
      });
    } else if (type === 'tags') {
      result = await prisma.tag.create({ data: { name: body.name } });
    } else {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Stocks POST Error:', error);
    return NextResponse.json({ error: '追加に失敗しました' }, { status: 500 });
  }
}
