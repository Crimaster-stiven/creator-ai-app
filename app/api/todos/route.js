import { NextResponse } from 'next/server';
import { getTodos, addTodo, updateTodo, deleteTodo } from '@/lib/db';

export async function GET() {
  const todos = await getTodos();
  return NextResponse.json({ success: true, data: todos });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const todo = await addTodo(body);
    return NextResponse.json({ success: true, data: todo });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;
    if (!id) return NextResponse.json({ success: false, error: '缺少 ID' }, { status: 400 });
    const result = await updateTodo(id, updates);
    if (!result) return NextResponse.json({ success: false, error: '待办不存在' }, { status: 404 });
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: '缺少 ID' }, { status: 400 });
    await deleteTodo(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
