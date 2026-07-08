'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import './globals.css';

export default function RootLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();

  // 底部导航配置
  const navItems = [
    {
      key: 'hotspots',
      label: '热榜',
      path: '/',
      icon: (active) => active ? fireIconFilled() : fireIcon(),
    },
    {
      key: 'analyze',
      label: '分析',
      path: '/analyze',
      icon: (active) => active ? searchIconFilled() : searchIcon(),
    },
    {
      key: 'topics',
      label: '选题',
      path: '/topics',
      icon: (active) => active ? lightbulbIconFilled() : lightbulbIcon(),
    },
    {
      key: 'generate',
      label: '创作',
      path: '/generate',
      icon: (active) => active ? sparkleIconFilled() : sparkleIcon(),
    },
    {
      key: 'library',
      label: '文库',
      path: '/library',
      icon: (active) => active ? folderIconFilled() : folderIcon(),
    },
    {
      key: 'todos',
      label: '待办',
      path: '/todos',
      icon: (active) => active ? checkIconFilled() : checkIcon(),
    },
  ];

  return (
    <html lang="zh-CN" className="h-full">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <meta name="theme-color" content="#FF6B6B" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <title>AI 创作助手</title>
      </head>
      <body className="min-h-full">
        <main className="pb-20">
          {children}
        </main>

        {/* 底部导航 */}
        <nav className="bottom-nav safe-bottom">
          {navItems.map((item) => {
            const isActive = item.key === 'hotspots'
              ? pathname === '/'
              : pathname.startsWith(item.path) && item.path !== '/';

            return (
              <button
                key={item.key}
                className={`nav-item ${isActive ? 'active' : ''}`}
                onClick={() => router.push(item.path)}
              >
                {item.icon(isActive)}
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </body>
    </html>
  );
}

// SVG 图标组件
function fireIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>;
}
function fireIconFilled() {
  return <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>;
}

function lightbulbIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>;
}
function lightbulbIconFilled() {
  return <svg viewBox="0 0 24 24" fill="currentColor"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>;
}

function sparkleIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v4"/><path d="M18 7l-2 2"/><path d="M18 17l-2-2"/><path d="M12 21v-4"/><path d="M6 17l2-2"/><path d="M6 7l2 2"/><path d="M3 12h4"/><path d="M17 12h4"/></svg>;
}
function sparkleIconFilled() {
  return <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3c.132 0 .263 0 .393 0a7.5 7.5 0 0 0 7.92 12.607a7.5 7.5 0 0 1-3.5-6.795V9a7.5 7.5 0 0 0-4.813-6z"/><path d="M9.25 7.5a4.25 4.25 0 0 0 4.25 4.25a4.25 4.25 0 0 0-4.25-4.25z"/></svg>;
}

function folderIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/></svg>;
}
function folderIconFilled() {
  return <svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/></svg>;
}

function searchIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
}
function searchIconFilled() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
}

function checkIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>;
}
function checkIconFilled() {
  return <svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>;
}
