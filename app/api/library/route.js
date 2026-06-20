import { NextResponse } from 'next/server';
import { getContents, deleteContent } from '@/lib/db';

export async function GET() {
  const contents = await getContents();
  // 按创建时间倒序
  contents.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  return NextResponse.json({ success: true, data: contents });
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: '缺少 ID' }, { status: 400 });
    }
    await deleteContent(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
