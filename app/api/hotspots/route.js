import { NextResponse } from 'next/server';
import { collectHotspots } from '@/lib/hotspots';

export const runtime = 'nodejs';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const dateStr = searchParams.get('date');

    let forDate = null;
    if (dateStr) {
      const parts = dateStr.split('-');
      forDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    }

    const hotspots = await collectHotspots(forDate);
    return NextResponse.json({ success: true, data: hotspots, date: dateStr || 'today' });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
