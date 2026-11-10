import Strip from '../Strip';
import { CONFIG, fmtDate, fmtWeek, relDay } from '../schedule';

/** 用字符画画像素图：每个字符一个像素，'.' 为透明 */
export function Sprite({ map, palette, scale = 4, className, label }) {
  const rows = map.trim().split('\n').map((r) => r.trim());
  const w = Math.max(...rows.map((r) => r.length));
  const rects = [];
  rows.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      if (ch !== '.' && palette[ch]) {
        rects.push(<rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill={palette[ch]} />);
      }
    }),
  );
  return (
    <svg
      className={className}
      viewBox={`0 0 ${w} ${rows.length}`}
      width={w * scale}
      height={rows.length * scale}
      shapeRendering="crispEdges"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {rects}
    </svg>
  );
}

export const FLASK = `
.....KKKKKK.....
.....KWWWWK.....
......KWWK......
......KWWK......
......KWWK......
.....KWWWWK.....
....KWWWWWWK....
....KWWLWWWK....
...KGGGGGGGGK...
...KGLGGGGGGK...
..KGGGGGGLGGGK..
..KGGLGGGGGGGK..
.KGGGGGGGGGLGGK.
.KGGGGGGGGGGGGK.
.KKKKKKKKKKKKKK.
`;

export const MUG = `
....S...S.......
.....S...S......
....S...S.......
................
..KKKKKKKKK.....
..KCCCCCCCK.....
..KWWRWRWWKKK...
..KWRRRRRWK.K...
..KWWRRRWWK.K...
..KWWWRWWWKKK...
..KWWWWWWWK.....
...KWWWWWK......
....KKKKK.......
`;

const SUN = `
....Y..Y....
.Y........Y.
...YYYYYY...
..YOOYYYYY..
Y.YOYYYYYY.Y
..YYYYYYYY..
..YYYYYYYY..
Y.YYYYYYYY.Y
..YYYYYYYY..
...YYYYYY...
.Y........Y.
....Y..Y....
`;

const CLOUD = `
.....WWWW.......
...WWWWWWWW.....
.WWWWWWWWWWWWW..
WWWWWWWWWWWWWWWW
.SSSSSSSSSSSSSS.
`;

const ICON_PALETTE = {
  K: '#3b1f0f',
  W: '#eaf6ff',
  L: '#c4f7a8',
  G: '#58c85f',
  C: '#7a4a24',
  R: '#e5484d',
  S: '#ffffff',
};

export default function Pixel({ s }) {
  const { today, work, next, inDays } = s;
  return (
    <main className="px-scene">
      <div className="px-sky" aria-hidden="true">
        <Sprite map={SUN} palette={{ Y: '#ffd23f', O: '#fff6c2' }} scale={6} className="px-sun" />
        <Sprite map={CLOUD} palette={{ W: '#fff', S: '#cfe8ff' }} scale={6} className="px-cloud c1" />
        <Sprite map={CLOUD} palette={{ W: '#fff', S: '#cfe8ff' }} scale={4} className="px-cloud c2" />
      </div>

      <section className="px-box px-main">
        <div className="px-tag">{CONFIG.workplace} 出勤告示</div>
        <div className="px-hero">
          <Sprite
            map={work ? FLASK : MUG}
            palette={ICON_PALETTE}
            scale={6}
            className="px-icon"
            label={work ? '实验烧瓶' : '咖啡杯'}
          />
          <div>
            <p className="px-date">
              {fmtDate(today)} {fmtWeek(today)}
            </p>
            <h1 className="px-head">{work ? '今天要上工！' : '今天放假啦！'}</h1>
          </div>
        </div>
        <p className="px-line">
          {work
            ? `这轮第 ${s.runDay}/${s.runLength} 天 · ${relDay(inDays)}（${fmtDate(next)}）休息`
            : `下次上工：${relDay(inDays)}（${fmtDate(next)} ${fmtWeek(next)}）`}
        </p>
        <div className="px-energy">
          <span>体力</span>
          <div className="px-bar">
            <i style={{ width: work ? '38%' : '100%' }} />
          </div>
        </div>
      </section>

      <section className="px-box px-farm">
        <h2>未来两周</h2>
        <Strip days={s.upcoming} />
        <p className="px-legend">
          <i className="sw work" /> 上工 <i className="sw off" /> 休息
        </p>
      </section>

      <div className="px-ground" aria-hidden="true" />
    </main>
  );
}
