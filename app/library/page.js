'use client';

import { useState, useEffect } from 'react';

export default function LibraryPage() {
  const [contents, setContents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');
  const [viewingContent, setViewingContent] = useState(null);

  const fetchContents = async () => {
    try {
      const res = await fetch('/api/library');
      const data = await res.json();
      if (data.success) setContents(data.data);
    } catch (e) {
      console.error('加载文案库失败:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContents();
  }, []);

  // 筛选
  const filters = [
    { key: 'all', label: `全部 (${contents.length})` },
    { key: 'vlog', label: `Vlog (${contents.filter(c => c.contentType === 'vlog').length})` },
    { key: 'oral', label: `口播 (${contents.filter(c => c.contentType === 'oral').length})` },
  ];

  const filteredContents = activeFilter === 'all'
    ? contents
    : contents.filter(c => c.contentType === activeFilter);

  const sortedContents = [...filteredContents].sort((a, b) =>
    new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
  );

  // 格式化日期
  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now - d) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return '今天';
    if (diffDays === 1) return '昨天';
    if (diffDays < 7) return `${diffDays}天前`;
    return d.toLocaleDateString('zh-CN');
  };

  // 删除文案
  const handleDelete = async (id) => {
    if (!confirm('确定删除这条文案吗？')) return;
    try {
      await fetch(`/api/library?id=${id}`, { method: 'DELETE' });
      setContents(prev => prev.filter(c => c.id !== id));
      if (viewingContent?.id === id) setViewingContent(null);
      showToast('已删除');
    } catch { showToast('删除失败'); }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">文案库</h1>
            <p className="text-sm text-gray-400 mt-1">
              共 {contents.length} 篇文案
            </p>
          </div>
          {viewingContent && (
            <button className="btn btn-sm btn-secondary" onClick={() => setViewingContent(null)}>
              ← 返回
            </button>
          )}
        </div>

        {!viewingContent && (
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
        )}
      </div>

      {viewingContent ? (
        /* 详情视图 */
        <ContentDetailView
          content={viewingContent}
          onDelete={handleDelete}
          onBack={() => setViewingContent(null)}
        />
      ) : loading ? (
        <div className="space-y-3 mt-2">
          {[1,2,3,4].map(i => (
            <div key={i} className="card">
              <div className="skeleton h-5 w-2/3 mb-2" />
              <div className="skeleton h-3 w-1/3" />
            </div>
          ))}
        </div>
      ) : sortedContents.length === 0 ? (
        <div className="empty-state py-16">
          <svg className="mx-auto mb-4 opacity-30" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
          <p className="text-gray-400">还没有文案</p>
          <p className="text-gray-300 text-sm mt-1">去「创作」页面生成你的第一篇文案吧</p>
        </div>
      ) : (
        <div className="space-y-2 mt-2">
          {sortedContents.map((content) => {
            const body = content.body || {};
            const titles = content.titles || body.titleVariants || [];
            const hashtags = content.hashtags || body.hashtags || [];

            return (
              <div
                key={content.id}
                className="card card-clickable cursor-pointer"
                onClick={() => setViewingContent(content)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`badge ${content.contentType === 'vlog' ? 'badge-red' : 'badge-purple'} text-xs`}>
                        {content.contentType === 'vlog' ? '🎬 Vlog' : '🎤 口播'}
                      </span>
                      <span className="text-xs text-gray-300">{formatDate(content.createdAt)}</span>
                    </div>
                    <p className="font-medium text-sm leading-snug">{content.title || content.topicTitle}</p>
                    {content.topicTitle && content.title !== content.topicTitle && (
                      <p className="text-xs text-gray-400 mt-0.5">选题：{content.topicTitle}</p>
                    )}
                    <div className="flex items-center gap-1 mt-2 flex-wrap">
                      {titles.slice(0, 3).map((t, i) => (
                        <span key={i} className="text-xs text-gray-300 bg-white/5 rounded px-2 py-0.5 line-clamp-1 max-w-[120px]">
                          {t}
                        </span>
                      ))}
                      {titles.length > 3 && <span className="text-xs text-gray-300">+{titles.length - 3}</span>}
                    </div>
                  </div>
                  <button
                    className="btn btn-sm btn-danger flex-shrink-0"
                    onClick={(e) => { e.stopPropagation(); handleDelete(content.id); }}
                  >
                    删除
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!viewingContent && contents.length > 0 && (
        <div className="text-center text-xs text-gray-300 mt-6 mb-4">
          Vlog {contents.filter(c => c.contentType === 'vlog').length} 篇 ·
          口播 {contents.filter(c => c.contentType === 'oral').length} 篇
        </div>
      )}
    </div>
  );
}

// 详情视图
function ContentDetailView({ content, onDelete, onBack }) {
  const [copyTip, setCopyTip] = useState('');

  const copyText = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyTip(`${label} 已复制`);
      setTimeout(() => setCopyTip(''), 2000);
    } catch {
      setCopyTip('复制失败');
    }
  };

  if (!content) return null;

  const body = content.body || {};
  const titles = content.titles || body.titleVariants || [];
  const hashtags = content.hashtags || body.hashtags || [];
  const isVlog = content.contentType === 'vlog';

  return (
    <div className="space-y-3 mt-2">
      {copyTip && <div className="toast">{copyTip}</div>}

      {/* 头部 */}
      <div className="card">
        <div className="flex items-center gap-2 mb-2">
          <span className={`badge ${isVlog ? 'badge-red' : 'badge-purple'}`}>
            {isVlog ? '🎬 Vlog 脚本' : '🎤 口播文案'}
          </span>
          <span className="text-xs text-gray-300">
            {new Date(content.createdAt).toLocaleString('zh-CN')}
          </span>
        </div>
        <h2 className="text-lg font-bold">{content.title || content.topicTitle}</h2>
        {content.topicTitle && content.title !== content.topicTitle && (
          <p className="text-sm text-gray-400">选题：{content.topicTitle}</p>
        )}
      </div>

      {/* 正文内容 */}
      <div className="card">
        {isVlog ? (
          <VlogDetail body={body} onCopy={copyText} />
        ) : (
          <OralDetail body={body} onCopy={copyText} />
        )}
      </div>

      {/* 标题和标签 */}
      {(titles.length > 0 || hashtags.length > 0) && (
        <div className="card">
          {titles.length > 0 && (
            <div className="mb-3">
              <h3 className="font-bold text-sm mb-2">📌 标题备选</h3>
              <div className="space-y-1">
                {titles.map((t, i) => (
                  <div key={i} className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2">
                    <span className="text-xs text-gray-300 w-4">{i + 1}</span>
                    <span className="text-sm flex-1">{t}</span>
                    <button className="text-xs text-blue-400" onClick={() => copyText(t, '标题')}>复制</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {hashtags.length > 0 && (
            <div>
              <h3 className="font-bold text-sm mb-2">🏷️ 话题标签</h3>
              <div className="flex gap-1 flex-wrap">
                {hashtags.map((tag, i) => (
                  <span key={i} className="badge badge-blue cursor-pointer" onClick={() => copyText(tag, '标签')}>
                    {tag}
                  </span>
                ))}
              </div>
              <button
                className="btn btn-sm btn-secondary btn-block mt-2"
                onClick={() => copyText(hashtags.join(' '), '所有标签')}
              >
                复制所有标签
              </button>
            </div>
          )}
        </div>
      )}

      {/* 操作按钮 */}
      <div className="flex gap-2">
        <button
          className="btn btn-primary flex-1"
          onClick={() => {
            const fullText = [
              `【${content.title || content.topicTitle}】`,
              '',
              isVlog ? formatVlogForCopy(body) : formatOralForCopy(body),
              '',
              '---',
              `标题：${titles[0] || ''}`,
              `标签：${hashtags.join(' ')}`,
            ].join('\n');
            copyText(fullText, '全文');
          }}
        >
          复制全文发布
        </button>
        <button className="btn btn-danger" onClick={() => onDelete(content.id)}>
          删除
        </button>
      </div>
    </div>
  );
}

// Vlog 详情
function VlogDetail({ body, onCopy }) {
  if (!body) return <p className="text-gray-400">暂无内容</p>;
  if (body.raw) return <div className="text-sm whitespace-pre-wrap">{body.raw}</div>;

  return (
    <div className="space-y-3 text-sm">
      {body.overview && <p className="text-gray-400">{body.overview}</p>}
      {body.duration && <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>⏱ 预计时长：{body.duration}</p>}

      {body.storyNarration && (
        <div className="card mt-3" style={{ borderColor: 'rgba(0, 240, 255, 0.15)', background: 'rgba(0,240,255,0.03)' }}>
          <h3 className="font-bold mb-2" style={{ color: 'var(--cyan)' }}>🎙️ 故事配音文案</h3>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{body.storyNarration}</p>
          <button
            className="btn btn-sm btn-primary mt-2"
            onClick={() => {
              navigator.clipboard.writeText(body.storyNarration);
              showToast('配音文案已复制');
            }}
          >
            复制配音文案
          </button>
        </div>
      )}

      {body.script && body.script.length > 0 && (
        <div>
          <h3 className="font-bold mb-2">📋 分镜脚本</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr>
                  <th>#</th>
                  <th>时长</th>
                  <th>景别</th>
                  <th>画面</th>
                  <th>旁白</th>
                </tr>
              </thead>
              <tbody>
                {body.script.map((s, i) => (
                  <tr key={i}>
                    <td className="text-center font-bold">{s.scene || i + 1}</td>
                    <td>{s.duration}</td>
                    <td>{s.shotType}</td>
                    <td className="max-w-[120px]">{s.visual}</td>
                    <td className="max-w-[150px]">{s.narration}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {body.shootingTips && (
        <div className="bg-blue-500/10 rounded-xl p-3">
          <h3 className="font-bold mb-1 text-xs">🎥 拍摄建议</h3>
          <div className="text-xs">
            {body.shootingTips.location && <p>📍 {body.shootingTips.location}</p>}
            {body.shootingTips.props && <p>🎬 {body.shootingTips.props}</p>}
            {body.shootingTips.lighting && <p>💡 {body.shootingTips.lighting}</p>}
          </div>
        </div>
      )}

      {body.bgm && body.bgm.length > 0 && (
        <div>
          <h3 className="font-bold mb-1 text-xs">🎵 BGM</h3>
          <div className="flex gap-1 flex-wrap">
            {body.bgm.map((b, i) => <span key={i} className="badge badge-gray text-xs">{b}</span>)}
          </div>
        </div>
      )}

      {body.coverSuggestion && (
        <div>
          <h3 className="font-bold mb-1 text-xs">🖼️ 封面</h3>
          <p className="text-xs text-gray-500">{body.coverSuggestion}</p>
        </div>
      )}
    </div>
  );
}

// 口播详情
function OralDetail({ body, onCopy }) {
  if (!body) return <p className="text-gray-400">暂无内容</p>;
  if (body.raw) return <div className="text-sm whitespace-pre-wrap">{body.raw}</div>;

  return (
    <div className="space-y-3 text-sm">
      {body.hook && (
        <div className="bg-red-500/10 rounded-xl p-3 border-l-4 border-red-500/30">
          <p className="text-xs text-red-500 font-bold mb-1">🎯 开头钩子</p>
          <p>{body.hook}</p>
        </div>
      )}

      {body.body && body.body.length > 0 ? (
        <div>
          <h3 className="font-bold mb-2">📝 口播正文</h3>
          <div className="space-y-2">
            {body.body.map((s, i) => (
              <div key={i} className="bg-white/5 rounded-xl p-3">
                {s.tone && <span className="text-xs">{s.tone}</span>}
                <p className="text-sm leading-relaxed mt-1">{s.content}</p>
              </div>
            ))}
          </div>
        </div>
      ) : body.body && typeof body.body === 'string' ? (
        <div className="whitespace-pre-wrap leading-relaxed">
          {body.body}
        </div>
      ) : null}

      {body.keyQuotes && body.keyQuotes.length > 0 && (
        <div className="bg-yellow-500/10 rounded-xl p-3">
          <h3 className="font-bold mb-2">🏆 金句</h3>
          {body.keyQuotes.map((q, i) => (
            <p key={i} className="text-sm mb-1 last:mb-0">✨ {q}</p>
          ))}
        </div>
      )}

      {body.endingGuide && (
        <div className="bg-green-500/10 rounded-xl p-3">
          <h3 className="font-bold mb-1">👋 结尾</h3>
          <p>{body.endingGuide}</p>
        </div>
      )}

      {body.deliveryTips && (
        <div className="bg-purple-500/10 rounded-xl p-3">
          <h3 className="font-bold mb-1 text-xs">🎤 口播建议</h3>
          <p className="text-xs">{body.deliveryTips}</p>
        </div>
      )}
    </div>
  );
}

// 格式化 Vlog 为可复制文本
function formatVlogForCopy(body) {
  if (!body || body.raw) return body?.raw || '';
  let text = `【${body.title || 'Vlog 脚本'}】\n${body.overview || ''}\n`;
  if (body.duration) text += `⏱ 预计时长：${body.duration}\n`;

  if (body.script && body.script.length > 0) {
    text += '\n【分镜脚本】\n';
    body.script.forEach((s, i) => {
      text += `\n场景 ${s.scene || i + 1} [${s.duration || ''}] ${s.shotType || ''}\n`;
      text += `  画面：${s.visual || ''}\n`;
      text += `  旁白：${s.narration || ''}\n`;
      if (s.notes) text += `  备注：${s.notes}\n`;
    });
  }

  if (body.storyNarration) {
    text += `\n【故事配音文案】\n${body.storyNarration}\n`;
  }

  if (body.shootingTips) {
    text += '\n【拍摄建议】\n';
    if (body.shootingTips.location) text += `📍 场地：${body.shootingTips.location}\n`;
    if (body.shootingTips.props) text += `🎬 道具：${body.shootingTips.props}\n`;
    if (body.shootingTips.lighting) text += `💡 光线：${body.shootingTips.lighting}\n`;
  }

  if (body.bgm && body.bgm.length > 0) {
    text += `\n🎵 BGM：${body.bgm.join('、')}\n`;
  }

  if (body.coverSuggestion) {
    text += `\n🖼️ 封面：${body.coverSuggestion}\n`;
  }

  return text;
}

// 格式化口播为可复制文本
function formatOralForCopy(body) {
  if (!body || body.raw) return body?.raw || '';
  let text = `【${body.title || '口播文案'}】\n\n`;

  if (body.hook) {
    text += `【开头钩子】\n${body.hook}\n\n`;
  }

  if (body.body && Array.isArray(body.body)) {
    text += '【正文】\n\n';
    body.body.forEach(s => {
      text += `${s.content || ''}\n\n`;
    });
  } else if (body.body && typeof body.body === 'string') {
    text += `${body.body}\n\n`;
  }

  if (body.keyQuotes && body.keyQuotes.length > 0) {
    text += '【金句】\n';
    body.keyQuotes.forEach(q => { text += `✨ ${q}\n`; });
    text += '\n';
  }

  if (body.endingGuide) {
    text += `【结尾互动】\n${body.endingGuide}\n\n`;
  }

  return text;
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
