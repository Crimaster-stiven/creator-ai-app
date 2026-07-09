'use client';

import { useState } from 'react';

export default function VideoAnalyzePage() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [noteText, setNoteText] = useState('');
  const [transcript, setTranscript] = useState('');

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
        body: JSON.stringify({
          url: url.trim(),
          apiKey,
          noteText: noteText.trim() || undefined,
          transcript: transcript.trim() || undefined,
        }),
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
      const parts = [
        `来源：小红书视频分析`,
        result.analysis.summary ? `摘要：${result.analysis.summary}` : '',
        result.analysis.scriptHighlights ? `脚本亮点：${result.analysis.scriptHighlights}` : '',
        result.analysis.yourAngle ? `借鉴角度：${result.analysis.yourAngle}` : '',
        result.analysis.suggestedTitle ? `建议选题：${result.analysis.suggestedTitle}` : '',
      ].filter(Boolean).join('\n');

      const res = await fetch('/api/topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: result.note.title,
          description: parts,
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

  const copyFullReport = () => {
    if (!result) return;
    const parts = ['【视频分析报告】', `标题：${result.note.title}`, ''];

    // 文案正文
    const fullText = result.note.fullDescription || noteText;
    if (fullText) {
      parts.push('📝 笔记文案：', fullText, '');
    }

    // 口播转录
    if (transcript) {
      parts.push('🎙️ 视频口播转录：', transcript, '');
    }

    // AI 分析
    parts.push('📊 AI 分析：');
    const a = result.analysis;
    if (a.summary) parts.push(`摘要：${a.summary}`);
    if (a.targetAudience) parts.push(`受众：${a.targetAudience}`);
    if (a.hookAnalysis) parts.push(`钩子：${a.hookAnalysis}`);
    if (a.contentStructure) parts.push(`结构：${a.contentStructure}`);
    if (a.scriptHighlights) parts.push(`脚本亮点：${a.scriptHighlights}`);
    if (a.whyPopular) parts.push(`\n🔥 ${a.whyPopular}`);
    if (a.yourAngle) parts.push(`\n💡 ${a.yourAngle}`);
    if (a.suggestedTitle) parts.push(`\n✍️ 建议选题：${a.suggestedTitle}`);

    navigator.clipboard.writeText(parts.join('\n')).then(() => showToast('已复制完整报告'));
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="text-2xl font-bold gradient-text">视频分析</h1>
        <p className="mt-1" style={{ color: 'var(--text-muted)', fontSize: 13 }}>
          分析小红书爆款视频，获取完整文案 + 脚本 + 爆款公式
        </p>
      </div>

      {/* 链接输入 */}
      <div className="card mt-3">
        <p className="font-bold mb-2" style={{ fontSize: 12, color: 'var(--cyan)' }}>🔗 第一步：粘贴小红书链接</p>
        <div className="flex gap-2">
          <input
            className="input flex-1"
            placeholder="https://www.xiaohongshu.com/explore/..."
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
      </div>

      {/* 文案输入区 */}
      <div className="card mt-2" style={{ borderColor: 'rgba(139,92,246,0.15)' }}>
        <p className="font-bold mb-2" style={{ fontSize: 12, color: 'var(--purple)' }}>📝 第二步：粘贴完整文案（可选，让分析更准）</p>
        <textarea
          className="input w-full"
          style={{ minHeight: 60, fontSize: 12, resize: 'vertical' }}
          placeholder="从笔记页面复制全部文字粘贴到这里..."
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
        />
        <details className="mt-2" style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          <summary style={{ cursor: 'pointer' }}>🎙️ 粘贴口播转录文本（可选）</summary>
          <textarea
            className="input w-full mt-2"
            style={{ minHeight: 60, fontSize: 12, resize: 'vertical' }}
            placeholder="用本地 Social Video Toolkit 转写后粘贴到这里..."
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
          />
          <p className="mt-1" style={{ fontSize: 10 }}>
            本地运行：<code style={{ fontSize: 10, background: 'rgba(255,255,255,0.05)', padding: '1px 4px', borderRadius: 3 }}>source /tmp/svt-venv/bin/activate && python3 ~/.claude/skills/social-video-toolkit/scripts/social_video_toolkit.py analyze "视频链接" --language zh-CN</code>
          </p>
        </details>
      </div>

      {/* 错误 */}
      {error && (
        <div className="card mt-3" style={{ borderColor: 'rgba(255,80,80,0.2)' }}>
          <p style={{ color: 'var(--red)', fontSize: 13 }}>❌ {error}</p>
        </div>
      )}

      {/* 加载中 */}
      {loading && (
        <div className="card mt-3">
          <div className="space-y-3">
            <div className="skeleton h-32 rounded-lg" />
            <div className="skeleton h-5 w-3/4" />
            <div className="skeleton h-20 rounded-lg" />
            <div className="skeleton h-32 rounded-lg" />
          </div>
        </div>
      )}

      {/* 结果 */}
      {result && (
        <div className="mt-3 space-y-3">
          {/* 笔记信息 */}
          <div className="card">
            <div className="flex gap-3">
              {result.note.coverImage && (
                <a href={result.note.noteUrl} target="_blank" rel="noopener noreferrer"
                   className="flex-shrink-0" style={{ width: 80, height: 106, borderRadius: 8, overflow: 'hidden', background: 'rgba(255,255,255,0.05)' }}>
                  <img src={result.note.coverImage} alt="封面"
                       style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                       onError={(e) => { e.target.style.display = 'none'; }} />
                </a>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-bold" style={{ fontSize: 14, lineHeight: 1.4 }}>{result.note.title}</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="badge badge-pink text-xs">小红书</span>
                  {result.note.duration && <span className="badge badge-gray text-xs">⏱ {result.note.duration}</span>}
                </div>
                {result.note.tags?.length > 0 && (
                  <div className="flex gap-1 mt-1.5 flex-wrap">
                    {result.note.tags.slice(0, 6).map((tag, i) => (
                      <span key={i} style={{ color: 'var(--text-muted)', fontSize: 10 }}>#{tag}</span>
                    ))}
                  </div>
                )}
                {result.note.videoUrl && (
                  <a href={result.note.videoUrl} target="_blank" rel="noopener noreferrer"
                     className="btn btn-ghost btn-xs mt-1" style={{ color: 'var(--cyan)', fontSize: 10 }}>
                    ▶ 查看原始视频
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* 📝 完整文案（优先显示用户粘贴的，其次API抓取的） */}
          {result.note.fullDescription || noteText ? (
            <div className="card">
              <h3 className="font-bold mb-2" style={{ color: 'var(--cyan)', fontSize: 13 }}>📝 完整文案</h3>
              <div className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {result.note.fullDescription || noteText}
              </div>
            </div>
          ) : null}

          {/* 🎙️ 口播转录 */}
          {transcript && (
            <div className="card" style={{ borderColor: 'rgba(0,200,150,0.2)' }}>
              <h3 className="font-bold mb-2" style={{ color: 'var(--green)', fontSize: 13 }}>🎙️ 视频口播转录</h3>
              <div className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 300, overflowY: 'auto' }}>
                {transcript}
              </div>
            </div>
          )}

          {/* 🔍 AI 分析 */}
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
                <p style={{ color: 'var(--text-secondary)', fontSize: 13, whiteSpace: 'pre-wrap' }}>{result.analysis.contentStructure}</p>
              </div>
            )}

            {result.analysis.scriptHighlights && (
              <div className="mb-3">
                <p className="font-bold mb-1" style={{ color: 'var(--green)', fontSize: 12 }}>🎬 脚本亮点</p>
                <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{result.analysis.scriptHighlights}</p>
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

            {result.analysis.tags?.length > 0 && (
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
            <button className="btn btn-secondary btn-sm flex-1" onClick={copyFullReport}>
              📋 复制完整报告
            </button>
          </div>
        </div>
      )}

      {/* 空状态 */}
      {!result && !loading && !error && (
        <div className="card mt-4">
          <div className="text-center py-4">
            <p style={{ fontSize: 32, marginBottom: 8 }}>🔗</p>
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>粘贴小红书链接开始分析</p>
            <p className="mt-2" style={{ color: 'var(--text-muted)', fontSize: 11 }}>
              支持 · 自动抓取标题标签封面 · 粘贴完整文案 · 转录口播 · AI拆解爆款
            </p>
          </div>
        </div>
      )}

      {/* 底部 */}
      <div className="text-center mt-6">
        <p style={{ color: 'var(--text-muted)', fontSize: 11 }}>
          提示：粘贴完整文案和口播转录后分析结果更精准
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
