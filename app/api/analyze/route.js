import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

async function callDeepSeek(messages, apiKey) {
  const key = apiKey || process.env.DEEPSEEK_API_KEY || '';
  if (!key) throw new Error('请先配置 DeepSeek API Key');

  const res = await fetch(DEEPSEEK_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages,
      temperature: 0.7,
      max_tokens: 2048,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`AI API 调用失败: ${res.status}`);
  }

  const data = await res.json();
  return data.choices[0].message.content;
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { title, platform, apiKey } = body;

    if (!title) {
      return NextResponse.json({ success: false, error: '缺少标题' }, { status: 400 });
    }

    const platformName = {
      xiaohongshu: '小红书',
      douyin: '抖音',
      bilibili: 'B站',
      baidu: '百度',
    }[platform] || platform;

    const result = await callDeepSeek([
      {
        role: 'system',
        content: '你是一个专业的内容分析助手。根据给定的热点标题和平台，分析该内容可能的结构、看点、值得学习的创作技巧。输出格式为 JSON。',
      },
      {
        role: 'user',
        content: `请分析以下在【${platformName}】上的热门内容：

标题：${title}
平台：${platformName}

请按 JSON 格式输出分析结果（只输出 JSON）：
{
  "summary": "内容摘要（50字以内，概括核心看点）",
  "targetAudience": "目标受众",
  "keyPoints": ["分论点1", "分论点2", "分论点3"],
  "hookAnalysis": "开头钩子分析：它是如何吸引人的",
  "structure": "内容结构分析",
  "styleFeatures": ["创作技巧1", "创作技巧2"],
  "whyPopular": "为什么这个内容能火",
  "yourAngle": "你可以借鉴的角度"
}`,
      },
    ]);

    // 解析 JSON
    let parsed;
    try {
      const jsonMatch = result.match(/```(?:json)?\s*([\s\S]*?)```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : result;
      parsed = JSON.parse(jsonStr.trim());
    } catch {
      parsed = { summary: result.slice(0, 100), raw: result };
    }

    return NextResponse.json({ success: true, data: parsed });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
