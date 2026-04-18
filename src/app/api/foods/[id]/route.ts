import { NextResponse } from 'next/server';
import { deleteFood, updateFood } from '@/lib/sheets';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await request.json();
    const food = await updateFood(id, data);
    return NextResponse.json(food);
  } catch (error) {
    console.error('PUT /api/foods/[id] error:', error);
    return NextResponse.json({ error: 'Failed to update food' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await deleteFood(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/foods/[id] error:', error);
    return NextResponse.json({ error: 'Failed to delete food' }, { status: 500 });
  }
}
