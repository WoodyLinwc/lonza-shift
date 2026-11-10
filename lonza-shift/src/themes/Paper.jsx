import Strip from '../Strip';
import { CONFIG, fmtDate, fmtWeek, relDay } from '../schedule';

const ALMANAC = {
  work: { yi: '搬砖 早起 带饭', ji: '熬夜 摸鱼' },
  off: { yi: '睡懒觉 约饭 出门晒太阳', ji: '看工作消息' },
};

export default function Paper({ s }) {
  const { today, work, next, inDays } = s;
  const a = work ? ALMANAC.work : ALMANAC.off;
  return (
    <main className="pp">
      <article className="pp-page">
        <header className="pp-top">
          <span>
            {today.year}年{today.month}月
          </span>
          <span>{CONFIG.workplace}</span>
        </header>
        <div className="pp-body">
          <div className="pp-num">{today.date}</div>
          <div className="pp-week">星期{today.weekday}</div>
          <div className="pp-stamp" role="img" aria-label={work ? '今天上班' : '今天休息'}>
            {work ? '上班' : '休息'}
          </div>
          <dl className="pp-almanac">
            <div>
              <dt>宜</dt>
              <dd>{a.yi}</dd>
            </div>
            <div>
              <dt>忌</dt>
              <dd>{a.ji}</dd>
            </div>
          </dl>
          <p className="pp-next">
            {work
              ? `${relDay(inDays)}休息（${fmtDate(next)}）`
              : `${relDay(inDays)}上班（${fmtDate(next)} ${fmtWeek(next)}）`}
          </p>
        </div>
      </article>
      <Strip days={s.upcoming} />
    </main>
  );
}
