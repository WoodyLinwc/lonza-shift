import Strip from '../Strip';
import { CONFIG, fmtDate, fmtWeek, relDay } from '../schedule';
import athens from '../paintings/athens.jpg';
import adam from '../paintings/adam.jpg';
import supper from '../paintings/supper.jpg';
import mona from '../paintings/mona.jpg';
import venus from '../paintings/venus.jpg';
import ermine from '../paintings/ermine.jpg';

// 均为公有领域的文艺复兴名作。上班日、休息日各一组，每天轮换一幅
const WORK_PAINTINGS = [
  {
    src: athens,
    title: '雅典学院',
    artist: '拉斐尔',
    year: '1509–1511',
    medium: '湿壁画 · 梵蒂冈宫',
    note: '满屋子的人都在忙，我也一样。',
  },
  {
    src: adam,
    title: '创造亚当',
    artist: '米开朗基罗',
    year: '约 1508–1512',
    medium: '湿壁画 · 西斯廷礼拜堂',
    note: '活儿已经递到手边了。',
  },
  {
    src: supper,
    title: '最后的晚餐',
    artist: '列奥纳多·达·芬奇',
    year: '1495–1498',
    medium: '壁画 · 米兰恩宠圣母教堂',
    note: '人都到齐了，开工。',
  },
];

const OFF_PAINTINGS = [
  {
    src: mona,
    title: '蒙娜丽莎',
    artist: '列奥纳多·达·芬奇',
    year: '约 1503–1519',
    medium: '杨木板油画 · 卢浮宫',
    note: '这个微笑的意思是：今天不用上班。',
  },
  {
    src: venus,
    title: '维纳斯的诞生',
    artist: '桑德罗·波提切利',
    year: '约 1484–1486',
    medium: '布面蛋彩 · 乌菲兹美术馆',
    note: '今天随波漂一漂，不去上班。',
  },
  {
    src: ermine,
    title: '抱银貂的女子',
    artist: '列奥纳多·达·芬奇',
    year: '约 1489–1491',
    medium: '胡桃木板油画 · 克拉科夫国家博物馆',
    note: '今天在家陪宠物。',
  },
];

export default function Museum({ s }) {
  const { today, work, next, inDays } = s;
  const pool = work ? WORK_PAINTINGS : OFF_PAINTINGS;
  const dayNum = Math.floor(Date.UTC(today.year, today.month - 1, today.date) / 86400000);
  const p = pool[dayNum % pool.length];

  return (
    <main className="mu">
      <p className="mu-head">{CONFIG.workplace} 美术馆 · 今日展出</p>
      <h1 className="mu-status">
        <span className="orn" aria-hidden="true" />
        {work ? '今日上班' : '今日休息'}
        <span className="orn" aria-hidden="true" />
      </h1>

      <figure className="mu-frame">
        <img src={p.src} alt={`${p.artist}《${p.title}》`} />
      </figure>

      <div className="mu-label">
        <p className="mu-title">
          《{p.title}》<span>{p.artist}，{p.year}</span>
        </p>
        <p className="mu-medium">{p.medium}</p>
        <p className="mu-note">
          {p.note}
          {work
            ? `${relDay(inDays)}休息（${fmtDate(next)}）。`
            : `${relDay(inDays)}上班（${fmtDate(next)} ${fmtWeek(next)}）。`}
        </p>
      </div>

      <Strip days={s.upcoming} />
    </main>
  );
}
