'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

export default function HotspotsPage() {
  const [hotspots, setHotspots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [analyzing, setAnalyzing] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [sortBy, setSortBy] = useState('hotScore'); // hotScore | velocity | engagement
  const router = useRouter();

  // 日期格式化
  const today = new Date();
  const isToday = (d) =>
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate();

  const isSameDay = (a, b) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const formatDateStr = (d) =>
    `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

  // 获取热点
  const fetchHotspots = useCallback(async (date) => {
    try {
      setRefreshing(true);
      const dateStr = formatDateStr(date);
      const res = await fetch(`/api/hotspots?date=${dateStr}`);
      const data = await res.json();
      if (data.success) {
        setHotspots(data.data);
        setError(null);
      } else {
        setError(data.error);
      }
    } catch (e) {
      setError('加载热榜失败');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchHotspots(selectedDate);
  }, [selectedDate, fetchHotspots]);

  // 日历生成
  const getCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days = [];
    // 上个月
    for (let i = firstDay - 1; i >= 0; i--) {
      days.push({ day: daysInPrevMonth - i, other: true, date: new Date(year, month - 1, daysInPrevMonth - i) });
    }
    // 本月
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ day: i, other: false, date: new Date(year, month, i) });
    }
    // 下个月
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({ day: i, other: true, date: new Date(year, month + 1, i) });
    }
    return days;
  };

  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

  // 分析热点
  const handleAnalyze = async (item) => {
    setAnalyzing(item.id);
    setShowAnalysis(true);
    setAnalysisResult(null);
    try {
      const apiKey = localStorage.getItem('deepseek_api_key') || '';
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: item.title,
          platform: item.platform,
          apiKey,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setAnalysisResult({ ...data.data, title: item.title, platform: item.platform });
      } else {
        setAnalysisResult({ error: data.error });
      }
    } catch (e) {
      setAnalysisResult({ error: e.message });
    } finally {
      setAnalyzing(null);
    }
  };

  // 平台筛选
  // 内容题材切换
  const [categoryFilter, setCategoryFilter] = useState('all');
  const categories = [
    { key: 'all', label: '全部' },
    { key: 'Vlog创作', label: '🎬 Vlog创作' },
    { key: '个人成长', label: '🌱 个人成长' },
    { key: '自律健身', label: '💪 自律健身' },
    { key: '新闻资讯', label: '📰 新闻资讯' },
    { key: '科技AI', label: '🤖 科技AI' },
  ];

  // 平台筛选
  const platforms = [
    { key: 'all', label: '全部平台' },
    { key: 'xiaohongshu', label: '小红书' },
    { key: 'douyin', label: '抖音' },
    { key: 'bilibili', label: 'B站' },
    { key: 'news', label: '新闻资讯' },
  ];

  // 双维过滤：内容题材 + 平台
  const filteredHotspots = hotspots.filter((h) => {
    // 分类匹配 — 严格区分各类目
    let matchCategory = true;
    if (categoryFilter === 'Vlog创作') {
      // 仅显示推荐池中标记为 vlog 的内容
      matchCategory = h.isRecommendation && h.category === 'vlog';
    } else if (categoryFilter === '个人成长') {
      // 仅显示推荐池中标记为 个人成长 的内容
      matchCategory = h.isRecommendation && h.category === '个人成长';
    } else if (categoryFilter === '自律健身') {
      // 仅显示推荐池中标记为 自律健身 的内容
      matchCategory = h.isRecommendation && h.category === '自律健身';
    } else if (categoryFilter === '新闻资讯') {
      // 仅显示百度热搜真实数据
      matchCategory = h.source === 'baidu-real';
    } else if (categoryFilter === '科技AI') {
      // AI Hot 新闻 + 百度热搜中的科技类
      matchCategory = h.isAihot || (h.source === 'baidu-real' && h.category === '科技');
    }

    // 平台匹配
    const matchPlatform = activeTab === 'all' || h.platform === activeTab;
    return matchCategory && matchPlatform;
  }).sort((a, b) => (b[sortBy] || 0) - (a[sortBy] || 0));

  const platformBadge = {
    xiaohongshu: { label: '小红书', class: 'badge-pink' },
    douyin: { label: '抖音', class: 'badge-green' },
    bilibili: { label: 'B站', class: 'badge-purple' },
    news: { label: '资讯', class: 'badge-cyan' },
  };

  const trendConfig = {
    viral: { label: '⚡ 爆火', class: 'badge-red' },
    trending: { label: '📈 上升', class: 'badge-orange' },
    sustained: { label: '👑 持续高热', class: 'badge-purple' },
    rising: { label: '🌟 潜力', class: 'badge-green' },
  };

  // 排序选项
  const sortOptions = [
    { key: 'hotScore', label: '综合热度' },
    { key: 'velocity', label: '爆火速度' },
    { key: 'engagement', label: '互动率' },
  ];

  const maxHotScore = Math.max(...hotspots.map((h) => h.hotScore || 0), 100);

  const timeStr = `${today.getHours().toString().padStart(2, '0')}:${today.getMinutes().toString().padStart(2, '0')}`;

  return (
    <div className="page">
      {/* 顶部标题 */}
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold gradient-text">今日热榜</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }} className="mt-1">
              {today.getFullYear()}年{today.getMonth() + 1}月{today.getDate()}日 · {timeStr}
            </p>
          </div>
          <div className="flex gap-1">
            <button className="btn btn-ghost btn-sm" onClick={() => router.push('/settings')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
            </button>
          </div>
        </div>

        {/* 日历 */}
        <div className="card mt-3">
          {/* 月切换 */}
          <div className="flex items-center justify-between mb-3">
            <button className="btn btn-ghost btn-sm" onClick={() => {
              const m = new Date(currentMonth);
              m.setMonth(m.getMonth() - 1);
              setCurrentMonth(m);
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
              {currentMonth.getFullYear()}年{currentMonth.getMonth() + 1}月
            </span>
            <button className="btn btn-ghost btn-sm" onClick={() => {
              const m = new Date(currentMonth);
              m.setMonth(m.getMonth() + 1);
              setCurrentMonth(m);
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </div>

          {/* 星期 */}
          <div className="calendar-header">
            {weekDays.map(d => <span key={d}>{d}</span>)}
          </div>

          {/* 日期网格 */}
          <div className="calendar-grid">
            {getCalendarDays().map((d, i) => {
              const isSel = isSameDay(d.date, selectedDate);
              const isT = isToday(d.date);
              const isFuture = d.date > today;
              return (
                <button
                  key={i}
                  className={`calendar-day ${d.other ? 'other-month' : ''} ${isT ? 'today' : ''} ${isSel ? 'selected' : ''} ${isFuture ? 'future' : ''}`}
                  onClick={() => {
                    if (isFuture) return; // 禁止选择未来日期
                    setSelectedDate(d.date);
                    if (d.other) setCurrentMonth(d.date);
                  }}
                  title={isFuture ? '未来日期没有数据' : ''}
                >
                  {d.day}
                  {isT && !isSel && <span className="dot" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* 内容题材切换 */}
        <div className="flex gap-2 mt-3 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {categories.map((c) => (
            <button
              key={c.key}
              className={`badge cursor-pointer whitespace-nowrap ${categoryFilter === c.key ? 'badge-cyan' : 'badge-gray'}`}
              onClick={() => setCategoryFilter(c.key)}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* 平台筛选 */}
        <div className="flex gap-2 mt-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {platforms.map((p) => (
            <button
              key={p.key}
              className={`badge cursor-pointer whitespace-nowrap text-xs ${activeTab === p.key ? 'badge-cyan' : 'badge-gray'}`}
              onClick={() => setActiveTab(p.key)}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* 排序 */}
        <div className="flex items-center gap-2 mt-2">
          <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>排序：</span>
          {sortOptions.map((opt) => (
            <button
              key={opt.key}
              className={`badge cursor-pointer ${sortBy === opt.key ? 'badge-cyan' : 'badge-gray'}`}
              onClick={() => setSortBy(opt.key)}
            >
              {opt.label}
            </button>
          ))}
          <div className="flex-1" />
          <button className="btn btn-ghost btn-sm" onClick={() => fetchHotspots(selectedDate)} disabled={refreshing}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={refreshing ? 'animate-spin' : ''}><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M21 21v-5h-5"/></svg>
          </button>
        </div>
      </div>

      {/* 热榜内容 */}
      <div className="mt-2">
        {loading ? (
          <div className="space-y-3">
            {[1,2,3,4,5,6].map(i => <div key={i} className="card"><div className="skeleton h-5 w-3/4 mb-2" /><div className="skeleton h-3 w-1/4" /></div>)}
          </div>
        ) : error ? (
          <div className="empty-state">
            <p style={{ color: 'var(--text-muted)' }}>{error}</p>
            <button className="btn btn-primary btn-sm mt-3" onClick={() => fetchHotspots(selectedDate)}>重新加载</button>
          </div>
        ) : filteredHotspots.length === 0 ? (
          <div className="empty-state"><p style={{ color: 'var(--text-muted)' }}>暂无热点数据</p></div>
        ) : (
          <div className="space-y-2">
            {filteredHotspots.map((item, index) => {
              const badge = platformBadge[item.platform] || { label: item.platform, class: 'badge-gray' };
              const heatPercent = Math.min((item.hotScore / maxHotScore) * 100, 100);
              const rank = hotspots.indexOf(item) + 1;
              const trend = trendConfig[item.trendType];

              return (
                <div key={item.id || index} className="card">
                  <div className="flex items-start gap-3">
                    {/* 排名 */}
                    <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center font-bold ${
                      rank <= 3 ? 'shadow-glow' : ''
                    }`} style={{
                      background: rank <= 3 ? 'var(--gradient-1)' : 'rgba(255,255,255,0.05)',
                      color: rank <= 3 ? '#0a0a1a' : 'var(--text-muted)',
                      fontSize: 11,
                      fontFamily: 'var(--font-mono)',
                    }}>
                      {rank}
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* 标签行 */}
                      <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                        <span className={`badge ${badge.class} text-xs`}>{badge.label}</span>
                        {/* 数据来源标签 */}
                        {item.source === 'baidu-real' && (
                          <span className="badge badge-cyan text-xs" style={{ fontSize: 10 }}>
                            📡 百度热搜·真实
                          </span>
                        )}
                        {item.isSuggestion && (
                          <span className="badge badge-purple text-xs" style={{ fontSize: 10 }}>
                            💡 AI创作建议
                          </span>
                        )}
                        {item.isRecommendation && (
                          <span className="badge badge-pink text-xs" style={{ fontSize: 10 }}>
                            📋 平台选题推荐
                          </span>
                        )}
                        {item.isAihot && (
                          <span className="badge badge-green text-xs" style={{ fontSize: 10 }}>
                            🤖 AI新闻·每日
                          </span>
                        )}
                        {trend && (
                          <span className={`badge ${trend.class} text-xs`}>{trend.label}</span>
                        )}
                        {item.growthRate && (
                          <span className="badge badge-green text-xs" style={{ fontSize: 10 }}>
                            ↑{item.growthRate}
                          </span>
                        )}
                      </div>

                      {/* 标题 */}
                      <a
                        href={item.url || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: 'var(--text-primary)', textDecoration: 'none' }}
                      >
                        <p className="text-sm font-medium leading-snug hover:opacity-80 transition-opacity">
                          {item.title}
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--cyan)" strokeWidth="2" style={{ display: 'inline', marginLeft: 4, opacity: 0.5 }}><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                        </p>
                      </a>

                      {/* 创作者信息 */}
                      {item.creator && (
                        <div className="flex items-center gap-2 mt-1.5">
                          <div className="flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: 'var(--gradient-1)', fontSize: 9, color: '#0a0a1a', fontWeight: 700 }}>
                              {item.creator[0]}
                            </span>
                            <span style={{ color: 'var(--text-primary)', fontSize: 12, fontWeight: 500 }}>{item.creator}</span>
                            {item.creatorFollowers && (
                              <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>{item.creatorFollowers}粉丝</span>
                            )}
                          </div>
                          {item.creatorUrl && (
                            <a
                              href={item.creatorUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn btn-ghost btn-xs"
                              style={{ fontSize: 10, color: 'var(--cyan)' }}
                              onClick={e => e.stopPropagation()}
                            >
                              搜TA的内容 ↗
                            </a>
                          )}
                        </div>
                      )}

                      {/* 热度多维指标 */}
                      <div className="flex items-center gap-3 mt-2">
                        <div className="flex items-center gap-1">
                          <span style={{ color: 'var(--cyan)', fontSize: 11, fontFamily: 'var(--font-mono)' }}>🔥{item.hotScore}</span>
                          <span style={{ color: 'var(--orange)', fontSize: 11, fontFamily: 'var(--font-mono)' }}>⚡{item.velocity || '-'}</span>
                          <span style={{ color: 'var(--purple)', fontSize: 11, fontFamily: 'var(--font-mono)' }}>💬{item.engagement || '-'}</span>
                        </div>
                      </div>

                      {/* 互动数据 */}
                      {(item.likes || item.comments) && (
                        <div className="flex items-center gap-2 mt-1">
                          {item.likes && <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>❤️ {item.likes}</span>}
                          {item.comments && <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>💬 {item.comments}</span>}
                          {item.shares && <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>🔄 {item.shares}</span>}
                        </div>
                      )}

                      {/* 标签 */}
                      {item.tags && item.tags.length > 0 && (
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {item.tags.map((tag, i) => (
                            <span key={i} style={{ color: 'var(--text-muted)', fontSize: 10 }}>#{tag}</span>
                          ))}
                        </div>
                      )}

                      {/* 操作按钮 */}
                      <div className="flex gap-2 mt-2">
                        {item.isAihot || item.source === 'baidu-real' ? (
                          <a href={item.url || '#'} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-secondary">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                            查看原文
                          </a>
                        ) : item.isRecommendation ? (
                          <a href={item.url || '#'} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-secondary">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                            搜类似选题
                          </a>
                        ) : item.isSuggestion ? (
                          <a href={`https://www.baidu.com/s?wd=${encodeURIComponent(item.relatedHotTopic || item.title)}`} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-secondary">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                            搜索相关
                          </a>
                        ) : (
                          <a href={`https://www.baidu.com/s?wd=${encodeURIComponent(item.title)}`} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-secondary">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                            搜索
                          </a>
                        )}
                        <button className="btn btn-sm btn-ghost" onClick={() => handleAnalyze(item)} disabled={analyzing === item.id}>
                          {analyzing === item.id ? '分析中...' : '🔍 AI分析'}
                        </button>
                        <button className="btn btn-sm btn-ghost" onClick={() => addTopicFromHotspot(item)}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
                          收藏
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 分析 Modal */}
      {showAnalysis && (
        <div className="modal-overlay" onClick={() => setShowAnalysis(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold gradient-text">🔍 AI 内容分析</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowAnalysis(false)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            {analyzing ? (
              <div className="space-y-3">
                {[1,2,3].map(i => <div key={i} className="skeleton h-10 rounded-lg" />)}
                <p className="text-center" style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 12 }}>
                  AI 正在分析内容结构...
                </p>
              </div>
            ) : analysisResult?.error ? (
              <div className="text-center py-6">
                <p style={{ color: 'var(--red)' }}>{analysisResult.error}</p>
                <p className="mt-2" style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                  请先在设置页面配置 DeepSeek API Key
                </p>
              </div>
            ) : analysisResult ? (
              <div className="space-y-3 text-sm">
                {analysisResult.title && (
                  <div className="card" style={{ padding: 12 }}>
                    <p className="font-medium">{analysisResult.title}</p>
                    <p style={{ color: 'var(--cyan)', fontSize: 11, marginTop: 4 }}>
                      📍 {analysisResult.platform}
                    </p>
                  </div>
                )}

                {analysisResult.summary && (
                  <div>
                    <p className="font-bold mb-1" style={{ color: 'var(--cyan)' }}>📝 内容摘要</p>
                    <p style={{ color: 'var(--text-secondary)' }}>{analysisResult.summary}</p>
                  </div>
                )}

                {analysisResult.targetAudience && (
                  <div>
                    <p className="font-bold mb-1" style={{ color: 'var(--purple)' }}>🎯 目标受众</p>
                    <p style={{ color: 'var(--text-secondary)' }}>{analysisResult.targetAudience}</p>
                  </div>
                )}

                {analysisResult.keyPoints && analysisResult.keyPoints.length > 0 && (
                  <div>
                    <p className="font-bold mb-1" style={{ color: 'var(--green)' }}>📌 分论点 / 看点</p>
                    {analysisResult.keyPoints.map((p, i) => (
                      <div key={i} className="flex items-start gap-2 mb-1">
                        <span style={{ color: 'var(--cyan)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>→</span>
                        <span style={{ color: 'var(--text-secondary)' }}>{p}</span>
                      </div>
                    ))}
                  </div>
                )}

                {analysisResult.hookAnalysis && (
                  <div>
                    <p className="font-bold mb-1" style={{ color: 'var(--pink)' }}>🎣 开头钩子分析</p>
                    <p style={{ color: 'var(--text-secondary)' }}>{analysisResult.hookAnalysis}</p>
                  </div>
                )}

                {analysisResult.styleFeatures && analysisResult.styleFeatures.length > 0 && (
                  <div>
                    <p className="font-bold mb-1" style={{ color: 'var(--orange)' }}>🎨 创作技巧</p>
                    {analysisResult.styleFeatures.map((f, i) => (
                      <div key={i} className="flex items-start gap-2 mb-1">
                        <span style={{ color: 'var(--orange)', fontSize: 11 }}>✦</span>
                        <span style={{ color: 'var(--text-secondary)' }}>{f}</span>
                      </div>
                    ))}
                  </div>
                )}

                {analysisResult.whyPopular && (
                  <div className="card" style={{ padding: 12, borderColor: 'rgba(0, 240, 255, 0.15)', background: 'rgba(0,240,255,0.03)' }}>
                    <p className="font-bold mb-1" style={{ color: 'var(--cyan)' }}>🔥 为什么能火</p>
                    <p style={{ color: 'var(--text-secondary)' }}>{analysisResult.whyPopular}</p>
                  </div>
                )}

                {analysisResult.yourAngle && (
                  <div className="card" style={{ padding: 12, borderColor: 'rgba(139, 92, 246, 0.15)', background: 'rgba(139,92,246,0.03)' }}>
                    <p className="font-bold mb-1" style={{ color: 'var(--purple)' }}>💡 你可以借鉴的角度</p>
                    <p style={{ color: 'var(--text-secondary)' }}>{analysisResult.yourAngle}</p>
                  </div>
                )}

                <button
                  className="btn btn-primary btn-block btn-sm mt-2"
                  onClick={() => {
                    const text = [
                      `【内容分析】${analysisResult.title}`,
                      '',
                      `摘要：${analysisResult.summary || ''}`,
                      `目标受众：${analysisResult.targetAudience || ''}`,
                      '',
                      '分论点：',
                      ...(analysisResult.keyPoints || []).map(p => `  → ${p}`),
                      '',
                      `钩子：${analysisResult.hookAnalysis || ''}`,
                      '',
                      '创作技巧：',
                      ...(analysisResult.styleFeatures || []).map(f => `  ✦ ${f}`),
                      '',
                      `🔥 ${analysisResult.whyPopular || ''}`,
                      '',
                      `💡 ${analysisResult.yourAngle || ''}`,
                    ].join('\n');
                    navigator.clipboard.writeText(text).then(() => showToast('已复制分析结果'));
                  }}
                >
                  复制分析结果
                </button>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* 底部 */}
      <div className="text-center mt-6">
        <p style={{ color: 'var(--text-muted)', fontSize: 11 }}>
          {formatDateStr(selectedDate) === formatDateStr(today) ? (
            '今日数据来源：百度热搜实时API · AI选题建议仅供参考'
          ) : (
            '过去日期无缓存数据'
          )}
        </p>
      </div>
    </div>
  );

  async function addTopicFromHotspot(item) {
    try {
      const res = await fetch('/api/topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: item.title,
          description: `来源：${item.platform} · ${item.category || '热门'}`,
          sourceType: 'hotspot',
          status: 'pending',
          angle: '',
        }),
      });
      const data = await res.json();
      showToast(data.success ? '✅ 已收藏到选题库' : '收藏失败');
    } catch { showToast('收藏失败'); }
  }
}

function showToast(msg) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity 0.3s'; setTimeout(() => toast.remove(), 300); }, 2000);
}
