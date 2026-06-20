import { NextResponse } from 'next/server';
import { getTopics, addTopic, updateTopic, deleteTopic } from '@/lib/db';

export async function GET() {
  const topics = await getTopics();
  return NextResponse.json({ success: true, data: topics });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const topic = await addTopic(body);
    return NextResponse.json({ success: true, data: topic });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;
    const result = await updateTopic(id, updates);
    if (!result) {
      return NextResponse.json({ success: false, error: '选题不存在' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: '缺少 ID' }, { status: 400 });
    }
    await deleteTopic(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
