'use client';

import { useState, useEffect } from 'react';

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState('');
  const [saved, setSaved] = useState(false);
  const [nickname, setNickname] = useState('');
  const [style, setStyle] = useState('真诚、亲切、有生活感');
  const [tone, setTone] = useState('轻松自然');
  const [vlogRatio, setVlogRatio] = useState(50);
  const [oralRatio, setOralRatio] = useState(50);

  useEffect(() => {
    // 加载本地存储的设置
    const storedKey = localStorage.getItem('deepseek_api_key') || '';
    const storedNickname = localStorage.getItem('creator_nickname') || '';
    const storedStyle = localStorage.getItem('creator_style') || '真诚、亲切、有生活感';
    const storedTone = localStorage.getItem('creator_tone') || '轻松自然';
    const storedVlogRatio = parseInt(localStorage.getItem('creator_vlog_ratio') || '50');

    setApiKey(storedKey);
    setNickname(storedNickname);
    setStyle(storedStyle);
    setTone(storedTone);
    setVlogRatio(storedVlogRatio);
    setOralRatio(100 - storedVlogRatio);
  }, []);

  const handleSave = () => {
    // 保存到 localStorage
    if (apiKey) localStorage.setItem('deepseek_api_key', apiKey);
    localStorage.setItem('creator_nickname', nickname);
    localStorage.setItem('creator_style', style);
    localStorage.setItem('creator_tone', tone);
    localStorage.setItem('creator_vlog_ratio', String(vlogRatio));

    // 也保存到服务端
    fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nickname,
        vlogRatio,
        oralRatio: 100 - vlogRatio,
        style,
        tone,
        vlogTags: ['日常生活', '工作记录', '学习日常', '旅行'],
        oralTags: ['个人成长', '认知提升', '自律', '学习方法', '心态建设'],
      }),
    }).catch(() => {});

    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    showToast('设置已保存');
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="text-2xl font-bold">设置</h1>
        <p className="text-sm text-gray-400 mt-1">配置你的创作偏好</p>
      </div>

      {/* AI 配置 */}
      <div className="card mb-4">
        <h2 className="font-bold mb-3">🤖 AI 配置</h2>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium block mb-1">
              DeepSeek API Key <span className="text-red-500">*</span>
            </label>
            <input
              className="input"
              type="password"
              placeholder="sk-..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
            <p className="text-xs text-gray-400 mt-1">
              在 platform.deepseek.com 注册获取，充值 ¥20 够用几个月
            </p>
          </div>
        </div>
      </div>

      {/* 创作者信息 */}
      <div className="card mb-4">
        <h2 className="font-bold mb-3">👤 创作者信息</h2>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium block mb-1">你的昵称</label>
            <input
              className="input"
              placeholder="你的创作者昵称"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">内容风格</label>
            <input
              className="input"
              placeholder="如：真诚、亲切、有生活感"
              value={style}
              onChange={(e) => setStyle(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">语言风格</label>
            <input
              className="input"
              placeholder="如：轻松自然"
              value={tone}
              onChange={(e) => setTone(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* 内容方向 */}
      <div className="card mb-4">
        <h2 className="font-bold mb-3">📊 内容方向</h2>
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Vlog 占比</span>
              <span className="text-sm font-bold text-red-500">{vlogRatio}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={vlogRatio}
              onChange={(e) => {
                setVlogRatio(parseInt(e.target.value));
                setOralRatio(100 - parseInt(e.target.value));
              }}
              className="w-full accent-red-500"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>🎬 Vlog {vlogRatio}%</span>
              <span>🎤 口播 {oralRatio}%</span>
            </div>
          </div>

          <div className="bg-blue-50 rounded-xl p-3">
            <p className="text-xs text-blue-600">
              💡 AI 会根据这个比例，在选题推荐和文案生成时调整内容类型的侧重
            </p>
          </div>
        </div>
      </div>

      {/* 保存按钮 */}
      <button
        className={`btn btn-block btn-lg ${saved ? 'btn-secondary' : 'btn-primary'}`}
        onClick={handleSave}
      >
        {saved ? '✅ 已保存' : '💾 保存设置'}
      </button>

      {/* 使用说明 */}
      <div className="card bg-gray-50 mt-4">
        <h3 className="font-bold text-sm mb-2">📖 使用说明</h3>
        <div className="text-xs text-gray-500 space-y-1">
          <p>1. 在 <strong>platform.deepseek.com</strong> 注册账号</p>
          <p>2. 进入 API Keys 页面，创建一个 API Key</p>
          <p>3. 充值 ¥20-50（足够用几个月）</p>
          <p>4. 把 API Key 粘贴到上方输入框</p>
          <p>5. 设置你的创作偏好，保存即可开始使用</p>
        </div>
      </div>

      <div className="h-8" />
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
