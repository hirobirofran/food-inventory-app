import { NextResponse } from 'next/server';
import { addFood, getFoods } from '@/lib/sheets';

export async function GET() {
  try {
    const foods = await getFoods();
    return NextResponse.json(foods);
  } catch (error) {
    console.error('GET /api/foods error:', error);
    return NextResponse.json({ error: 'Failed to fetch foods' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const food = await addFood(data);
    return NextResponse.json(food, { status: 201 });
  } catch (error) {
    console.error('POST /api/foods error:', error);
    return NextResponse.json({ error: 'Failed to add food' }, { status: 500 });
  }
}
