/** 未来 14 天的小日历条，各风格用 CSS 自己装扮 */
export default function Strip({ days, workLabel = '上班', offLabel = '休息' }) {
  return (
    <ol className="strip">
      {days.map((d, i) => (
        <li
          key={d.key}
          className={`${d.work ? 'work' : 'off'}${i === 0 ? ' today' : ''}`}
          title={`${d.month}月${d.date}日 周${d.weekday}：${d.work ? workLabel : offLabel}`}
        >
          <span className="wd">{i === 0 ? '今' : d.weekday}</span>
          <span className="dt">{d.date}</span>
        </li>
      ))}
    </ol>
  );
}
