import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ type: string; id: string }> },
) {
  try {
    const resolvedParams = await params;
    const type = resolvedParams.type;
    const id = parseInt(resolvedParams.id, 10);
    const body = await request.json();

    let result;
    if (type === 'ingredients') {
      result = await prisma.ingredient.update({
        where: { id },
        data: { name: body.name, quantity: body.quantity },
      });
    } else if (type === 'tools') {
      result = await prisma.tool.update({
        where: { id },
        data: { name: body.name, quantity: body.quantity },
      });
    } else if (type === 'tags') {
      result = await prisma.tag.update({
        where: { id },
        data: { name: body.name },
      });
    } else {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return NextResponse.json({ error: '更新に失敗しました' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ type: string; id: string }> },
) {
  try {
    const resolvedParams = await params;
    const type = resolvedParams.type;
    const id = parseInt(resolvedParams.id, 10);

    if (type === 'ingredients') {
      await prisma.ingredient.delete({ where: { id } });
    } else if (type === 'tools') {
      await prisma.tool.delete({ where: { id } });
    } else if (type === 'tags') {
      await prisma.tag.delete({ where: { id } });
    } else {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.code === 'P2003') {
      return NextResponse.json(
        { error: 'このデータはレシピで使用されているため削除できません。' },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: '削除に失敗しました' }, { status: 500 });
  }
}
