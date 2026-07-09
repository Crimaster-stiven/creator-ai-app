import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

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
      max_tokens: 4096,
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
 * 解析小红书笔记链接
 */
function parseXiaohongshuUrl(url) {
  const match = url.match(/explore\/([a-f0-9]+)/);
  const noteId = match ? match[1] : null;
  const tokenMatch = url.match(/xsec_token=([^&]+)/);
  const xsecToken = tokenMatch ? decodeURIComponent(tokenMatch[1]) : null;
  return { noteId, xsecToken };
}

/**
 * 从网页 OG 标签提取笔记信息
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

  if (!res.ok) throw new Error(`页面抓取失败: ${res.status}`);

  const html = await res.text();

  // OG tags
  const og = {};
  const ogRegex = /<meta[^>]*property="og:(\w+)"[^>]*content="([^"]*)"[^>]*>/g;
  let match;
  while ((match = ogRegex.exec(html)) !== null) og[match[1]] = match[2];
  const ogRegex2 = /<meta[^>]*content="([^"]*)"[^>]*property="og:(\w+)"[^>]*>/g;
  while ((match = ogRegex2.exec(html)) !== null) og[match[2]] = match[1];

  const titleMatch = html.match(/<title>(.*?)<\/title>/);
  const rawTitle = titleMatch ? titleMatch[1].replace(/\s*-\s*小红书$/, '') : og.title || '';

  const descMatch = html.match(/<meta[^>]*name="description"[^>]*content="([^"]*)"/);
  const description = descMatch ? descMatch[1] : og.description || '';

  const tags = description
    ? description.split('#').filter(Boolean).map(t => t.trim())
    : [];

  return {
    title: rawTitle,
    description,
    tags,
    coverImage: og.image ? og.image.replace(/^http:/, 'https:') : null,
    videoUrl: og.video ? og.video.replace(/^http:/, 'https:') : null,
    duration: og.videotime || null,
    noteUrl: og.url || pageUrl,
    platform: '小红书',
  };
}

/**
 * 用 RedFox API 获取笔记完整文案
 */
async function fetchRedFoxNoteContent(noteId) {
  const apiKey = process.env.REDFOX_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch(`https://api.redfox.hk/api/v1/note/detail?note_id=${noteId}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'User-Agent': 'Mozilla/5.0',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) return null;

    const data = await res.json();

    // RedFox 返回的笔记详情，提取文案内容
    if (data?.data?.note) {
      const n = data.data.note;
      return {
        fullDescription: n.desc || n.description || null,
        ipLocation: n.ipLocation || null,
        interactCount: n.interactCount || null,
        likes: n.likes || null,
        collects: n.collects || null,
        comments: n.comments || null,
        shares: n.shares || null,
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * AI 分析笔记内容（含完整文案）
 */
async function analyzeNote(note, fullDescription, transcript, apiKey) {
  const contextParts = [];
  contextParts.push(`标题：${note.title}`);
  contextParts.push(`描述/标签：${note.description}`);
  if (fullDescription) contextParts.push(`完整文案：${fullDescription}`);
  if (transcript) contextParts.push(`视频口播转录：${transcript}`);
  contextParts.push(`视频时长：${note.duration || '未知'}`);

  const prompt = `你是一个专业的内容分析助手和自媒体创作顾问。

请分析以下小红书笔记的全部内容：

${contextParts.join('\n')}

请按 JSON 格式输出分析结果（只输出 JSON，不要用 markdown 代码块）：

{
  "summary": "内容摘要（30字以内，概括核心看点）",
  "targetAudience": "目标受众画像",
  "hookAnalysis": "开头钩子分析：它是如何吸引人的",
  "contentStructure": "内容结构拆解",
  "scriptHighlights": "脚本亮点：口播文案中值得学习的话术、节奏或表达技巧",
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
    const { url, apiKey, transcript, noteText } = body;

    if (!url) {
      return NextResponse.json({ success: false, error: '请提供小红书笔记链接' }, { status: 400 });
    }

    const { noteId, xsecToken } = parseXiaohongshuUrl(url);
    if (!noteId) {
      return NextResponse.json({ success: false, error: '无法识别的小红书链接格式' }, { status: 400 });
    }

    // 并行抓取：OG标签 + RedFox 文案
    const [note, redFoxData] = await Promise.all([
      scrapeXiaohongshuNote(noteId, xsecToken),
      fetchRedFoxNoteContent(noteId),
    ]);

    // 合并 RedFox 数据
    const fullDescription = redFoxData?.fullDescription || null;
    const interactionData = redFoxData ? {
      likes: redFoxData.likes,
      collects: redFoxData.collects,
      comments: redFoxData.comments,
      shares: redFoxData.shares,
    } : null;

    // AI 分析（带完整文案 + 可选转录）
    // AI 分析（完整文案优先：RedFox > 用户粘贴 > 无）
  const analysis = await analyzeNote(note, fullDescription || noteText || null, transcript || null, apiKey);

    return NextResponse.json({
      success: true,
      data: {
        note: {
          ...note,
          fullDescription,
          interactionData,
        },
        analysis,
        // 返回视频 URL 方便本地转录
        videoUrl: note.videoUrl,
        noteId,
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
