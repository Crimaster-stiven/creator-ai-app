import { NextResponse } from 'next/server';
import { generateVlogScript, generateOralScript, generateTitlesAndTags } from '@/lib/ai';
import { getStyleSettings, getTopics, updateTopic, addContent, addUsedAngle } from '@/lib/db';

export const runtime = 'nodejs';
export const maxDuration = 120;

export async function POST(request) {
  try {
    const body = await request.json();
    const { topicId, contentType, apiKey } = body; // contentType: 'vlog' | 'oral'

    const allTopics = await getTopics();
    const topic = allTopics.find((t) => t.id === topicId);
    if (!topic) {
      return NextResponse.json({ success: false, error: '选题不存在' }, { status: 404 });
    }

    const settings = await getStyleSettings();

    // 更新选题状态为生成中
    await updateTopic(topicId, { status: 'generating' });

    let generated;
    if (contentType === 'vlog') {
      generated = await generateVlogScript({ topic, userSettings: settings, apiKey });
    } else {
      generated = await generateOralScript({ topic, userSettings: settings, apiKey });
    }

    // 生成标题和标签
    const bodyText = JSON.stringify(generated);
    const titlesAndTags = await generateTitlesAndTags({
      content: bodyText,
      contentType,
      apiKey,
    });

    // 保存到文案库
    const contentRecord = await addContent({
      topicId,
      topicTitle: topic.title,
      contentType,
      title: generated.title || topic.title,
      body: generated,
      titles: titlesAndTags.titles || generated.titleVariants || [],
      hashtags: titlesAndTags.hashtags || generated.hashtags || [],
      status: 'draft',
    });

    // 记录已用的切入角度
    if (topic.angle) {
      await addUsedAngle(topic.angle);
    }

    // 更新选题状态
    await updateTopic(topicId, { status: 'generated' });

    return NextResponse.json({
      success: true,
      data: {
        content: contentRecord,
        generated,
        titlesAndTags,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
