import Strip from '../Strip';
import { CONFIG, fmtDate, fmtWeek, relDay } from '../schedule';

export default function Minimal({ s }) {
  const { today, work, next, inDays } = s;
  return (
    <main className="mn">
      <p className="mn-meta">
        <i className="mn-dot" />
        {fmtDate(today)} · {fmtWeek(today)} · {CONFIG.workplace}
      </p>
      <h1 className="mn-word">{work ? '上班' : '休息'}</h1>
      <p className="mn-sub">
        {work
          ? `今天有班。${relDay(inDays)}休息，${fmtDate(next)}。`
          : `今天不上班。${relDay(inDays)}上班，${fmtDate(next)} ${fmtWeek(next)}。`}
      </p>
      <Strip days={s.upcoming} />
    </main>
  );
}
