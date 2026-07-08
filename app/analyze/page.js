'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function VideoAnalyzePage() {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleAnalyze = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const apiKey = localStorage.getItem('deepseek_api_key') || '';
      const res = await fetch('/api/video-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim(), apiKey }),
      });
      const data = await res.json();
      if (data.success) {
        setResult(data.data);
      } else {
        setError(data.error || '分析失败');
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const saveAsTopic = async () => {
    if (!result) return;
    try {
      const res = await fetch('/api/topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: result.note.title,
          description: `来源：小红书视频分析\n${result.analysis.summary || ''}`,
          sourceType: 'video-analysis',
          status: 'pending',
          angle: result.analysis.yourAngle || '',
        }),
      });
      const data = await res.json();
      showToast(data.success ? '✅ 已保存到选题库' : '保存失败');
    } catch {
      showToast('保存失败');
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="text-2xl font-bold gradient-text">视频分析</h1>
        <p className="mt-1" style={{ color: 'var(--text-muted)', fontSize: 13 }}>
          粘贴小红书笔记链接，AI 自动分析爆款公式
        </p>
      </div>

      {/* 输入区 */}
      <div className="card mt-3">
        <div className="flex gap-2">
          <input
            className="input flex-1"
            placeholder="粘贴小红书链接..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
          />
          <button
            className="btn btn-primary"
            onClick={handleAnalyze}
            disabled={loading || !url.trim()}
          >
            {loading ? (
              <span className="flex items-center gap-1">
                <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                分析中
              </span>
            ) : '分析'}
          </button>
        </div>
        <p className="mt-2" style={{ color: 'var(--text-muted)', fontSize: 11 }}>
          支持小红书笔记链接（含 xsec_token）
        </p>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="card mt-3" style={{ borderColor: 'rgba(255,80,80,0.2)' }}>
          <p style={{ color: 'var(--red)', fontSize: 13 }}>❌ {error}</p>
          <p className="mt-1" style={{ color: 'var(--text-muted)', fontSize: 11 }}>
            请检查链接是否正确，或在设置页面配置 DeepSeek API Key
          </p>
        </div>
      )}

      {/* 加载状态 */}
      {loading && (
        <div className="card mt-3">
          <div className="space-y-3">
            <div className="skeleton h-40 rounded-lg" />
            <div className="skeleton h-5 w-3/4" />
            <div className="skeleton h-3 w-1/2" />
            <div className="skeleton h-20 rounded-lg" />
          </div>
        </div>
      )}

      {/* 分析结果 */}
      {result && (
        <div className="mt-3 space-y-3">
          {/* 笔记信息卡片 */}
          <div className="card">
            <div className="flex gap-3">
              {result.note.coverImage && (
                <div className="flex-shrink-0" style={{ width: 80, height: 106, borderRadius: 8, overflow: 'hidden', background: 'rgba(255,255,255,0.05)' }}>
                  <img
                    src={result.note.coverImage}
                    alt="封面"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-bold" style={{ fontSize: 14, lineHeight: 1.4 }}>{result.note.title}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="badge badge-pink text-xs">小红书</span>
                  {result.note.duration && (
                    <span className="badge badge-gray text-xs">⏱ {result.note.duration}</span>
                  )}
                </div>
                {result.note.tags && result.note.tags.length > 0 && (
                  <div className="flex gap-1 mt-1.5 flex-wrap">
                    {result.note.tags.slice(0, 5).map((tag, i) => (
                      <span key={i} style={{ color: 'var(--text-muted)', fontSize: 10 }}>#{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* AI 分析结果 */}
          <div className="card">
            <h3 className="font-bold gradient-text mb-3">🔍 AI 分析报告</h3>

            {result.analysis.summary && (
              <div className="mb-3">
                <p className="font-bold mb-1" style={{ color: 'var(--cyan)', fontSize: 12 }}>📝 内容摘要</p>
                <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{result.analysis.summary}</p>
              </div>
            )}

            {result.analysis.targetAudience && (
              <div className="mb-3">
                <p className="font-bold mb-1" style={{ color: 'var(--purple)', fontSize: 12 }}>🎯 目标受众</p>
                <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{result.analysis.targetAudience}</p>
              </div>
            )}

            {result.analysis.hookAnalysis && (
              <div className="mb-3">
                <p className="font-bold mb-1" style={{ color: 'var(--pink)', fontSize: 12 }}>🎣 开头钩子分析</p>
                <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{result.analysis.hookAnalysis}</p>
              </div>
            )}

            {result.analysis.contentStructure && (
              <div className="mb-3">
                <p className="font-bold mb-1" style={{ color: 'var(--orange)', fontSize: 12 }}>📋 内容结构</p>
                <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{result.analysis.contentStructure}</p>
              </div>
            )}

            {result.analysis.whyPopular && (
              <div className="card mb-3" style={{ padding: 12, borderColor: 'rgba(0, 240, 255, 0.15)', background: 'rgba(0,240,255,0.03)' }}>
                <p className="font-bold mb-1" style={{ color: 'var(--cyan)', fontSize: 12 }}>🔥 为什么能火</p>
                <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{result.analysis.whyPopular}</p>
              </div>
            )}

            {result.analysis.yourAngle && (
              <div className="card mb-3" style={{ padding: 12, borderColor: 'rgba(139, 92, 246, 0.15)', background: 'rgba(139,92,246,0.03)' }}>
                <p className="font-bold mb-1" style={{ color: 'var(--purple)', fontSize: 12 }}>💡 你可以借鉴的角度</p>
                <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{result.analysis.yourAngle}</p>
              </div>
            )}

            {result.analysis.suggestedTitle && (
              <div className="mb-3">
                <p className="font-bold mb-1" style={{ color: 'var(--green)', fontSize: 12 }}>✍️ 建议选题标题</p>
                <div className="card" style={{ padding: 10, background: 'rgba(0,200,150,0.05)' }}>
                  <p style={{ color: 'var(--text-primary)', fontSize: 14, fontWeight: 500 }}>{result.analysis.suggestedTitle}</p>
                </div>
              </div>
            )}

            {result.analysis.tags && result.analysis.tags.length > 0 && (
              <div className="mb-3">
                <p className="font-bold mb-1" style={{ color: 'var(--cyan)', fontSize: 12 }}>🏷️ 推荐标签</p>
                <div className="flex gap-1.5 flex-wrap">
                  {result.analysis.tags.map((tag, i) => (
                    <span key={i} className="badge badge-gray text-xs">#{tag}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 操作按钮 */}
          <div className="flex gap-2">
            <button className="btn btn-primary btn-sm flex-1" onClick={saveAsTopic}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
              保存到选题库
            </button>
            <button
              className="btn btn-secondary btn-sm flex-1"
              onClick={() => {
                const text = [
                  `【视频分析】${result.note.title}`,
                  '',
                  `摘要：${result.analysis.summary || ''}`,
                  `受众：${result.analysis.targetAudience || ''}`,
                  `钩子：${result.analysis.hookAnalysis || ''}`,
                  `结构：${result.analysis.contentStructure || ''}`,
                  '',
                  `🔥 ${result.analysis.whyPopular || ''}`,
                  `💡 ${result.analysis.yourAngle || ''}`,
                  `✍️ ${result.analysis.suggestedTitle || ''}`,
                ].join('\n');
                navigator.clipboard.writeText(text).then(() => showToast('已复制分析结果'));
              }}
            >
              复制结果
            </button>
          </div>
        </div>
      )}

      {/* 使用提示 */}
      {!result && !loading && !error && (
        <div className="card mt-4">
          <div className="text-center py-4">
            <p style={{ fontSize: 32, marginBottom: 8 }}>🔗</p>
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>粘贴小红书笔记链接开始分析</p>
            <p className="mt-2" style={{ color: 'var(--text-muted)', fontSize: 11 }}>
              支持：标题提取 · 标签分析 · 爆款公式拆解 · 选题建议
            </p>
          </div>
        </div>
      )}

      {/* 底部 */}
      <div className="text-center mt-6">
        <p style={{ color: 'var(--text-muted)', fontSize: 11 }}>
          数据来源：小红书公开页面 · AI 分析仅供参考
        </p>
      </div>
    </div>
  );
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
