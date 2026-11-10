import { useEffect, useRef } from 'react';
import Strip from '../Strip';
import { CONFIG, fmtDate, fmtWeek, relDay } from '../schedule';
import { seeded } from '../random';

const SHIRTS = ['#e63946', '#457b9d', '#f4a261', '#2a9d8f', '#8d6cab', '#f1fa8c', '#ffffff', '#264653', '#ff7aa2'];
const PANTS = ['#1d3557', '#2b2d42', '#5c4033', '#3d405b', '#222'];
const SKIN = ['#f1c27d', '#e0ac69', '#c68642', '#8d5524', '#ffdbac'];
const HAIR = ['#2b1d14', '#4a3222', '#111', '#a0522d', '#d9b26f'];
const CARS = ['#e63946', '#1d6fb8', '#f1f1f1', '#2b2d42', '#6a994e', '#9b5de5', '#ff9f1c'];
const NEON = ['#ff4fa8', '#3fe8ff', '#ffe14d', '#b46bff', '#5dff8f', '#ff7b3d'];
const SIGN_TEXT = ['拉面', 'BAR', 'OPEN', '咖啡', '24H', 'HOTEL', '寿司', '烧烤', 'KTV', '甜品', 'CAFE', '书店'];
const FONT = '"PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif';

const pick = (r, arr) => arr[Math.floor(r() * arr.length)];
const mod = (a, n) => ((a % n) + n) % n;

function startNeonCity(canvas, streetEl) {
  const ctx = canvas.getContext('2d');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const bg = document.createElement('canvas');
  const bctx = bg.getContext('2d');
  let W = 0;
  let H = 0;
  let g = {};
  let people = [];
  let lanes = [];
  let flickers = [];

  function rr(c, x, y, w, h, rad) {
    c.beginPath();
    c.roundRect(x, y, w, h, rad);
    c.fill();
  }

  /** 霓虹灯牌：深色底板 + 发光的灯管边框和文字 */
  function drawSign(c, sign, on = 1) {
    const { x, y, w, h, color, text, vertical } = sign;
    c.save();
    c.fillStyle = 'rgba(10,8,18,.85)';
    rr(c, x, y, w, h, 5);
    c.globalAlpha = on;
    c.shadowColor = color;
    c.shadowBlur = 12;
    c.strokeStyle = color;
    c.lineWidth = 2;
    c.beginPath();
    c.roundRect(x + 2, y + 2, w - 4, h - 4, 4);
    c.stroke();
    c.fillStyle = '#fff';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    const fs = vertical ? w * 0.56 : Math.min(h * 0.55, (w / Math.max(2, text.length)) * 1.25);
    c.font = `800 ${fs}px ${FONT}`;
    c.shadowBlur = 14;
    if (vertical) {
      [...text].forEach((ch, i) => c.fillText(ch, x + w / 2, y + (h / text.length) * (i + 0.5)));
    } else {
      c.fillText(text, x + w / 2, y + h / 2 + 1);
    }
    c.fillStyle = color;
    c.globalAlpha = on * 0.55;
    if (vertical) {
      [...text].forEach((ch, i) => c.fillText(ch, x + w / 2, y + (h / text.length) * (i + 0.5)));
    } else {
      c.fillText(text, x + w / 2, y + h / 2 + 1);
    }
    c.restore();
  }

  function build() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth;
    H = canvas.clientHeight;
    for (const cv of [canvas, bg]) {
      cv.width = Math.round(W * dpr);
      cv.height = Math.round(H * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    bctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const r = seeded(77);
    const streetH = streetEl.offsetHeight;
    const groundY = H - streetH;
    const farWalk = Math.round(streetH * 0.2);
    const road = Math.round(streetH * 0.46);
    g = { groundY, farWalk, roadTop: groundY + farWalk, roadBot: groundY + farWalk + road, road };
    const c = bctx;

    // 夜空
    const sky = c.createLinearGradient(0, 0, 0, groundY);
    sky.addColorStop(0, '#07061a');
    sky.addColorStop(0.6, '#1f1440');
    sky.addColorStop(1, '#4a1f5c');
    c.fillStyle = sky;
    c.fillRect(0, 0, W, groundY + 2);
    c.fillStyle = 'rgba(255,255,255,.7)';
    for (let i = 0; i < W / 12; i++) c.fillRect(r() * W, r() * groundY * 0.45, 1.2, 1.2);

    // 远处楼群
    c.fillStyle = '#1d1838';
    for (let x = -10; x < W + 10; ) {
      const w = 26 + r() * 50;
      const h = groundY * (0.35 + r() * 0.4);
      c.fillRect(x, groundY - h, w, h);
      c.fillStyle = 'rgba(255,200,120,.35)';
      for (let k = 0; k < h / 9; k++) if (r() < 0.25) c.fillRect(x + 3 + r() * (w - 8), groundY - h + 4 + k * 9, 3, 3);
      c.fillStyle = '#1d1838';
      x += w + 2;
    }

    // 近处楼 + 窗户 + 灯牌
    const signs = [];
    flickers = [];
    const tones = ['#15132a', '#1a1830', '#121024', '#201d38'];
    for (let x = -20; x < W + 20; ) {
      const w = 50 + r() * 70;
      const h = groundY * (0.3 + r() * 0.48);
      const top = groundY - h;
      c.fillStyle = tones[Math.floor(r() * 4)];
      c.fillRect(x, top, w, h);
      const cols = Math.max(2, Math.floor((w - 8) / 12));
      const rows = Math.max(1, Math.floor((h - 40) / 16));
      const x0 = x + (w - (cols * 12 - 4)) / 2;
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const lit = r() < 0.45;
          c.fillStyle = lit ? pick(r, ['#ffd76a', '#ffe9b0', '#9fd8ff', '#ffb3d9']) : '#25223d';
          c.fillRect(x0 + col * 12, top + 10 + row * 16, 8, 10);
        }
      }
      // 底层店面
      const shop = c.createLinearGradient(0, groundY - 24, 0, groundY);
      shop.addColorStop(0, 'rgba(255,190,120,.85)');
      shop.addColorStop(1, 'rgba(255,140,90,.55)');
      c.fillStyle = shop;
      c.fillRect(x + 6, groundY - 22, w - 12, 22);
      c.fillStyle = 'rgba(20,16,30,.6)';
      for (let k = x + 6 + 14; k < x + w - 8; k += 16) c.fillRect(k, groundY - 22, 2, 22);
      // 店招（横）
      const color = pick(r, NEON);
      signs.push({ x: x + 8, y: groundY - 40, w: w - 16, h: 15, color, text: pick(r, SIGN_TEXT), vertical: false });
      // 竖招牌挂在楼边
      if (r() < 0.6 && h > 110) {
        const vt = pick(r, ['拉面', '酒店', '茶室', '烧烤', '寿司', '书店', '甜品']);
        const sh = vt.length * 22 + 6;
        signs.push({ x: x + w - 12, y: top + 18 + r() * Math.max(0, h - sh - 70), w: 22, h: sh, color: pick(r, NEON), text: vt, vertical: true });
      }
      x += w + 5 + r() * 10;
    }

    // 远处人行道
    c.fillStyle = '#2e2a3d';
    c.fillRect(0, groundY, W, farWalk);
    // 路灯
    for (let lx = 40; lx < W; lx += 170) {
      c.fillStyle = '#8a8fa6';
      c.fillRect(lx, groundY - 46, 3, 48);
      c.fillRect(lx - 8, groundY - 46, 14, 3);
      const glow = c.createRadialGradient(lx - 6, groundY - 42, 1, lx - 6, groundY - 42, 38);
      glow.addColorStop(0, 'rgba(255,220,150,.7)');
      glow.addColorStop(1, 'rgba(255,220,150,0)');
      c.fillStyle = glow;
      c.fillRect(lx - 46, groundY - 82, 80, 80);
    }
    // 湿漉漉的马路
    const roadGrad = c.createLinearGradient(0, g.roadTop, 0, g.roadBot);
    roadGrad.addColorStop(0, '#16141f');
    roadGrad.addColorStop(1, '#1d1a28');
    c.fillStyle = roadGrad;
    c.fillRect(0, g.roadTop, W, road);
    // 灯牌在路面上的倒影
    for (const sgn of signs) {
      const refl = c.createLinearGradient(0, g.roadTop, 0, g.roadBot);
      refl.addColorStop(0, `${sgn.color}66`);
      refl.addColorStop(1, `${sgn.color}00`);
      c.fillStyle = refl;
      const cx = sgn.x + sgn.w / 2;
      const rw = Math.min(sgn.w, 40);
      c.fillRect(cx - rw / 2, g.roadTop, rw, road);
    }
    c.fillStyle = '#5a5570';
    c.fillRect(0, g.roadTop, W, 2);
    c.fillRect(0, g.roadBot - 2, W, 2);
    c.fillStyle = '#e8b93a';
    for (let k = 0; k < W; k += 34) c.fillRect(k, g.roadTop + road * 0.5 - 1.5, 20, 3);
    // 近处人行道
    c.fillStyle = '#26222f';
    c.fillRect(0, g.roadBot, W, H - g.roadBot);
    c.fillStyle = '#2f2b3b';
    for (let k = 0; k < W; k += 48) c.fillRect(k, g.roadBot, 2, H - g.roadBot);

    // 灯牌最后画，盖在楼上；挑两块会闪
    signs.forEach((sgn, i) => {
      if (i % 5 === 2) flickers.push(sgn);
      else drawSign(c, sgn);
    });

    // 行人
    people = [];
    const farCount = Math.round(W / 30);
    const nearCount = Math.round(W / 42);
    for (let i = 0; i < farCount + nearCount; i++) {
      const isFar = i < farCount;
      const s = isFar ? 0.72 : 1.15;
      const nearTop = g.roadBot + 26;
      people.push({
        x: r() * W,
        y: isFar ? groundY + farWalk * (0.55 + r() * 0.35) : nearTop + r() * Math.max(4, H - nearTop - 6),
        s,
        v: (r() < 0.5 ? -1 : 1) * (16 + r() * 18) * s,
        phase: r() * 6,
        shirt: pick(r, SHIRTS),
        pants: pick(r, PANTS),
        skin: pick(r, SKIN),
        hair: pick(r, HAIR),
        bag: r() < 0.3,
        umbrella: r() < 0.15 ? pick(r, NEON) : null,
      });
    }
    people.sort((a, b) => a.y - b.y);

    // 车道：上面往左，下面往右
    lanes = [
      { y: g.roadTop + road * 0.44, dir: -1, speed: 70, scale: 0.85 },
      { y: g.roadTop + road * 0.94, dir: 1, speed: 100, scale: 1.05 },
    ].map((lane) => {
      const count = Math.max(3, Math.round(W / 140));
      const len = W + 300;
      const cars = Array.from({ length: count }, (_, i) => {
        const bus = r() < 0.15;
        const taxi = !bus && r() < 0.3;
        return {
          base: (i * len) / count + r() * 30,
          len: bus ? 110 : 56 + r() * 16,
          bus,
          taxi,
          color: bus ? '#f2c14e' : taxi ? '#ffcc00' : pick(r, CARS),
        };
      });
      return { ...lane, cars, len };
    });
  }

  function drawCar(c, x, y, dir, k) {
    const len = c.len * k;
    const wr = 4.6 * k;
    const bodyH = (c.bus ? 26 : 12) * k;
    const bodyTop = y - wr - bodyH;
    // 车灯在湿路面上的倒影
    const fx = dir > 0 ? x + len : x;
    const streak = ctx.createLinearGradient(0, y, 0, y + 22 * k);
    streak.addColorStop(0, 'rgba(255,240,170,.35)');
    streak.addColorStop(1, 'rgba(255,240,170,0)');
    ctx.fillStyle = streak;
    ctx.fillRect(fx - 6 * k, y, 8 * k, 22 * k);
    ctx.fillStyle = c.color;
    if (c.bus) {
      rr(ctx, x, bodyTop, len, bodyH, 4 * k);
      ctx.fillStyle = '#ffe6a3';
      for (let wx = x + 8 * k; wx < x + len - 14 * k; wx += 14 * k) ctx.fillRect(wx, bodyTop + 4 * k, 10 * k, 8 * k);
    } else {
      rr(ctx, x, bodyTop, len, bodyH, 4 * k);
      const cabX = x + len * (dir > 0 ? 0.18 : 0.3);
      rr(ctx, cabX, bodyTop - 9 * k, len * 0.52, 10 * k, 4 * k);
      ctx.fillStyle = '#7e8fb0';
      ctx.fillRect(cabX + 3 * k, bodyTop - 7 * k, len * 0.22, 6 * k);
      ctx.fillRect(cabX + len * 0.27, bodyTop - 7 * k, len * 0.21, 6 * k);
      if (c.taxi) {
        ctx.fillStyle = '#ffef9a';
        ctx.fillRect(cabX + len * 0.18, bodyTop - 13 * k, len * 0.16, 4 * k);
      }
    }
    const back = dir > 0 ? x : x + len - 3 * k;
    ctx.fillStyle = '#fff3b0';
    ctx.fillRect(dir > 0 ? x + len - 3 * k : x, bodyTop + 3 * k, 3 * k, 4 * k);
    ctx.fillStyle = '#ff3b3b';
    ctx.fillRect(back, bodyTop + 3 * k, 3 * k, 4 * k);
    const beam = ctx.createLinearGradient(fx, 0, fx + dir * 64 * k, 0);
    beam.addColorStop(0, 'rgba(255,240,170,.45)');
    beam.addColorStop(1, 'rgba(255,240,170,0)');
    ctx.fillStyle = beam;
    ctx.beginPath();
    ctx.moveTo(fx, bodyTop + 4 * k);
    ctx.lineTo(fx + dir * 64 * k, bodyTop - 4 * k);
    ctx.lineTo(fx + dir * 64 * k, y + 2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#0e0e12';
    for (const f of [0.2, 0.8]) {
      ctx.beginPath();
      ctx.arc(x + len * f, y - wr, wr, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawPerson(p, t) {
    const { x, y, s } = p;
    const ph = p.phase + (t * Math.abs(p.v)) / (5 * s);
    const sw = Math.sin(ph);
    const bob = Math.abs(Math.cos(ph)) * 0.8 * s;
    ctx.lineCap = 'round';
    ctx.strokeStyle = p.pants;
    ctx.lineWidth = 2.6 * s;
    ctx.beginPath();
    ctx.moveTo(x, y - 11 * s - bob);
    ctx.lineTo(x + sw * 4 * s, y);
    ctx.moveTo(x, y - 11 * s - bob);
    ctx.lineTo(x - sw * 4 * s, y);
    ctx.stroke();
    ctx.strokeStyle = p.shirt;
    ctx.lineWidth = 2 * s;
    ctx.beginPath();
    ctx.moveTo(x, y - 20 * s - bob);
    ctx.lineTo(x - sw * 3.5 * s, y - 13 * s - bob);
    ctx.moveTo(x, y - 20 * s - bob);
    ctx.lineTo(x + sw * 3.5 * s, y - 13 * s - bob);
    ctx.stroke();
    ctx.fillStyle = p.shirt;
    rr(ctx, x - 3.6 * s, y - 22 * s - bob, 7.2 * s, 12 * s, 2.5 * s);
    if (p.bag) {
      ctx.fillStyle = '#6b4226';
      ctx.fillRect(x + (p.v > 0 ? -6 : 3) * s, y - 17 * s - bob, 3.2 * s, 5 * s);
    }
    ctx.fillStyle = p.skin;
    ctx.beginPath();
    ctx.arc(x, y - 25.5 * s - bob, 3.3 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = p.hair;
    ctx.beginPath();
    ctx.arc(x, y - 26.2 * s - bob, 3.4 * s, Math.PI, 0);
    ctx.fill();
    if (p.umbrella) {
      ctx.strokeStyle = '#ccc';
      ctx.lineWidth = 1 * s;
      ctx.beginPath();
      ctx.moveTo(x + 2 * s, y - 18 * s - bob);
      ctx.lineTo(x + 2 * s, y - 34 * s - bob);
      ctx.stroke();
      ctx.fillStyle = p.umbrella;
      ctx.beginPath();
      ctx.ellipse(x + 2 * s, y - 34 * s - bob, 11 * s, 6 * s, 0, Math.PI, 0);
      ctx.fill();
    }
  }

  let raf = 0;
  let last = performance.now();
  let t = 0;
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!reduce) {
      t += dt;
      for (const p of people) {
        p.x += p.v * dt;
        if (p.x > W + 20) p.x = -20;
        if (p.x < -20) p.x = W + 20;
      }
    }
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(bg, 0, 0, W, H);
    // 会闪的灯牌
    flickers.forEach((sgn, i) => {
      const k = (t * 1.3 + i * 0.37) % 4;
      const on = reduce || !(k > 3.2 && k < 3.35) && !(k > 3.5 && k < 3.6) ? 1 : 0.15;
      drawSign(ctx, sgn, on);
    });
    people.filter((p) => p.y < g.roadTop).forEach((p) => drawPerson(p, t));
    for (const lane of lanes) {
      for (const c of lane.cars) {
        drawCar(c, mod(c.base + lane.dir * lane.speed * t, lane.len) - 150, lane.y, lane.dir, lane.scale);
      }
    }
    people.filter((p) => p.y >= g.roadTop).forEach((p) => drawPerson(p, t));
    if (!reduce) raf = requestAnimationFrame(frame);
  }

  const ro = new ResizeObserver(() => {
    build();
    if (reduce) frame(performance.now());
  });
  ro.observe(canvas);
  build();
  raf = requestAnimationFrame(frame);

  return () => {
    cancelAnimationFrame(raf);
    ro.disconnect();
  };
}

export default function NeonCity({ s }) {
  const { today, work, next, inDays } = s;
  const canvasRef = useRef(null);
  const streetRef = useRef(null);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c.getContext || !c.getContext('2d')) return undefined;
    return startNeonCity(c, streetRef.current);
  }, []);

  return (
    <main className="nc">
      <canvas ref={canvasRef} className="nc-canvas" aria-hidden="true" />
      <div className="nc-ui">
        <div className="ne-sign">
          <span className="ne-en">{work ? 'ON SHIFT' : 'DAY OFF'}</span>
          <h1 className="ne-word">{work ? '今日上班' : '今日休息'}</h1>
          <span className="ne-small">
            {CONFIG.workplace} · {fmtDate(today)} {fmtWeek(today)}
          </span>
        </div>
        <p className="ne-sub">
          {work
            ? `${relDay(inDays)}熄灯休息 · ${fmtDate(next)}`
            : `${relDay(inDays)}重新营业 · ${fmtDate(next)} ${fmtWeek(next)}`}
        </p>
        <div className="nc-panel">
          <Strip days={s.upcoming} />
        </div>
      </div>
      <div className="nc-street" ref={streetRef} />
    </main>
  );
}
