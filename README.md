# 🎬 AI 创作助手 — 自媒体创作者的全能 AI Agent

> 把「刷热点 → 想选题 → 写文案 → 定标题」从每天 3 小时压缩到 15 分钟

## ✨ 功能

| 功能 | 说明 |
|------|------|
| 🔥 **今日热榜** | 聚合百度热搜 + 小红书 + 抖音 + B站热门话题 |
| 💡 **AI 选题推荐** | 基于热榜 + 你的风格，AI 推荐 10 个选题 |
| 🎬 **Vlog 脚本生成** | 输入选题 → 输出完整分镜脚本 + 拍摄建议 + BGM |
| 🎤 **口播文案生成** | 输入选题 → 输出口播稿 + 金句 + 标题变体 + 标签 |
| 📂 **选题库** | 管理所有选题，标记状态（待确认/已确认/已产出） |
| 📚 **文案库** | 保存所有历史文案，随时查阅和复制 |
| 📱 **移动端适配** | 手机浏览器打开，体验和 App 一样 |

## 🚀 快速开始

### 方法一：本地运行（推荐，免费）

```bash
# 1. 进入项目目录
cd "creator-ai-app"

# 2. 安装依赖（已完成）
npm install

# 3. 启动
npm run dev
```

打开浏览器访问 **http://localhost:3000**

### 方法二：部署到 Vercel（推荐，可外网访问）

> 一键部署，点击即用，手机电脑都能访问。

1. [Fork/导入此仓库](https://vercel.com/new) 到 Vercel
2. 在 Vercel 项目设置中：
   - 添加环境变量：`DEEPSEEK_API_KEY=你的key`
   - 添加 **Vercel KV Storage**（项目控制台 → Storage → Create → KV）
3. 部署完成后会得到一个公网 URL（如 `creator-ai-app.vercel.app`）
4. 手机上直接打开即可使用，支持添加到主屏幕

> 💡 **Vercel KV 免费版足够**：256MB 存储，每月 30 天数据持久化。
> 部署后所有数据（选题、文案、待办）都会保存在 KV 中，重启不丢失。

## 🔑 配置 API Key

本应用使用 **DeepSeek API** 驱动 AI 功能，性价比极高（¥20 够用几个月）。

### 获取 API Key

1. 打开 [platform.deepseek.com](https://platform.deepseek.com)
2. 注册账号 → 进入 API Keys 页面
3. 创建一个 API Key（格式：`sk-...`）
4. 充值 ¥20-50

### 配置方式（任选一种）

**方式 A：在应用设置页面配置（推荐）**
1. 启动应用后，点击底部导航「设置」
2. 在 AI 配置中输入你的 API Key
3. 点击保存 — 立即可用

**方式 B：环境变量配置**
1. 打开项目根目录的 `.env.local` 文件
2. 填入你的 API Key：
   ```
   DEEPSEEK_API_KEY=sk-你的key
   ```
3. 重启应用

## 📱 在手机上使用

部署到 Vercel 后，直接在手机浏览器打开 URL：
- 添加到主屏幕（iOS Safari：分享 → 添加到主屏幕）
- 体验和小程序几乎一样
- 支持底部导航、手势操作

## 📖 使用流程

```
每天打开 App → 刷今日热榜（30秒）
              → 点击「AI 推荐选题」（2分钟）
              → 选中 1-2 个想做 → 选择 Vlog/口播
              → AI 自动生成完整文案 + 标题 + 标签（30秒）
              → 复制 → 发布到小红书/抖音/B站
```

## 🏗️ 技术栈

- **前端**: Next.js 16 + Tailwind CSS
- **后端**: Next.js API Routes
- **AI**: DeepSeek API（可选 Claude/GPT）
- **存储**: Vercel KV (Redis) — 生产环境持久化；本地开发使用内存存储
- **部署**: Vercel（免费）/ 任意 Node.js 服务器

## 📁 项目结构

```
creator-ai-app/
├── app/
│   ├── page.js              # 首页：今日热榜
│   ├── topics/page.js       # 选题库 + AI推荐
│   ├── generate/page.js     # 内容创作（Vlog/口播）
│   ├── library/page.js      # 文案库
│   ├── settings/page.js     # 设置页面
│   ├── api/                 # API 路由
│   │   ├── hotspots/        # 热点采集
│   │   ├── topics/          # 选题管理
│   │   ├── topics-recommend/# AI选题推荐
│   │   ├── generate/        # AI文案生成
│   │   ├── library/         # 文案库管理
│   │   └── settings/        # 设置
│   ├── layout.js            # 布局（底部导航）
│   └── globals.css          # 全局样式
├── lib/
│   ├── ai.js                # AI API 集成
│   ├── db.js                # 数据存储（Vercel KV / 内存回退）
│   └── hotspots.js          # 热点采集（fetch 版）
└── data/                    # 本地开发缓存数据（生产环境使用 KV）
```

## 💰 费用估算

| 项目 | 费用 |
|------|------|
| DeepSeek API | ¥20-50/月（充值一次用很久） |
| 服务器（本地运行） | ¥0 |
| 服务器（Vercel 部署） | ¥0（免费套餐足够） |
| **总计** | **¥20-50/月** |

## ❓ 常见问题

**Q: 需要写代码吗？**
A: 完全不需要。按照 README 一步步操作即可。

**Q: 生成的文案会重复吗？**
A: 每次生成都是独特的。AI 会分析不同的切入角度，避免雷同。

**Q: 支持哪些平台的内容？**
A: 小红书、抖音、B站、视频号都支持。生成结果都是通用格式，可直接使用。

**Q: 数据安全吗？**
A: 部署到 Vercel 后，数据存储在 Vercel KV（Redis）中，由 Vercel 负责安全。本地运行时使用内存存储。

## 📞 需要帮助？

直接问我！我可以帮你：
- 调整 Prompt 模板，让文案更符合你的风格
- 部署到 Vercel，生成可外网访问的链接
- 添加更多功能
