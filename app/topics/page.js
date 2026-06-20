'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function TopicsPage() {
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recommending, setRecommending] = useState(false);
  const [recommendResult, setRecommendResult] = useState(null);
  const [showRecommend, setShowRecommend] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const router = useRouter();

  const fetchTopics = async () => {
    try {
      const res = await fetch('/api/topics');
      const data = await res.json();
      if (data.success) setTopics(data.data);
    } catch (e) {
      console.error('加载选题失败:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTopics();
  }, []);

  // AI 推荐选题
  const handleRecommend = async () => {
    setRecommending(true);
    setShowRecommend(true);
    setRecommendResult(null);
    try {
      const apiKey = localStorage.getItem('deepseek_api_key') || '';
      const res = await fetch('/api/topics-recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey }),
      });
      const data = await res.json();
      if (data.success) {
        setRecommendResult(data.data);
        // 刷新选题列表
        fetchTopics();
      } else {
        setRecommendResult({ error: data.error });
      }
    } catch (e) {
      setRecommendResult({ error: '推荐失败：' + e.message });
    } finally {
      setRecommending(false);
    }
  };

  // 状态筛选
  const filters = [
    { key: 'all', label: `全部 (${topics.length})` },
    { key: 'pending', label: `待确认 (${topics.filter(t => t.status === 'pending').length})` },
    { key: 'confirmed', label: `已确认 (${topics.filter(t => t.status === 'confirmed').length})` },
    { key: 'generated', label: `已产出 (${topics.filter(t => t.status === 'generated').length})` },
  ];

  const filteredTopics = activeFilter === 'all'
    ? topics
    : topics.filter(t => t.status === activeFilter);

  // 按创建时间排序（最新的在前）
  const sortedTopics = [...filteredTopics].sort((a, b) =>
    new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
  );

  const statusConfig = {
    pending: { label: '待确认', class: 'badge-yellow' },
    confirmed: { label: '已确认', class: 'badge-blue' },
    generating: { label: '生成中', class: 'badge-gray' },
    generated: { label: '已产出', class: 'badge-green' },
  };

  const typeConfig = {
    vlog: { label: 'Vlog', class: 'badge-red' },
    oral: { label: '口播', class: 'badge-purple' },
  };

  return (
    <div className="page">
      {/* 头部 */}
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">选题库</h1>
            <p className="text-sm text-gray-400 mt-1">
              共 {topics.length} 个选题
            </p>
          </div>
          <button
            className="btn btn-primary"
            onClick={handleRecommend}
            disabled={recommending}
          >
            {recommending ? (
              <span>分析热点中...</span>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3v4"/><path d="M18 7l-2 2"/><path d="M18 17l-2-2"/><path d="M12 21v-4"/><path d="M6 17l2-2"/><path d="M6 7l2 2"/><path d="M3 12h4"/><path d="M17 12h4"/></svg>
                AI 推荐选题
              </>
            )}
          </button>
        </div>

        {/* 状态筛选 */}
        <div className="flex gap-2 mt-3 overflow-x-auto pb-2 scrollbar-none">
          {filters.map((f) => (
            <button
              key={f.key}
              className={`badge cursor-pointer whitespace-nowrap ${activeFilter === f.key ? 'badge-red' : 'badge-gray'}`}
              onClick={() => setActiveFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* AI 推荐结果面板 */}
      {showRecommend && (
        <div className="mb-4">
          <div className="card bg-red-50 border border-red-100">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-red-600">
                {recommending ? '🤔 AI 正在分析热点...' : '💡 AI 选题推荐'}
              </h3>
              <button className="text-gray-400 text-sm" onClick={() => setShowRecommend(false)}>关闭</button>
            </div>

            {recommending ? (
              <div className="space-y-3">
                {[1,2,3].map(i => (
                  <div key={i} className="skeleton h-16 rounded-lg" />
                ))}
              </div>
            ) : recommendResult?.error ? (
              <div className="text-center py-6">
                <p className="text-red-500 mb-2">{recommendResult.error}</p>
                <p className="text-gray-400 text-xs">
                  请先配置 DeepSeek API Key，参考使用说明
                </p>
              </div>
            ) : recommendResult?.topics ? (
              <div className="space-y-2">
                {recommendResult.topics.map((topic, i) => (
                  <div key={i} className="bg-white rounded-xl p-3 border border-red-100">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`badge ${topic.type === 'hotspot' ? 'badge-red' : topic.type === 'differentiated' ? 'badge-blue' : 'badge-green'} text-xs`}>
                        {topic.type === 'hotspot' ? '🔥 蹭热点' : topic.type === 'differentiated' ? '💡 差异化' : '🌳 长青'}
                      </span>
                      <span className={`badge ${typeConfig[topic.contentType]?.class || 'badge-gray'} text-xs`}>
                        {typeConfig[topic.contentType]?.label || topic.contentType}
                      </span>
                      <span className="text-xs ml-auto">{topic.heatRating}</span>
                    </div>
                    <p className="font-medium text-sm mb-1">{topic.title}</p>
                    <p className="text-xs text-gray-400 mb-1">
                      📌 {topic.angle}
                    </p>
                    <p className="text-xs text-gray-400">{topic.whyWorks}</p>
                    {topic.referenceHashtags && topic.referenceHashtags.length > 0 && (
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {topic.referenceHashtags.map((tag, j) => (
                          <span key={j} className="text-xs text-blue-400">{tag}</span>
                        ))}
                      </div>
                    )}
                    <button
                      className="btn btn-sm btn-primary mt-2"
                      onClick={() => {
                        router.push(`/generate?topic=${encodeURIComponent(topic.title)}&type=${topic.contentType}&angle=${encodeURIComponent(topic.angle || '')}`);
                      }}
                    >
                      去创作
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* 选题列表 */}
      {loading ? (
        <div className="space-y-3 mt-2">
          {[1,2,3,4].map(i => (
            <div key={i} className="card">
              <div className="skeleton h-5 w-2/3 mb-2" />
              <div className="skeleton h-3 w-1/3" />
            </div>
          ))}
        </div>
      ) : sortedTopics.length === 0 ? (
        <div className="empty-state py-16">
          <svg className="mx-auto mb-4 opacity-30" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 14l2 2 4-4"/></svg>
          <p className="text-gray-400 mb-2">还没有选题</p>
          <p className="text-gray-300 text-sm mb-4">点击上方「AI 推荐选题」开始</p>
          <button className="btn btn-primary" onClick={handleRecommend} disabled={recommending}>
            {recommending ? '推荐中...' : '✨ 开始推荐'}
          </button>
        </div>
      ) : (
        <div className="space-y-2 mt-2">
          {sortedTopics.map((topic) => {
            const sc = statusConfig[topic.status] || { label: topic.status, class: 'badge-gray' };
            const tc = typeConfig[topic.type] || { label: topic.type || '通用', class: 'badge-gray' };

            return (
              <div key={topic.id} className="card">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`badge ${sc.class} text-xs`}>{sc.label}</span>
                      <span className={`badge ${tc.class} text-xs`}>{tc.label}</span>
                      {topic.sourceType === 'ai_recommended' && (
                        <span className="badge badge-purple text-xs">AI推荐</span>
                      )}
                      {topic.heatRating && (
                        <span className="text-xs">{topic.heatRating}</span>
                      )}
                    </div>
                    <p className="font-medium text-sm leading-snug">{topic.title}</p>
                    {topic.angle && (
                      <p className="text-xs text-gray-400 mt-1">📌 {topic.angle}</p>
                    )}
                    <p className="text-xs text-gray-300 mt-1">
                      {new Date(topic.createdAt).toLocaleDateString('zh-CN')}
                      {topic.description && ` · ${topic.description}`}
                    </p>
                  </div>

                  {/* 操作按钮 */}
                  <div className="flex-shrink-0 flex flex-col gap-1">
                    {topic.status === 'pending' && (
                      <>
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => updateTopicStatus(topic.id, 'confirmed')}
                        >
                          确认
                        </button>
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => router.push(`/generate?topic=${encodeURIComponent(topic.title)}&id=${topic.id}&type=${topic.type || 'vlog'}`)}
                        >
                          创作
                        </button>
                      </>
                    )}
                    {topic.status === 'confirmed' && (
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={() => router.push(`/generate?topic=${encodeURIComponent(topic.title)}&id=${topic.id}&type=${topic.type || 'vlog'}`)}
                      >
                        去创作
                      </button>
                    )}
                    {topic.status === 'generated' && (
                      <button
                        className="btn btn-sm btn-secondary"
                        onClick={() => router.push('/library')}
                      >
                        查看文案
                      </button>
                    )}
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => deleteTopicItem(topic.id)}
                    >
                      删除
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 底部统计 */}
      {topics.length > 0 && (
        <div className="text-center text-xs text-gray-300 mt-6 mb-4">
          待确认 {topics.filter(t => t.status === 'pending').length} ·
          已确认 {topics.filter(t => t.status === 'confirmed').length} ·
          已产出 {topics.filter(t => t.status === 'generated').length}
        </div>
      )}
    </div>
  );

  // 更新选题状态
  async function updateTopicStatus(id, status) {
    try {
      const res = await fetch('/api/topics', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      const data = await res.json();
      if (data.success) {
        setTopics(prev => prev.map(t => t.id === id ? { ...t, status } : t));
        showToast(status === 'confirmed' ? '已确认选题' : '状态已更新');
      }
    } catch { showToast('操作失败'); }
  }

  // 删除选题
  async function deleteTopicItem(id) {
    if (!confirm('确定删除这个选题吗？')) return;
    try {
      await fetch(`/api/topics?id=${id}`, { method: 'DELETE' });
      setTopics(prev => prev.filter(t => t.id !== id));
      showToast('已删除');
    } catch { showToast('删除失败'); }
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
