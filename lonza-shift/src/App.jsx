import { useEffect, useState } from 'react';
import { CONFIG, getStatus, todayKey } from './schedule';
import Pixel from './themes/Pixel';
import Minimal from './themes/Minimal';
import Paper from './themes/Paper';
import Museum from './themes/Museum';
import FishTank from './themes/FishTank';
import NeonCity from './themes/NeonCity';

// 第一个是默认风格
const THEMES = [
  { id: 'minimal', label: '极简', Component: Minimal },
  { id: 'pixel', label: '像素', Component: Pixel },
  { id: 'tank', label: '3D鱼缸', Component: FishTank },
  { id: 'museum', label: '博物馆', Component: Museum },
  { id: 'neoncity', label: '霓虹街', Component: NeonCity },
  { id: 'paper', label: '日历', Component: Paper },
];
// 旧风格合并后，之前选过的人自动换到新风格
const ALIASES = { three: 'tank', aquarium: 'tank', neon: 'neoncity', city: 'neoncity' };
const STORAGE_KEY = 'lonza-shift-style-v2';

function loadTheme() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const saved = ALIASES[raw] || raw;
    if (THEMES.some((t) => t.id === saved)) return saved;
  } catch {
    /* 隐私模式等情况下 localStorage 不可用，用默认风格 */
  }
  return THEMES[0].id;
}

// 可以用 ?date=2026-12-04 预览某一天
function currentKey() {
  const q = new URLSearchParams(window.location.search).get('date');
  return q && /^\d{4}-\d{2}-\d{2}$/.test(q) ? q : todayKey();
}

/** 跨过午夜时自动刷新 */
function useTodayKey() {
  const [key, setKey] = useState(currentKey);
  useEffect(() => {
    const tick = () => setKey(currentKey());
    const id = setInterval(tick, 30000);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
    };
  }, []);
  return key;
}

export default function App() {
  const [theme, setTheme] = useState(loadTheme);
  const status = getStatus(useTodayKey());

  // 只在访客自己点选时才记住
  const choose = (id) => {
    setTheme(id);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    document.title = `${status.work ? '今天上班' : '今天休息'} · ${CONFIG.workplace}`;
  }, [status.work]);

  const { Component } = THEMES.find((t) => t.id === theme);

  return (
    <div className={`app theme-${theme} ${status.work ? 'is-work' : 'is-off'}`}>
      <Component s={status} />
      <footer className="foot">
        <nav className="switcher" aria-label="切换风格">
          {THEMES.map((t) => (
            <button
              key={t.id}
              type="button"
              className={t.id === theme ? 'active' : ''}
              aria-pressed={t.id === theme}
              onClick={() => choose(t.id)}
            >
              {t.label}
            </button>
          ))}
        </nav>
        <p className="note">按 2-2-3 轮班推算 · 美东时间</p>
      </footer>
    </div>
  );
}
