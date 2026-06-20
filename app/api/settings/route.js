import { NextResponse } from 'next/server';
import { getStyleSettings, saveStyleSettings } from '@/lib/db';

export async function GET() {
  const settings = await getStyleSettings();
  return NextResponse.json({ success: true, data: settings });
}

export async function POST(request) {
  try {
    const body = await request.json();
    await saveStyleSettings(body);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
