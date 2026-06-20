'use client';

import { useState, useEffect, use, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function GenerateContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialTopic = searchParams.get('topic') || '';
  const initialType = searchParams.get('type') || 'vlog';
  const initialId = searchParams.get('id') || '';

  const [topicTitle, setTopicTitle] = useState(initialTopic);
  const [topicAngle, setTopicAngle] = useState(searchParams.get('angle') || '');
  const [contentType, setContentType] = useState(initialType);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [allTopics, setAllTopics] = useState([]);
  const [copySuccess, setCopySuccess] = useState(false);

  // 加载选题列表
  useEffect(() => {
    fetch('/api/topics').then(r => r.json()).then(d => {
      if (d.success) setAllTopics(d.data);
    }).catch(() => {});
  }, []);

  const handleGenerate = async () => {
    if (!topicTitle.trim()) {
      showToast('请输入选题标题');
      return;
    }

    setGenerating(true);
    setResult(null);
    setError(null);
    setShowResult(true);

    try {
      // 先保存选题到库
      let topicId = initialId;
      if (!topicId) {
        // 检查是否已存在相同标题的选题
        const existing = allTopics.find(t => t.title === topicTitle.trim());
        if (existing) {
          topicId = existing.id;
        } else {
          const saveRes = await fetch('/api/topics', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: topicTitle.trim(),
              angle: topicAngle.trim(),
              type: contentType,
              sourceType: 'manual',
              status: 'confirmed',
            }),
          });
          const saved = await saveRes.json();
          if (saved.success) topicId = saved.data.id;
        }
      }

      const apiKey = localStorage.getItem('deepseek_api_key') || '';
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topicId,
          contentType,
          apiKey,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setResult(data.data);
      } else {
        setError(data.error || '生成失败');
      }
    } catch (e) {
      setError('生成失败：' + e.message);
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(true);
      showToast('已复制到剪贴板');
      setTimeout(() => setCopySuccess(false), 2000);
    } catch {
      showToast('复制失败，请手动复制');
    }
  };

  // 格式化内容为可复制的纯文本
  function formatContentForCopy(data, type) {
    if (!data) return '';
    if (data.raw) return data.raw;

    if (type === 'vlog') {
      let text = `【${data.title || 'Vlog 脚本'}】\n`;
      text += `${data.overview || ''}\n`;
      if (data.duration) text += `⏱ 预计时长：${data.duration}\n`;

      if (data.script && data.script.length > 0) {
        text += '\n【分镜脚本】\n';
        data.script.forEach((s, i) => {
          text += `\n场景 ${s.scene || i + 1} [${s.duration || ''}] ${s.shotType || ''}\n`;
          text += `  画面：${s.visual || ''}\n`;
          text += `  旁白：${s.narration || ''}\n`;
          if (s.notes) text += `  备注：${s.notes}\n`;
        });
      }

      if (data.storyNarration) {
        text += `\n【故事配音文案】\n${data.storyNarration}\n`;
      }

      if (data.shootingTips) {
        text += '\n【拍摄建议】\n';
        if (data.shootingTips.location) text += `📍 场地：${data.shootingTips.location}\n`;
        if (data.shootingTips.props) text += `🎬 道具：${data.shootingTips.props}\n`;
        if (data.shootingTips.lighting) text += `💡 光线：${data.shootingTips.lighting}\n`;
      }

      if (data.bgm && data.bgm.length > 0) {
        text += `\n🎵 BGM：${data.bgm.join('、')}\n`;
      }

      if (data.coverSuggestion) {
        text += `\n🖼️ 封面：${data.coverSuggestion}\n`;
      }

      return text;
    } else {
      let text = `【${data.title || '口播文案'}】\n\n`;

      if (data.hook) {
        text += `【开头钩子】\n${data.hook}\n\n`;
      }

      if (data.body && Array.isArray(data.body)) {
        text += '【正文】\n\n';
        data.body.forEach((s) => {
          text += `${s.content || ''}\n\n`;
        });
      } else if (data.body && typeof data.body === 'string') {
        text += `${data.body}\n\n`;
      }

      if (data.keyQuotes && data.keyQuotes.length > 0) {
        text += '【金句】\n';
        data.keyQuotes.forEach((q) => { text += `✨ ${q}\n`; });
        text += '\n';
      }

      if (data.endingGuide) {
        text += `【结尾互动】\n${data.endingGuide}\n\n`;
      }

      return text;
    }
  }

  // 渲染生成结果
  const renderResult = () => {
    if (!result) return null;

    const generated = result.generated || {};
    const titlesAndTags = result.titlesAndTags || {};
    const content = result.content || {};

    // 如果是原始 markdown（JSON 解析失败的情况）
    if (generated.raw) {
      return (
        <div className="markdown-body whitespace-pre-wrap text-sm">
          {generated.raw}
        </div>
      );
    }

    // Vlog 脚本渲染
    if (contentType === 'vlog') {
      return (
        <div className="space-y-4">
          {/* 标题 */}
          <div>
            <h2 className="text-lg font-bold mb-1">{generated.title || content.title}</h2>
            <p className="text-sm text-gray-400">{generated.overview}</p>
            {generated.duration && (
              <p className="text-xs text-gray-300 mt-1">预计时长：{generated.duration}</p>
            )}
          </div>

          {/* 故事配音文案 */}
          {generated.storyNarration && (
            <div className="card mt-3" style={{ borderColor: 'rgba(0, 240, 255, 0.15)', background: 'rgba(0,240,255,0.03)' }}>
              <h3 className="font-bold mb-2" style={{ color: 'var(--cyan)' }}>🎙️ 故事配音文案</h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{generated.storyNarration}</p>
              <button
                className="btn btn-sm btn-primary mt-2"
                onClick={() => copyToClipboard(generated.storyNarration)}
              >
                复制配音文案
              </button>
            </div>
          )}

          {/* 分镜脚本 */}
          {generated.script && generated.script.length > 0 && (
            <div>
              <h3 className="font-bold text-sm mb-2">📋 分镜脚本</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>时长</th>
                      <th>景别</th>
                      <th>画面</th>
                      <th>旁白/对话</th>
                      <th>备注</th>
                    </tr>
                  </thead>
                  <tbody>
                    {generated.script.map((s, i) => (
                      <tr key={i}>
                        <td className="text-center font-bold">{s.scene || i + 1}</td>
                        <td>{s.duration}</td>
                        <td>{s.shotType}</td>
                        <td className="max-w-[120px]">{s.visual}</td>
                        <td className="max-w-[150px]">{s.narration}</td>
                        <td className="max-w-[100px] text-gray-400">{s.notes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 拍摄建议 */}
          {generated.shootingTips && (
            <div className="bg-blue-500/10 rounded-xl p-3">
              <h3 className="font-bold text-sm mb-2">🎥 拍摄建议</h3>
              <div className="text-xs space-y-1">
                {generated.shootingTips.location && <p>📍 场地：{generated.shootingTips.location}</p>}
                {generated.shootingTips.props && <p>🎬 道具：{generated.shootingTips.props}</p>}
                {generated.shootingTips.lighting && <p>💡 光线：{generated.shootingTips.lighting}</p>}
              </div>
            </div>
          )}

          {/* BGM */}
          {generated.bgm && generated.bgm.length > 0 && (
            <div>
              <h3 className="font-bold text-sm mb-1">🎵 BGM 推荐</h3>
              <div className="flex gap-1 flex-wrap">
                {generated.bgm.map((b, i) => (
                  <span key={i} className="badge badge-gray">{b}</span>
                ))}
              </div>
            </div>
          )}

          {/* 封面 */}
          {generated.coverSuggestion && (
            <div>
              <h3 className="font-bold text-sm mb-1">🖼️ 封面建议</h3>
              <p className="text-xs text-gray-500">{generated.coverSuggestion}</p>
            </div>
          )}

          {/* 标题和标签 */}
          <hr className="border-white/10" />
          <TitleAndTagsSection titlesAndTags={titlesAndTags} generated={generated} onCopy={copyToClipboard} />
        </div>
      );
    }

    // 口播文案渲染
    return (
      <div className="space-y-4">
        {/* 标题 */}
        <h2 className="text-lg font-bold">{generated.title || content.title}</h2>

        {/* 钩子 */}
        {generated.hook && (
          <div className="bg-red-500/10 rounded-xl p-4 border-l-4 border-red-400">
            <p className="text-xs text-red-400 font-bold mb-1">🎯 开头钩子（3秒抓人）</p>
            <p className="text-sm">{generated.hook}</p>
          </div>
        )}

        {/* 正文 */}
        {generated.body && generated.body.length > 0 ? (
          <div>
            <h3 className="font-bold text-sm mb-2">📝 口播正文</h3>
            <div className="space-y-3">
              {generated.body.map((s, i) => (
                <div key={i} className="bg-white/5 rounded-xl p-3 border border-white/5">
                  <div className="flex items-center gap-1 mb-1">
                    {s.tone && <span className="text-xs">{s.tone}</span>}
                    {s.duration && <span className="text-xs text-gray-300 ml-auto">{s.duration}</span>}
                  </div>
                  <p className="text-sm leading-relaxed">{s.content}</p>
                </div>
              ))}
            </div>
          </div>
        ) : generated.body && typeof generated.body === 'string' ? (
          <div className="text-sm leading-relaxed whitespace-pre-wrap">
            {generated.body}
          </div>
        ) : null}

        {/* 金句 */}
        {generated.keyQuotes && generated.keyQuotes.length > 0 && (
          <div className="bg-yellow-500/10 rounded-xl p-3">
            <h3 className="font-bold text-sm mb-2">🏆 金句（方便截图传播）</h3>
            {generated.keyQuotes.map((q, i) => (
              <p key={i} className="text-sm mb-1 last:mb-0">✨ {q}</p>
            ))}
          </div>
        )}

        {/* 结尾 */}
        {generated.endingGuide && (
          <div className="bg-green-500/10 rounded-xl p-3">
            <h3 className="font-bold text-sm mb-1">👋 结尾互动</h3>
            <p className="text-sm">{generated.endingGuide}</p>
          </div>
        )}

        {/* 口播建议 */}
        {generated.deliveryTips && (
          <div className="bg-purple-500/10 rounded-xl p-3">
            <h3 className="font-bold text-sm mb-1">🎤 口播建议</h3>
            <p className="text-xs">{generated.deliveryTips}</p>
          </div>
        )}

        {/* 标题和标签 */}
        <hr className="border-white/10" />
        <TitleAndTagsSection titlesAndTags={titlesAndTags} generated={generated} onCopy={copyToClipboard} />
      </div>
    );
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="text-2xl font-bold">内容创作</h1>
        <p className="text-sm text-gray-400 mt-1">用 AI 生成 Vlog 脚本或口播文案</p>
      </div>

      {/* 输入表单 */}
      <div className="card mb-4">
        <div className="space-y-3">
          {/* 选题输入 */}
          <div>
            <label className="text-sm font-medium mb-1 block">选题标题 *</label>
            <input
              className="input"
              placeholder="输入你今天想做的选题..."
              value={topicTitle}
              onChange={(e) => setTopicTitle(e.target.value)}
            />
          </div>

          {/* 切入角度 */}
          <div>
            <label className="text-sm font-medium mb-1 block">切入角度（可选）</label>
            <input
              className="input"
              placeholder="从什么角度切入？让AI更懂你的想法..."
              value={topicAngle}
              onChange={(e) => setTopicAngle(e.target.value)}
            />
          </div>

          {/* 内容类型选择 */}
          <div>
            <label className="text-sm font-medium mb-2 block">内容类型</label>
            <div className="flex gap-2">
              <button
                className={`btn flex-1 ${contentType === 'vlog' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setContentType('vlog')}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
                Vlog 脚本
              </button>
              <button
                className={`btn flex-1 ${contentType === 'oral' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setContentType('oral')}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
                口播文案
              </button>
            </div>
          </div>

          {/* 快捷选题（来自选题库） */}
          {allTopics.filter(t => t.status === 'pending' || t.status === 'confirmed').length > 0 && (
            <div>
              <label className="text-sm font-medium mb-1 block">📂 从选题库选择</label>
              <select
                className="input text-sm"
                onChange={(e) => {
                  if (e.target.value) {
                    const t = allTopics.find(t => t.id === e.target.value);
                    if (t) {
                      setTopicTitle(t.title);
                      setTopicAngle(t.angle || '');
                      setContentType(t.type || 'vlog');
                    }
                  }
                }}
                value=""
              >
                <option value="">-- 选择一个已有选题 --</option>
                {allTopics.filter(t => t.status === 'pending' || t.status === 'confirmed').map(t => (
                  <option key={t.id} value={t.id}>{t.title}</option>
                ))}
              </select>
            </div>
          )}

          <button
            className="btn btn-primary btn-block btn-lg"
            onClick={handleGenerate}
            disabled={generating || !topicTitle.trim()}
          >
            {generating ? (
              <span className="flex items-center gap-2">
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                AI 创作中...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3v4"/><path d="M18 7l-2 2"/><path d="M18 17l-2-2"/><path d="M12 21v-4"/><path d="M6 17l2-2"/><path d="M6 7l2 2"/><path d="M3 12h4"/><path d="M17 12h4"/></svg>
                ✨ AI 生成{contentType === 'vlog' ? ' Vlog 脚本' : ' 口播文案'}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* 生成结果 */}
      {showResult && (
        <div className="card mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold">
              {generating ? '⏳ 正在生成...' : result ? '✅ 生成完成' : error ? '❌ 生成失败' : ''}
            </h2>
            {result && (
              <div className="flex gap-2">
                <button
                  className="btn btn-sm btn-secondary"
                  onClick={() => {
                    const titles = result.titlesAndTags?.titles || result.generated?.titleVariants || [];
                    const hashtags = result.titlesAndTags?.hashtags || result.generated?.hashtags || [];
                    const bodyText = formatContentForCopy(result.generated, contentType);
                    const fullText = [
                      bodyText,
                      '',
                      '---',
                      titles.length > 0 ? `标题：${titles[0]}` : '',
                      hashtags.length > 0 ? `标签：${hashtags.join(' ')}` : '',
                    ].filter(Boolean).join('\n');
                    copyToClipboard(fullText);
                  }}
                >
                  复制全文
                </button>
              </div>
            )}
          </div>

          {generating && (
            <div className="space-y-3">
              {[1,2,3].map(i => (
                <div key={i} className="skeleton h-12 rounded-lg" />
              ))}
              <p className="text-center text-sm text-gray-400 mt-3">
                AI 正在为你创作{contentType === 'vlog' ? ' Vlog 脚本' : ' 口播文案'}...
                <br />
                请稍等，大约需要 15-30 秒
              </p>
            </div>
          )}

          {error && (
            <div className="text-center py-6">
              <p className="text-red-400 mb-2">{error}</p>
              <p className="text-gray-400 text-xs">
                请检查 DeepSeek API Key 是否已正确配置
              </p>
              <button className="btn btn-primary btn-sm mt-3" onClick={handleGenerate}>
                重试
              </button>
            </div>
          )}

          {result && !generating && renderResult()}
        </div>
      )}

      {/* 使用提示 */}
      {!showResult && (
        <div className="card bg-blue-500/10 border border-blue-100">
          <h3 className="font-bold text-sm mb-2">💡 使用提示</h3>
          <ul className="text-xs text-gray-500 space-y-1">
            <li>1. 输入你想拍摄的**选题标题**（从热榜获得灵感，或用AI推荐）</li>
            <li>2. 可以加一个**切入角度**，让 AI 更精准</li>
            <li>3. 选择 **Vlog 脚本** 或 **口播文案**</li>
            <li>4. 点击生成，大约 15-30 秒后就能看到结果</li>
            <li>5. 每次生成的内容角度都不同，不用担心重复</li>
          </ul>
        </div>
      )}
    </div>
  );
}

// 标题和标签展示组件
function TitleAndTagsSection({ titlesAndTags, generated, onCopy }) {
  const titles = titlesAndTags.titles || generated.titleVariants || [];
  const hashtags = titlesAndTags.hashtags || generated.hashtags || [];

  if (titles.length === 0 && hashtags.length === 0) return null;

  return (
    <div className="space-y-3">
      {/* 标题 */}
      {titles.length > 0 && (
        <div>
          <h3 className="font-bold text-sm mb-2">📌 标题备选</h3>
          <div className="space-y-1">
            {titles.map((t, i) => (
              <div key={i} className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2">
                <span className="text-xs text-gray-300 w-4">{i + 1}</span>
                <span className="text-sm flex-1">{t}</span>
                <button
                  className="text-xs text-blue-400 flex-shrink-0"
                  onClick={() => onCopy(t)}
                >
                  复制
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 标签 */}
      {hashtags.length > 0 && (
        <div>
          <h3 className="font-bold text-sm mb-2">🏷️ 推荐话题标签</h3>
          <div className="flex gap-1 flex-wrap">
            {hashtags.map((tag, i) => (
              <span
                key={i}
                className="badge badge-blue cursor-pointer"
                onClick={() => onCopy(tag)}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 一键复制所有 */}
      <button
        className="btn btn-sm btn-secondary btn-block mt-2"
        onClick={() => {
          const text = `标题：${titles[0] || ''}\n\n标签：${hashtags.join(' ')}`;
          onCopy(text);
        }}
      >
        复制标题 + 标签
      </button>
    </div>
  );
}

export default function GeneratePage() {
  return (
    <Suspense fallback={<div className="page"><p className="text-center text-gray-400 py-16">加载中...</p></div>}>
      <GenerateContent />
    </Suspense>
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
