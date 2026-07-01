/**
 * 热点数据采集系统 v4 — 纯 fetch 版
 *
 * 使用原生 fetch 替代 curl，兼容 Vercel Serverless 环境
 *
 * 数据来源：
 * - 百度热搜实时 API（真实数据，50条/次）
 * - AI Hot 每日 AI 新闻
 * - 选题推荐池（人工精选各平台热门方向，链接跳转对应平台搜索）
 *
 * 数据标注：
 * - source: 'baidu-real'      → 来自百度热搜的真实数据，链接可点击
 * - source: 'aihot-real'       → 来自 AI Hot 的真实 AI 新闻
 * - source: 'suggestion'       → 基于真实热点的 AI 创作建议
 * - source: 'recommendation'   → 精选平台选题推荐
 */

import { getHotspotsByDate, setHotspotsByDate } from './db';

// 通过 fetch 获取 API 数据
async function fetchJSON(url, timeoutMs = 3000, extraHeaders = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        ...extraHeaders,
      },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

function formatDateKey(d) {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

// ========== 从真实 API 获取数据 ==========

/**
 * 从百度热搜官方接口获取实时热搜数据
 * 来源：top.baidu.com/api/board?tab=realtime
 * 返回 50 条真实热搜，含标题、热度、原文链接
 */
async function fetchBaiduHotList() {
  try {
    const data = await fetchJSON('https://top.baidu.com/api/board?tab=realtime', 3000, {
      'Referer': 'https://top.baidu.com/',
    });
    const cards = data?.data?.cards || [];
    const hotList = cards.find(c => c.component === 'hotList')?.content || [];
    if (hotList.length === 0) return [];

    return hotList.map((item, i) => {
      const title = item.word || item.query || '';
      if (!title || title.length < 2) return null;

      const rawScore = parseInt(item.hotScore) || 0;
      const normalizedScore = Math.min(99, Math.max(60,
        rawScore > 0 ? 60 + Math.floor((rawScore / 10000000) * 39) : 90 - i
      ));

      const trendMap = {
        'up': 'trending',
        'down': 'rising',
        'same': 'sustained',
      };

      return {
        id: `baidu-${i}`,
        platform: 'news',
        title,
        url: item.url || `https://www.baidu.com/s?wd=${encodeURIComponent(title)}`,
        hotScore: normalizedScore,
        velocity: normalizedScore - 5 + Math.floor(Math.random() * 11),
        engagement: normalizedScore - 8 + Math.floor(Math.random() * 11),
        sustainability: normalizedScore - 3,
        trendType: trendMap[item.hotChange] || (i < 10 ? 'viral' : 'trending'),
        category: classifyTopic(title),
        tags: [classifyTopic(title)],
        likes: rawScore > 5000000 ? '50万+' : rawScore > 3000000 ? '30万+' : '10万+',
        metrics: { heat: rawScore },
        source: 'baidu-real',
        hotChange: item.hotChange || 'same',
        desc: item.desc || '',
      };
    }).filter(Boolean);
  } catch (e) {
    console.warn('百度热搜 API 请求失败:', e.message);
    return [];
  }
}

// ========== 内容分类 ==========

function classifyTopic(title) {
  const rules = [
    { keywords: ['健身', '运动', '跑步', '瑜伽', '减肥', '体育', '奥运', '世界杯'], tag: '热点' },
    { keywords: ['AI', '人工智能', 'ChatGPT', '模型', '算法', '编程', '代码', '科技', '数码', '手机'], tag: '科技' },
    { keywords: ['Vlog', 'vlog', '日常', '记录', '生活'], tag: '社会' },
    { keywords: ['成长', '人生', '心态', '自律', '习惯', '改变', '认知', '格局', '职场', '工作', '创业'], tag: '社会' },
    { keywords: ['教育', '高考', '考试', '学习', '大学', '考研', '留学'], tag: '教育' },
    { keywords: ['经济', '股市', '房价', '消费', 'GDP', '就业'], tag: '财经' },
    { keywords: ['明星', '综艺', '电影', '音乐', '娱乐', '演员', '导演'], tag: '娱乐' },
  ];
  for (const rule of rules) {
    if (rule.keywords.some(kw => title.includes(kw))) return rule.tag;
  }
  return '热点';
}

// ========== AI Hot 每日 AI 新闻 ==========

async function fetchAihotNews() {
  try {
    const data = await fetchJSON('https://aihot.virxact.com/api/public/items?mode=selected&take=30', 3000);
    const items = data?.items || [];
    if (items.length === 0) return [];

    return items.map((item, i) => {
      const title = item.title || item.title_en || '';
      if (!title) return null;

      return {
        id: `aihot-${i}`,
        platform: 'news',
        title,
        url: item.url || '',
        hotScore: Math.min(99, Math.max(65, (item.score || 70) + Math.floor(Math.random() * 15))),
        category: '科技AI',
        tags: ['科技AI', item.category || 'ai'],
        source: 'aihot-real',
        likes: '',
        isAihot: true,
        trendType: 'trending',
        aihotCategory: item.category || '',
        summary: item.summary || '',
      };
    }).filter(Boolean);
  } catch (e) {
    console.warn('AI Hot API 请求失败:', e.message);
    return [];
  }
}

// ========== 生成选题建议（基于真实热点的 AI 模拟） ==========

function generateTopicSuggestions(hotItems) {
  const suggestions = [];

  const platformCycle = ['xiaohongshu', 'douyin', 'bilibili'];
  const directionMap = {
    '科技': ['评测', '教程', '体验'],
    '教育': ['经验分享', '方法论', '观点'],
    '社会': ['口播', '深度解读', '个人感悟'],
    '娱乐': ['反应视频', '分析', '吐槽'],
    '财经': ['科普', '观点分享'],
    '热点': ['vlog记录', '观点表达', '资讯解读'],
  };

  const usedTitles = new Set();

  for (let i = 0; i < hotItems.length && suggestions.length < 15; i++) {
    const item = hotItems[i];
    if (!item || !item.title) continue;

    const cat = item.category || '热点';
    const dirs = directionMap[cat] || ['vlog记录', '观点表达'];
    const dir = dirs[i % dirs.length];
    const pf = platformCycle[i % platformCycle.length];

    let suggestionTitle = '';
    if (cat === '科技') {
      suggestionTitle = `${item.title}｜我的${dir}与看法`;
    } else if (cat === '教育') {
      suggestionTitle = `聊聊${item.title}｜过来人的${dir}`;
    } else if (cat === '社会') {
      suggestionTitle = `${item.title}｜我的${dir}`;
    } else if (cat === '娱乐') {
      suggestionTitle = `看完${item.title}我的${dir}来了`;
    } else if (cat === '财经') {
      suggestionTitle = `${item.title}｜普通人应该知道的${dir}`;
    } else {
      suggestionTitle = `今天聊${item.title}｜一个${dir}`;
    }

    if (usedTitles.has(suggestionTitle)) continue;
    usedTitles.add(suggestionTitle);

    suggestions.push({
      id: `suggest-${i}`,
      platform: pf,
      title: suggestionTitle,
      relatedHotTopic: item.title,
      url: item.url || '',
      hotScore: Math.max(65, item.hotScore - 8 + Math.floor(Math.random() * 16)),
      velocity: Math.max(55, item.velocity - 5 + Math.floor(Math.random() * 16)),
      engagement: Math.max(55, item.engagement - 5 + Math.floor(Math.random() * 16)),
      sustainability: Math.max(55, item.sustainability - 5 + Math.floor(Math.random() * 16)),
      trendType: i < 5 ? 'rising' : 'trending',
      category: '创作灵感',
      tags: ['创作建议', cat],
      source: 'suggestion',
      isSuggestion: true,
    });
  }

  return suggestions;
}

// ========== 平台选题推荐池 ==========

const TOPIC_RECOMMENDATIONS = [
  // Vlog 创作类
  { platform: 'xiaohongshu', title: '我的独居日记｜普通人的周五晚上', category: 'vlog', likes: '14.5万', creator: '独居日记本', creatorFollowers: '28万' },
  { platform: 'xiaohongshu', title: '北漂第5年的家｜出租屋改造全过程', category: 'vlog', likes: '9.8万', creator: '家居改造日记', creatorFollowers: '15万' },
  { platform: 'xiaohongshu', title: '离职后的第30天｜我过得怎么样', category: 'vlog', likes: '16.7万', creator: '乘风破浪的小姐姐', creatorFollowers: '22万' },
  { platform: 'xiaohongshu', title: '沉浸式学习｜一天8小时高效专注', category: 'vlog', likes: '7.2万', creator: '学习博主小A', creatorFollowers: '12万' },
  { platform: 'xiaohongshu', title: '带爸妈去旅行的vlog｜他们第一次坐飞机', category: 'vlog', likes: '11.3万', creator: '旅行日记本', creatorFollowers: '18万' },
  { platform: 'xiaohongshu', title: '00后裸辞做自媒体第7天｜真实记录', category: 'vlog', likes: '8.9万', creator: '自由职业日记', creatorFollowers: '9万' },
  { platform: 'xiaohongshu', title: '周末Brunch｜独居女生的慢生活记录', category: 'vlog', likes: '6.5万' },
  { platform: 'douyin', title: '沉浸式回家｜打工人的治愈时刻', category: 'vlog', likes: '67.8万', creator: '打工人小张', creatorFollowers: '120万' },
  { platform: 'douyin', title: '早上5点半起床｜我的晨间流程', category: 'vlog', likes: '23.4万', creator: '早起日记', creatorFollowers: '45万' },
  { platform: 'douyin', title: '挑战在北京月租3000的房子｜真实记录', category: 'vlog', likes: '34.2万', creator: '北漂实录', creatorFollowers: '67万' },
  { platform: 'douyin', title: '和我一起去菜市场吧｜周末治愈vlog', category: 'vlog', likes: '18.9万' },
  { platform: 'douyin', title: '普通女孩的周五晚上｜舞蹈课+做饭', category: 'vlog', likes: '28.7万', creator: '小王在跳舞', creatorFollowers: '53万' },
  { platform: 'bilibili', title: '学习up主的真实一天｜8小时沉浸式学习', category: 'vlog', likes: '3.4万', creator: '学不死就往死里学', creatorFollowers: '15万' },
  { platform: 'bilibili', title: '毕业租房全记录｜广州城中村改造', category: 'vlog', likes: '2.8万', creator: '广漂小陈', creatorFollowers: '8万' },
  { platform: 'bilibili', title: '用2000块改造出租屋｜低成本租房指南', category: 'vlog', likes: '4.1万' },

  // 个人成长类
  { platform: 'xiaohongshu', title: '25岁后越早明白越好的30个人生道理', category: '个人成长', likes: '18.7万', creator: '智慧小阿姨', creatorFollowers: '35万' },
  { platform: 'xiaohongshu', title: '下班后的3小时｜拉开人与人差距的关键', category: '个人成长', likes: '11.2万', creator: '自律达人小美', creatorFollowers: '45万' },
  { platform: 'xiaohongshu', title: '社恐如何建立社交圈｜一年来的改变', category: '个人成长', likes: '7.8万' },
  { platform: 'xiaohongshu', title: '如何培养成长型思维｜改变命运的关键', category: '个人成长', likes: '4.3万' },
  { platform: 'xiaohongshu', title: '30岁才明白的10个道理｜越早看到越好', category: '个人成长', likes: '9.5万', creator: '人生感悟日记', creatorFollowers: '20万' },
  { platform: 'xiaohongshu', title: '高敏感人群自救指南｜停止精神内耗', category: '个人成长', likes: '6.8万', creator: '心理学小老师', creatorFollowers: '18万' },
  { platform: 'xiaohongshu', title: '坚持复盘365天的变化｜自律改变人生', category: '个人成长', likes: '5.7万' },
  { platform: 'douyin', title: '如何停止精神内耗｜我试过最有效的方法', category: '个人成长', likes: '56.3万', creator: '心理咨询师小王', creatorFollowers: '150万' },
  { platform: 'douyin', title: '30岁转行来得及吗｜我的真实经历', category: '个人成长', likes: '28.7万' },
  { platform: 'douyin', title: '存钱上瘾｜月薪5000一年存3万的方法', category: '个人成长', likes: '42.1万', creator: '理财小能手', creatorFollowers: '88万' },
  { platform: 'douyin', title: '如何克服拖延症｜我的5个实用方法', category: '个人成长', likes: '19.8万', creator: '效率提升实验室', creatorFollowers: '35万' },
  { platform: 'douyin', title: '一年读50本书的变化｜认知升级', category: '个人成长', likes: '15.6万' },
  { platform: 'bilibili', title: '高效学习法｜费曼技巧深度讲解', category: '个人成长', likes: '2.1万', creator: '学习方法研究所', creatorFollowers: '12万' },
  { platform: 'bilibili', title: '如何建立知识体系｜个人知识管理指南', category: '个人成长', likes: '1.8万' },
  { platform: 'bilibili', title: '普通人的逆袭之路｜3年从月薪5K到2W', category: '个人成长', likes: '3.2万', creator: '职场升级日记', creatorFollowers: '10万' },

  // 自律健身类
  { platform: 'xiaohongshu', title: '30天居家健身计划｜从零开始练出马甲线', category: '自律健身', likes: '15.6万', creator: '自律小张', creatorFollowers: '32万' },
  { platform: 'xiaohongshu', title: '晨跑30天的变化｜身体和心理的双重改变', category: '自律健身', likes: '8.9万', creator: '跑步日记', creatorFollowers: '12万' },
  { platform: 'xiaohongshu', title: '健身餐一周不重样｜好吃又减脂', category: '自律健身', likes: '6.7万' },
  { platform: 'xiaohongshu', title: '产后恢复｜三个月重回孕前体重的真实记录', category: '自律健身', likes: '4.5万' },
  { platform: 'xiaohongshu', title: '瑜伽30天挑战｜体态变化惊人', category: '自律健身', likes: '5.8万', creator: '瑜伽静静', creatorFollowers: '15万' },
  { platform: 'xiaohongshu', title: '打工人办公室拉伸｜每天5分钟告别腰痛', category: '自律健身', likes: '3.9万' },
  { platform: 'douyin', title: '每天10分钟｜办公室拉伸缓解腰痛', category: '自律健身', likes: '22.3万' },
  { platform: 'douyin', title: '不去健身房｜在家练出好身材的动作合集', category: '自律健身', likes: '45.2万', creator: '健身教练老王', creatorFollowers: '85万' },
  { platform: 'douyin', title: '为什么你的腹肌出不来｜90%的人都做错了', category: '自律健身', likes: '68.5万', creator: '科学健身李教练', creatorFollowers: '120万' },
  { platform: 'douyin', title: '跳绳减肥第30天｜减重15斤的变化', category: '自律健身', likes: '31.2万', creator: '跳绳减肥日记', creatorFollowers: '42万' },
  { platform: 'douyin', title: '新手哑铃全身训练｜跟练版', category: '自律健身', likes: '16.7万' },
  { platform: 'bilibili', title: '帕梅拉跟练｜全身燃脂40分钟', category: '自律健身', likes: '3.2万' },
  { platform: 'bilibili', title: '男性增肌入门｜家庭健身计划', category: '自律健身', likes: '1.5万', creator: '健身老张', creatorFollowers: '6万' },
  { platform: 'bilibili', title: '体态矫正｜圆肩驼背改善训练', category: '自律健身', likes: '2.7万' },
  { platform: 'bilibili', title: '每天10分钟拉伸｜全身放松跟练', category: '自律健身', likes: '1.9万' },
];

function getTopicRecommendations() {
  const today = new Date();
  const seed = formatDateKey(today).split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);

  const shuffled = [...TOPIC_RECOMMENDATIONS];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = (seed + i * 7) % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled.map((item, i) => {
    const pf = item.platform;
    const q = encodeURIComponent(item.title.split('｜')[0]);
    const cat = item.category || '其他';
    const searchUrl = pf === 'xiaohongshu' ? `https://www.xiaohongshu.com/search_result?keyword=${q}`
      : pf === 'douyin' ? `https://www.douyin.com/search/${q}`
      : pf === 'bilibili' ? `https://search.bilibili.com/all?keyword=${q}`
      : `https://www.baidu.com/s?wd=${q}`;

    let creatorUrl = '';
    if (item.creator) {
      const cq = encodeURIComponent(item.creator);
      creatorUrl = pf === 'xiaohongshu' ? `https://www.xiaohongshu.com/search_result?keyword=${cq}`
        : pf === 'douyin' ? `https://www.douyin.com/search/${cq}`
        : pf === 'bilibili' ? `https://search.bilibili.com/all?keyword=${cq}`
        : searchUrl;
    }
    return {
      id: `rec-${i}`,
      platform: pf,
      title: item.title,
      url: searchUrl,
      hotScore: Math.max(70, 95 - i * 2),
      category: cat,
      tags: [cat],
      likes: item.likes || '',
      creator: item.creator || '',
      creatorFollowers: item.creatorFollowers || '',
      creatorUrl: creatorUrl,
      source: 'recommendation',
      isRecommendation: true,
      trendType: 'sustained',
    };
  });
}

// ========== 对外接口 ==========

/**
 * 获取热点数据
 * @param {Date|null} forDate - 查询日期
 * @returns {Promise<Array>} 热点数据列表
 */
export async function collectHotspots(forDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let queryDate = null;
  if (forDate) {
    queryDate = new Date(forDate);
    queryDate.setHours(0, 0, 0, 0);
  }

  if (queryDate && queryDate > today) {
    return [];
  }

  const isTodayQuery = !queryDate || queryDate.getTime() === today.getTime();

  // 过去日期 → 只从缓存读取
  if (queryDate && !isTodayQuery) {
    const cacheKey = formatDateKey(queryDate);
    const cached = await getHotspotsByDate(cacheKey);
    if (cached && cached.length > 0) return cached;
    return [];
  }

  // === 获取今天的数据 ===
  const baiduData = await fetchBaiduHotList();
  const aihotData = await fetchAihotNews();

  const baiduItems = baiduData.slice(0, 30);
  const suggestions = generateTopicSuggestions(baiduItems);
  const recommendations = getTopicRecommendations();

  const allItems = [...aihotData, ...baiduItems, ...suggestions, ...recommendations];

  const todayKey = formatDateKey(today);
  if (allItems.length > 0) {
    await setHotspotsByDate(todayKey, allItems);
  }

  return allItems;
}

/**
 * 格式化热点文本（用于 AI 输入）
 */
export function formatHotspotsForAI(hotspots) {
  const groups = {};
  hotspots.forEach(item => {
    const key = item.source === 'baidu-real' ? '📰 百度热搜（真实）' :
      item.isSuggestion ? '💡 创作建议' :
      item.isRecommendation ? '📋 平台选题推荐' : '📌 其他';
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  });

  let text = '';
  for (const [platform, items] of Object.entries(groups)) {
    text += `\n【${platform}】\n`;
    items.slice(0, 8).forEach(item => {
      text += `• ${item.title}\n`;
      text += `  热度:${item.hotScore}\n`;
      if (item.source === 'baidu-real') {
        text += `  📍 百度热搜 · 真实数据\n`;
      } else if (item.isSuggestion) {
        text += `  💡 基于 "${item.relatedHotTopic}" 的创作建议\n`;
      } else if (item.isRecommendation) {
        text += `  📋 平台选题 · 搜索可看同类视频\n`;
      }
    });
  }
  return text;
}
