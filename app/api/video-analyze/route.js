import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 30;

const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

async function callDeepSeek(messages, apiKey) {
  const key = apiKey || process.env.DEEPSEEK_API_KEY || '';
  if (!key) throw new Error('请先配置 DeepSeek API Key（在设置页面或环境变量中）');

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

/**
 * 解析小红书笔记链接，提取 note_id 和 xsec_token
 */
function parseXiaohongshuUrl(url) {
  const match = url.match(/explore\/([a-f0-9]+)/);
  const noteId = match ? match[1] : null;

  // 提取 xsec_token
  const tokenMatch = url.match(/xsec_token=([^&]+)/);
  const xsecToken = tokenMatch ? decodeURIComponent(tokenMatch[1]) : null;

  return { noteId, xsecToken };
}

/**
 * 从小红书网页 OG 标签中提取笔记信息
 */
async function scrapeXiaohongshuNote(noteId, xsecToken) {
  const pageUrl = xsecToken
    ? `https://www.xiaohongshu.com/explore/${noteId}?xsec_token=${encodeURIComponent(xsecToken)}&xsec_source=pc_user`
    : `https://www.xiaohongshu.com/explore/${noteId}`;

  const res = await fetch(pageUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml',
      ...(xsecToken ? { Cookie: `xsec_token=${xsecToken}` } : {}),
    },
  });

  if (!res.ok) {
    throw new Error(`页面抓取失败: ${res.status}`);
  }

  const html = await res.text();

  // 解析 OG 标签
  const og = {};
  const ogRegex = /<meta[^>]*property="og:(\w+)"[^>]*content="([^"]*)"[^>]*>/g;
  let match;
  while ((match = ogRegex.exec(html)) !== null) {
    og[match[1]] = match[2];
  }
  // 反向属性顺序
  const ogRegex2 = /<meta[^>]*content="([^"]*)"[^>]*property="og:(\w+)"[^>]*>/g;
  while ((match = ogRegex2.exec(html)) !== null) {
    og[match[2]] = match[1];
  }

  // 提取标题（去掉后缀）
  const titleMatch = html.match(/<title>(.*?)<\/title>/);
  const rawTitle = titleMatch ? titleMatch[1].replace(/\s*-\s*小红书$/, '') : og.title || '';

  // 提取描述/标签
  const descMatch = html.match(/<meta[^>]*name="description"[^>]*content="([^"]*)"/);
  const description = descMatch ? descMatch[1] : og.description || '';

  // 解析标签（#号分割）
  const tags = description
    ? description.split('#').filter(Boolean).map(t => t.trim())
    : [];

  // 封面图处理（转 https）
  const coverImage = og.image ? og.image.replace(/^http:/, 'https:') : null;

  // 视频链接
  const videoUrl = og.video ? og.video.replace(/^http:/, 'https:') : null;

  return {
    title: rawTitle,
    description,
    tags,
    coverImage,
    videoUrl,
    duration: og.videotime || null,
    noteUrl: og.url || pageUrl,
    platform: '小红书',
  };
}

/**
 * AI 分析笔记内容
 */
async function analyzeNote(note, apiKey) {
  const prompt = `你是一个专业的内容分析助手和自媒体创作顾问。

请分析以下小红书笔记：

标题：${note.title}
描述/标签：${note.description}
视频时长：${note.duration || '未知'}

请按 JSON 格式输出分析结果（只输出 JSON，不要用 markdown 代码块）：

{
  "summary": "内容摘要（30字以内，概括核心看点）",
  "targetAudience": "目标受众画像",
  "hookAnalysis": "开头钩子分析：它是如何吸引人的",
  "contentStructure": "内容结构拆解",
  "whyPopular": "🔥 为什么这个内容能火（分析爆款原因）",
  "yourAngle": "💡 你可以借鉴的角度（结合自媒体创作者身份，给出具体选题建议）",
  "suggestedTitle": "基于此内容风格，建议一个你可以创作的类似选题标题",
  "tags": ["推荐3-5个相关标签"]
}`;

  const result = await callDeepSeek([
    {
      role: 'system',
      content: '你是一个专业的内容分析助手。直接输出 JSON，不要 markdown 包裹。',
    },
    { role: 'user', content: prompt },
  ], apiKey);

  // 解析 JSON
  try {
    const jsonMatch = result.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonStr = jsonMatch ? jsonMatch[1] : result;
    return JSON.parse(jsonStr.trim());
  } catch {
    return { summary: result.slice(0, 100) };
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { url, apiKey } = body;

    if (!url) {
      return NextResponse.json({ success: false, error: '请提供小红书笔记链接' }, { status: 400 });
    }

    // 解析 URL
    const { noteId, xsecToken } = parseXiaohongshuUrl(url);
    if (!noteId) {
      return NextResponse.json({ success: false, error: '无法识别的小红书链接格式' }, { status: 400 });
    }

    // 抓取笔记信息
    const note = await scrapeXiaohongshuNote(noteId, xsecToken);

    // AI 分析
    const analysis = await analyzeNote(note, apiKey);

    return NextResponse.json({
      success: true,
      data: {
        note,
        analysis,
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
