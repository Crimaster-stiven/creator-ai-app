'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function TodosPage() {
  const [todos, setTodos] = useState([]);
  const [newTodo, setNewTodo] = useState('');
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const router = useRouter();

  // 🍅 番茄钟
  const [pomodoroMode, setPomodoroMode] = useState('focus'); // focus | break
  const [pomodoroRunning, setPomodoroRunning] = useState(false);
  const [pomodoroSeconds, setPomodoroSeconds] = useState(25 * 60); // 25分钟
  const [pomodoroActiveTodo, setPomodoroActiveTodo] = useState(null);
  const [pomodoroCount, setPomodoroCount] = useState(0);
  const [todaySeconds, setTodaySeconds] = useState(0);
  const [pomodoroHistory, setPomodoroHistory] = useState([]);

  // 初始化番茄钟数据
  useEffect(() => {
    const saved = localStorage.getItem('pomodoro_today_seconds');
    if (saved) setTodaySeconds(parseInt(saved));
    const savedCount = localStorage.getItem('pomodoro_count');
    if (savedCount) setPomodoroCount(parseInt(savedCount));
    const savedHistory = localStorage.getItem('pomodoro_history');
    if (savedHistory) setPomodoroHistory(JSON.parse(savedHistory));
  }, []);

  // 番茄钟计时
  useEffect(() => {
    let interval;
    if (pomodoroRunning) {
      interval = setInterval(() => {
        setPomodoroSeconds(prev => {
          if (prev <= 1) {
            // 时间到
            setPomodoroRunning(false);
            if (pomodoroMode === 'focus') {
              const newCount = pomodoroCount + 1;
              setPomodoroCount(newCount);
              localStorage.setItem('pomodoro_count', String(newCount));
              // 记录完成的番茄
              const entry = {
                id: Date.now(),
                type: 'focus',
                todoId: pomodoroActiveTodo,
                todoText: pomodoroActiveTodo ? todos.find(t => t.id === pomodoroActiveTodo)?.text : '通用',
                duration: 25 * 60,
                completedAt: new Date().toISOString(),
              };
              const newHistory = [...pomodoroHistory, entry];
              setPomodoroHistory(newHistory);
              localStorage.setItem('pomodoro_history', JSON.stringify(newHistory));
              // 切换到休息
              setPomodoroMode('break');
              setPomodoroSeconds(5 * 60);
              showToast('🍅 番茄完成！休息5分钟');
            } else {
              setPomodoroMode('focus');
              setPomodoroSeconds(25 * 60);
              showToast('⏰ 休息结束，开始新的番茄！');
            }
            return 0;
          }
          // 记录今天专注时间
          setTodaySeconds(td => {
            const ns = td + 1;
            localStorage.setItem('pomodoro_today_seconds', String(ns));
            return ns;
          });
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [pomodoroRunning, pomodoroMode, pomodoroCount, pomodoroActiveTodo, pomodoroHistory, todos]);

  const togglePomodoro = (todoId) => {
    if (pomodoroRunning) {
      setPomodoroRunning(false);
    } else {
      setPomodoroActiveTodo(todoId || null);
      if (pomodoroMode === 'focus' && pomodoroSeconds <= 0) setPomodoroSeconds(25 * 60);
      if (pomodoroMode === 'break' && pomodoroSeconds <= 0) setPomodoroSeconds(5 * 60);
      setPomodoroRunning(true);
    }
  };

  const resetPomodoro = () => {
    setPomodoroRunning(false);
    setPomodoroMode('focus');
    setPomodoroSeconds(25 * 60);
  };

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  // 计算统计
  const todayMinutes = Math.floor(todaySeconds / 60);
  const weekSeconds = pomodoroHistory
    .filter(e => {
      const d = new Date(e.completedAt);
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return d > weekAgo;
    })
    .reduce((sum, e) => sum + (e.duration || 0), 0);
  const weekMinutes = Math.floor(weekSeconds / 60);

  const fetchTodos = async () => {
    try {
      const res = await fetch('/api/todos');
      const data = await res.json();
      if (data.success) setTodos(data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTodos(); }, []);

  const addTodo = async () => {
    if (!newTodo.trim()) return;
    try {
      const res = await fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: newTodo.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setTodos(prev => [data.data, ...prev]);
        setNewTodo('');
      }
    } catch { showToast('添加失败'); }
  };

  const toggleTodo = async (id, done) => {
    try {
      await fetch('/api/todos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, done: !done }),
      });
      setTodos(prev => prev.map(t => t.id === id ? { ...t, done: !done } : t));
    } catch { showToast('更新失败'); }
  };

  const deleteTodo = async (id) => {
    try {
      await fetch(`/api/todos?id=${id}`, { method: 'DELETE' });
      setTodos(prev => prev.filter(t => t.id !== id));
      showToast('已删除');
    } catch { showToast('删除失败'); }
  };

  const filteredTodos = filter === 'all' ? todos
    : filter === 'active' ? todos.filter(t => !t.done)
    : todos.filter(t => t.done);

  const sortedTodos = [...filteredTodos].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
  });

  const doneCount = todos.filter(t => t.done).length;
  const activeCount = todos.filter(t => !t.done).length;

  return (
    <div className="page">
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold gradient-text">待办清单</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
              已完成 {doneCount} · 待完成 {activeCount}
            </p>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => router.push('/settings')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
          </button>
        </div>
      </div>

      {/* 🍅 番茄钟 */}
      <div className="card mb-4" style={{ borderColor: pomodoroRunning ? 'rgba(0, 240, 255, 0.3)' : 'rgba(255,255,255,0.06)' }}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">🍅</span>
            <span className="font-bold" style={{ fontSize: 13 }}>
              番茄钟
              {pomodoroMode === 'focus' ? '（专注中）' : '（休息中）'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>今日 {todayMinutes}分钟</span>
            <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>本周 {weekMinutes}分钟</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl font-bold" style={{
              fontFamily: 'var(--font-mono)',
              color: pomodoroMode === 'focus' ? 'var(--cyan)' : 'var(--green)',
              textShadow: pomodoroRunning ? '0 0 20px rgba(0,240,255,0.3)' : 'none',
            }}>
              {formatTime(pomodoroSeconds)}
            </span>
            <div className="flex flex-col">
              <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                番茄 #{pomodoroCount + 1}
              </span>
              <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                {pomodoroActiveTodo ? todos.find(t => t.id === pomodoroActiveTodo)?.text?.slice(0, 20) || '专注中' : '专注中'}
              </span>
            </div>
          </div>

          <div className="flex gap-1">
            <button
              className={`btn btn-sm ${pomodoroRunning ? 'btn-danger' : 'btn-primary'}`}
              onClick={() => togglePomodoro()}
            >
              {pomodoroRunning ? '⏹ 停止' : '▶ 开始'}
            </button>
            <button className="btn btn-sm btn-ghost" onClick={resetPomodoro}>
              ⟳
            </button>
          </div>
        </div>

        {/* 进度条 */}
        <div className="heat-bar mt-2">
          <div
            className="heat-bar-fill"
            style={{
              width: `${((pomodoroMode === 'focus' ? 25 * 60 - pomodoroSeconds : 5 * 60 - pomodoroSeconds) / (pomodoroMode === 'focus' ? 25 * 60 : 5 * 60)) * 100}%`,
              background: pomodoroMode === 'focus' ? 'var(--gradient-1)' : 'var(--gradient-3)',
            }}
          />
        </div>
      </div>

      {/* 输入区域 */}
      <div className="flex gap-2 mb-4">
        <input
          className="input flex-1"
          placeholder="添加新的待办事项..."
          value={newTodo}
          onChange={(e) => setNewTodo(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addTodo()}
        />
        <button className="btn btn-primary" onClick={addTodo} disabled={!newTodo.trim()}>
          添加
        </button>
      </div>

      {/* 筛选 */}
      <div className="flex gap-2 mb-4">
        {[
          { key: 'all', label: `全部 ${todos.length}` },
          { key: 'active', label: `进行中 ${activeCount}` },
          { key: 'done', label: `已完成 ${doneCount}` },
        ].map(f => (
          <button
            key={f.key}
            className={`badge cursor-pointer ${filter === f.key ? 'badge-cyan' : 'badge-gray'}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* 列表 */}
      {loading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="skeleton h-14 rounded-xl" />)}</div>
      ) : sortedTodos.length === 0 ? (
        <div className="empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.3 }}><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
          <p style={{ color: 'var(--text-muted)' }} className="mt-3">
            {filter === 'all' ? '还没有待办事项，添加一条吧' : filter === 'active' ? '没有进行中的待办' : '没有已完成的待办'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {sortedTodos.map(todo => (
            <div key={todo.id} className="card flex items-center gap-3 py-3 px-4">
              <button
                className={`todo-checkbox ${todo.done ? 'checked' : ''}`}
                onClick={() => toggleTodo(todo.id, todo.done)}
              />
              <div className="flex-1 min-w-0">
                <p className={`todo-text ${todo.done ? 'done' : ''}`}>{todo.text}</p>
                <p style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 2 }}>
                  {new Date(todo.createdAt).toLocaleDateString('zh-CN')}
                </p>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => deleteTodo(todo.id)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--red)" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 统计 */}
      {todos.length > 0 && (
        <div className="text-center mt-6">
          <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>
            完成率 {todos.length > 0 ? Math.round(doneCount / todos.length * 100) : 0}%
          </p>
        </div>
      )}
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
