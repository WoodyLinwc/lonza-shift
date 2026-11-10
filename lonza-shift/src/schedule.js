// ============================================================
//  班表设置 —— 以后改班表只需要改这里
// ============================================================
export const CONFIG = {
  workplace: 'Lonza',

  // 用美东时间判断“今天”，不管访客在哪个时区看到的都一样
  timeZone: 'America/New_York',

  // 循环的第一天（2026-11-30，周一）
  cycleStart: '2026-11-30',

  // 14 天一轮，1 = 上班，0 = 休息（2-2-3 轮班）
  //         一 二 三 四 五 六 日 | 一 二 三 四 五 六 日
  pattern: [1, 1, 0, 0, 1, 1, 1,   0, 0, 1, 1, 0, 0, 0],

  // 临时调整：请假、调班、加班写在这里，会覆盖上面的规律
  // 1 = 上班，0 = 休息
  overrides: {
    // '2026-12-24': 0,
  },
};

const DAY_MS = 86400000;
const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

const toNum = (key) => {
  const [y, m, d] = key.split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / DAY_MS);
};
const toKey = (n) => new Date(n * DAY_MS).toISOString().slice(0, 10);

/** 当前在指定时区的日期，格式 YYYY-MM-DD */
export function todayKey(timeZone = CONFIG.timeZone, now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const get = (t) => parts.find((p) => p.type === t).value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

export function isWorkDay(key) {
  if (key in CONFIG.overrides) return Boolean(CONFIG.overrides[key]);
  const len = CONFIG.pattern.length;
  const offset = toNum(key) - toNum(CONFIG.cycleStart);
  return CONFIG.pattern[((offset % len) + len) % len] === 1;
}

export function dayInfo(key) {
  const d = new Date(toNum(key) * DAY_MS);
  return {
    key,
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    date: d.getUTCDate(),
    weekday: WEEKDAYS[d.getUTCDay()],
    work: isWorkDay(key),
  };
}

/** 今天的状态 + 这一段连续上班/休息的位置 + 下次切换 + 未来 14 天 */
export function getStatus(key) {
  const today = dayInfo(key);
  const n0 = toNum(key);
  const same = (n) => isWorkDay(toKey(n)) === today.work;

  let start = n0;
  while (same(start - 1) && n0 - start < 60) start--;
  let end = n0;
  while (same(end + 1) && end - n0 < 60) end++;

  return {
    today,
    work: today.work,
    runDay: n0 - start + 1,
    runLength: end - start + 1,
    next: dayInfo(toKey(end + 1)),
    inDays: end + 1 - n0,
    upcoming: Array.from({ length: 14 }, (_, i) => dayInfo(toKey(n0 + i))),
  };
}

export const fmtDate = (d) => `${d.month}月${d.date}日`;
export const fmtWeek = (d) => `周${d.weekday}`;
export const relDay = (n) => (n === 1 ? '明天' : n === 2 ? '后天' : `${n} 天后`);
