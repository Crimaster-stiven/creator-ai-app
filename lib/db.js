/**
 * 数据持久化层
 *
 * 生产环境（Vercel）：使用 Vercel KV (Redis)
 * 开发环境（本地）：使用内存存储（数据不持久化，重启后丢失）
 *
 * 在 Vercel 上部署时需添加 KV 存储：https://vercel.com/docs/storage/vercel-kv
 */

let kv;
let kvAvailable = false;

try {
  const mod = await import('@vercel/kv');
  kv = mod.kv;
  kvAvailable = !!process.env.KV_URL || !!process.env.KV_REST_API_URL;
} catch {
  kvAvailable = false;
}

// ========== 内存回退存储（开发环境） ==========

const memoryStore = {};

function getStore() {
  return kvAvailable ? kv : memoryStore;
}

// ========== 辅助函数 ==========

async function getData(key, defaultValue = null) {
  const store = getStore();
  if (kvAvailable) {
    try {
      const data = await store.get(key);
      return data !== null && data !== undefined ? data : defaultValue;
    } catch {
      return defaultValue;
    }
  }
  return key in store ? store[key] : defaultValue;
}

async function setData(key, data) {
  const store = getStore();
  if (kvAvailable) {
    try {
      await store.set(key, data);
    } catch (e) {
      console.warn('KV 写入失败，使用内存回退:', e.message);
      memoryStore[key] = data;
    }
  } else {
    store[key] = data;
  }
}

async function deleteData(key) {
  const store = getStore();
  if (kvAvailable) {
    try {
      await store.del(key);
    } catch (e) {
      console.warn('KV 删除失败:', e.message);
    }
  }
  delete memoryStore[key];
}

// ========== ID 生成 ==========

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// ========== 选题库 ==========

export async function getTopics() {
  return await getData('topics', []);
}

export async function addTopic(topic) {
  const topics = await getTopics();
  const newTopic = {
    id: generateId(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: 'pending',
    ...topic,
  };
  topics.push(newTopic);
  await setData('topics', topics);
  return newTopic;
}

export async function updateTopic(id, updates) {
  const topics = await getTopics();
  const index = topics.findIndex((t) => t.id === id);
  if (index === -1) return null;
  topics[index] = { ...topics[index], ...updates, updatedAt: new Date().toISOString() };
  await setData('topics', topics);
  return topics[index];
}

export async function deleteTopic(id) {
  const topics = await getTopics();
  const filtered = topics.filter((t) => t.id !== id);
  await setData('topics', filtered);
  return filtered.length < topics.length;
}

// ========== 文案库 ==========

export async function getContents() {
  return await getData('contents', []);
}

export async function addContent(content) {
  const contents = await getContents();
  const newContent = {
    id: generateId(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...content,
  };
  contents.push(newContent);
  await setData('contents', contents);
  return newContent;
}

export async function updateContent(id, updates) {
  const contents = await getContents();
  const index = contents.findIndex((c) => c.id === id);
  if (index === -1) return null;
  contents[index] = { ...contents[index], ...updates, updatedAt: new Date().toISOString() };
  await setData('contents', contents);
  return contents[index];
}

export async function deleteContent(id) {
  const contents = await getContents();
  const filtered = contents.filter((c) => c.id !== id);
  await setData('contents', filtered);
  return filtered.length < contents.length;
}

// ========== 已用角度（防重复） ==========

export async function getUsedAngles() {
  return await getData('used-angles', []);
}

export async function addUsedAngle(angle) {
  const angles = await getUsedAngles();
  angles.push({
    id: generateId(),
    text: angle,
    createdAt: new Date().toISOString(),
  });
  await setData('used-angles', angles);
}

// ========== 待办清单 ==========

export async function getTodos() {
  return await getData('todos', []);
}

export async function addTodo(todo) {
  const todos = await getTodos();
  const newTodo = {
    id: generateId(),
    text: todo.text,
    done: false,
    createdAt: new Date().toISOString(),
    ...todo,
  };
  todos.push(newTodo);
  await setData('todos', todos);
  return newTodo;
}

export async function updateTodo(id, updates) {
  const todos = await getTodos();
  const index = todos.findIndex((t) => t.id === id);
  if (index === -1) return null;
  todos[index] = { ...todos[index], ...updates };
  await setData('todos', todos);
  return todos[index];
}

export async function deleteTodo(id) {
  const todos = await getTodos();
  const filtered = todos.filter((t) => t.id !== id);
  await setData('todos', filtered);
  return filtered.length < todos.length;
}

// ========== 按日期的热点缓存 ==========

export async function getHotspotsByDate(dateStr) {
  const all = await getData('hotspots-date-cache', {});
  return all[dateStr] || null;
}

export async function setHotspotsByDate(dateStr, data) {
  const all = await getData('hotspots-date-cache', {});
  all[dateStr] = data;
  await setData('hotspots-date-cache', all);
}

// ========== 热搜缓存 ==========

export async function getHotspotsCache() {
  return await getData('hotspots-cache', null);
}

export async function setHotspotsCache(data) {
  await setData('hotspots-cache', {
    data,
    updatedAt: new Date().toISOString(),
  });
}

// ========== 风格设置 ==========

function getDefaultSettings() {
  return {
    nickname: '',
    vlogRatio: 50,
    oralRatio: 50,
    vlogTags: ['日常生活', '工作记录', '学习日常', '旅行'],
    oralTags: ['个人成长', '认知提升', '自律', '学习方法', '心态建设'],
    style: '真诚、亲切、有生活感',
    tone: '轻松自然',
  };
}

export async function getStyleSettings() {
  const settings = await getData('settings', null);
  return settings || getDefaultSettings();
}

export async function saveStyleSettings(settings) {
  await setData('settings', settings);
}
