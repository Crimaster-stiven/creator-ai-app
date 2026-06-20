import { NextResponse } from 'next/server';
import { recommendTopics } from '@/lib/ai';
import { collectHotspots, formatHotspotsForAI } from '@/lib/hotspots';
import { getTopics, getStyleSettings, addTopic } from '@/lib/db';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const apiKey = body.apiKey || '';

    // 1. 获取热点
    const hotspots = await collectHotspots();
    const hotspotsText = formatHotspotsForAI(hotspots);

    // 2. 获取用户设置和近期选题
    const settings = await getStyleSettings();
    const allTopics = await getTopics();
    const recentTopics = allTopics.slice(-20);

    // 3. AI 推荐选题
    const result = await recommendTopics({
      hotspots: hotspotsText,
      userSettings: settings,
      recentTopics,
      apiKey,
    });

    // 4. 自动保存到选题库
    if (result.topics && Array.isArray(result.topics)) {
      for (const topic of result.topics) {
        await addTopic({
          title: topic.title,
          description: topic.briefOutline || topic.whyWorks || '',
          type: topic.contentType || 'vlog',
          sourceType: 'ai_recommended',
          status: 'pending',
          heatRating: topic.heatRating || '★★★',
          angle: topic.angle || '',
          referenceHashtags: topic.referenceHashtags || [],
          whyWorks: topic.whyWorks || '',
        });
      }
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
