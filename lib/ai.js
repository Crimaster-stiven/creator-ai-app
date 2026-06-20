/**
 * AI 能力集成层
 * 默认使用 DeepSeek API（性价比最高），也支持切换其他模型
 */

const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

// 获取 API Key：优先使用传入的 key，其次从环境变量读取
function getApiKey(customKey) {
  return customKey || process.env.DEEPSEEK_API_KEY || process.env.NEXT_PUBLIC_DEEPSEEK_API_KEY || '';
}

// 调用 DeepSeek API
async function callDeepSeek(messages, options = {}) {
  const apiKey = getApiKey(options.apiKey);
  if (!apiKey) {
    throw new Error('请先配置 DeepSeek API Key（在设置页面输入或在 .env.local 中配置）');
  }

  const response = await fetch(DEEPSEEK_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: options.model || 'deepseek-chat',
      messages,
      temperature: options.temperature ?? 0.8,
      max_tokens: options.maxTokens || 4096,
      ...options.extra,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`AI API 调用失败: ${response.status} ${error}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// ========== 选题推荐 ==========

export async function recommendTopics({ hotspots, userSettings, recentTopics, apiKey }) {
  const systemPrompt = `你是资深自媒体内容总监，尤其熟悉小红书、抖音、B站的内容生态。你的核心能力是：
1. 分析热点数据，洞察内容趋势
2. 结合创作者的个人定位，推荐最合适的选题
3. 确保推荐的选题有差异化，避免同质化

请严格按照要求的格式输出。`;

  const usedTopicsText = recentTopics.length > 0
    ? `\n【近期已做过的选题（请避免重复）】\n${recentTopics.map((t) => `- ${t.title}`).join('\n')}`
    : '';

  const userPrompt = `【今日热点】\n${hotspots}

【我的内容方向】
- Vlog（日常生活记录）：占比 ${userSettings.vlogRatio || 50}%
- 个人成长口播（认知提升/自律/学习方法/心态建设）：占比 ${userSettings.oralRatio || 50}%

【我的风格偏好】${userSettings.style || '真诚、亲切、有生活感'}
【语言风格】${userSettings.tone || '轻松自然'}${usedTopicsText}

请按以下 JSON 格式输出 10 个选题推荐（不要添加其他内容，只输出 JSON）：

{
  "topics": [
    {
      "title": "选题标题",
      "type": "hotspot | differentiated | evergreen",
      "contentType": "vlog | oral",
      "heatRating": "★★★★★",
      "angle": "具体的切入角度",
      "whyWorks": "为什么这个选题能火",
      "referenceHashtags": ["#标签1", "#标签2"],
      "briefOutline": "50字左右的内容概述"
    }
  ]
}

分类说明：
- hotspot：蹭今天的热点，趁热做
- differentiated：大家都在做A，你从B角度切入，差异化竞争
- evergreen：长青选题，不过时，适合没热点时备用`;

  const result = await callDeepSeek([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ], { temperature: 0.8, apiKey });

  // 解析 JSON
  try {
    // 尝试从 markdown 代码块中提取
    const jsonMatch = result.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonStr = jsonMatch ? jsonMatch[1] : result;
    return JSON.parse(jsonStr.trim());
  } catch {
    // 如果解析失败，返回原始内容
    return { topics: [], raw: result };
  }
}

// ========== Vlog 脚本生成 ==========

export async function generateVlogScript({ topic, userSettings, apiKey }) {
  const systemPrompt = `你是一位资深短视频导演和编剧，擅长小红书风格的 Vlog 创作。
你的输出必须结构清晰、实操性强，让创作者拿到就能照着拍。
特别注重故事的叙事感和配音旁白的感染力。`;

  const userPrompt = `【选题】${topic.title}
【选题描述】${topic.description || topic.angle || ''}
【创作者风格】${userSettings.style || '真诚、亲切、有生活感'}

请按以下 JSON 格式输出完整 Vlog 脚本（只输出 JSON）：

{
  "title": "视频标题（吸引人）",
  "overview": "100字以内的视频核心看点",
  "duration": "总时长（如：2分30秒）",
  "storyNarration": "完整的故事配音文案（300-500字）。用第一人称讲述，像在跟朋友聊天一样自然，有开头/发展/高潮/结尾的故事结构，包含情感起伏和个人感悟，可以直接用来给视频配音",
  "script": [
    {
      "scene": 1,
      "duration": "时长（如：15s）",
      "shotType": "景别（远景/全景/中景/近景/特写）",
      "cameraMove": "运镜方式（固定/推/拉/摇/跟/环绕等）",
      "visual": "画面描述",
      "narration": "旁白/对话内容（要贴合故事文案，但更简短精炼，适合口播）",
      "notes": "拍摄注意事项"
    }
  ],
  "shootingTips": {
    "location": "推荐拍摄场地",
    "props": "推荐道具",
    "lighting": "光线建议"
  },
  "bgm": ["BGM1风格（注明情绪节奏）", "BGM2风格"],
  "coverSuggestion": "封面文案和画面建议",
  "hashtags": ["#标签1", "#标签2"],
  "titleVariants": ["标题1", "标题2", "标题3"]
}

要求：
- 总时长控制在 1-3 分钟
- 故事文案要有「开头悬念 → 发展过程 → 情绪高潮 → 结尾感悟」的完整结构
- 开头 5 秒必须有钩子（hook），让人想知道发生了什么
- 叙事要真实、有细节、有画面感，避免说教
- 语言风格像朋友聊天，口语化，自然
- 脚本数量 6-12 个分镜，每个分镜的旁白要写出具体台词
- 脚本数量 6-12 个分镜
- 每个分镜的旁白要写出具体台词，不能只写方向`;

  const result = await callDeepSeek([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ], { temperature: 0.7, maxTokens: 4096 });

  // 解析 JSON
  try {
    const jsonMatch = result.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonStr = jsonMatch ? jsonMatch[1] : result;
    return JSON.parse(jsonStr.trim());
  } catch {
    return { raw: result };
  }
}

// ========== 口播文案生成 ==========

export async function generateOralScript({ topic, userSettings, apiKey }) {
  const systemPrompt = `你是一个擅长个人成长类内容的文案策划，你的文案风格：
1. 真诚有力量，不说教
2. 开头有钩子，中间有金句，结尾有共鸣
3. 结构清晰，适合口播`;

  const userPrompt = `【选题】${topic.title}
【选题描述】${topic.description || topic.angle || ''}
【创作者风格】${userSettings.style || '真诚、亲切、有生活感'}

请按以下 JSON 格式输出完整口播文案（只输出 JSON）：

{
  "title": "视频标题（吸引人点击）",
  "hook": "开头3秒钩子，让人忍不住听下去",
  "body": [
    {
      "section": 1,
      "content": "段落正文",
      "tone": "语气标注（💬正常 ⚡重点 💡金句）",
      "duration": "预计口播时长"
    }
  ],
  "keyQuotes": ["金句1", "金句2", "金句3"],
  "endingGuide": "结尾互动引导",
  "titleVariants": ["标题变体1", "标题变体2", "标题变体3", "标题变体4", "标题变体5"],
  "hashtags": ["#标签1", "#标签2"],
  "deliveryTips": "口播表演建议（语速、情绪、肢体语言等）"
}

要求：
- 总时长控制在 2-3 分钟
- 每 30 秒至少一个金句（方便截图传播）
- 开头必须有钩子
- 语言自然口语化，适合说出来，不是书面语
- 结尾要有互动引导（点赞/评论/关注）`;

  const result = await callDeepSeek([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ], { temperature: 0.7, maxTokens: 4096 });

  // 解析 JSON
  try {
    const jsonMatch = result.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonStr = jsonMatch ? jsonMatch[1] : result;
    return JSON.parse(jsonStr.trim());
  } catch {
    return { raw: result };
  }
}

// ========== 标题 + 标签生成 ==========

export async function generateTitlesAndTags({ content, contentType, apiKey }) {
  const systemPrompt = '你是小红书/抖音爆款标题和标签专家。';

  const userPrompt = `请为以下${contentType === 'vlog' ? 'Vlog' : '口播'}内容生成标题和标签。

【内容】${content.slice(0, 1000)}

请按 JSON 格式输出（只输出 JSON）：
{
  "titles": ["标题1", "标题2", "标题3", "标题4", "标题5", "标题6", "标题7", "标题8", "标题9", "标题10"],
  "hashtags": ["#标签1", "#标签2", "#标签3", "#标签4", "#标签5", "#标签6", "#标签7", "#标签8"]
}

要求：
- 标题要有吸引力，包含数字或痛点或好奇点
- 标题控制在 20 字以内
- 标签要覆盖：内容相关 + 热门话题 + 垂直领域`;

  const result = await callDeepSeek([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ], { temperature: 0.6, maxTokens: 2048 });

  try {
    const jsonMatch = result.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonStr = jsonMatch ? jsonMatch[1] : result;
    return JSON.parse(jsonStr.trim());
  } catch {
    return { titles: [], hashtags: [], raw: result };
  }
}
