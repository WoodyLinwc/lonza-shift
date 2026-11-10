# 我今天上班吗？· Lonza

打开就能看到我今天在 Lonza 有没有班。六种风格（极简〔默认〕/ 像素 / 3D 鱼缸〔three.js〕/ 博物馆 / 霓虹街 / 日历），手机上整页一屏放得下。访客点选过的风格会记在他自己的浏览器里。

改默认风格：调整 `src/App.jsx` 里 `THEMES` 的顺序，第一个就是默认。

## 改班表
只需要改 `src/schedule.js` 里的 `CONFIG`：
- `pattern`：14 天一轮，1 = 上班，0 = 休息
- `cycleStart`：一轮的第一天
- `overrides`：请假 / 调班，比如 `'2026-12-24': 0`

“今天”按美东时间算。本地预览某一天：`npm run dev` 后打开 `/?date=2026-12-04`。

## 运行和部署
```
npm install
npm run dev      # 本地开发
npm run build    # 生成 dist/index.html（单个文件，字体已内嵌）
```
`dist/index.html` 可以直接放到 Vercel、Netlify、GitHub Pages 等任意静态托管。

像素字体：Fusion Pixel Font（OFL 授权，见 src/fonts/OFL.txt），已裁剪为页面用到的字；改了文字后运行
`python3 scripts/subset_font.py <字体目录> src/fonts/fusion-pixel-12px-subset.woff2` 重新生成。

## 博物馆风格的名画
均为公有领域的文艺复兴作品（`src/paintings/`），上班日、休息日各三幅，每天轮换：
- 上班：拉斐尔《雅典学院》、米开朗基罗《创造亚当》、达·芬奇《最后的晚餐》
- 休息：达·芬奇《蒙娜丽莎》、波提切利《维纳斯的诞生》、达·芬奇《抱银貂的女子》

想换画：把图片放进 `src/paintings/`，再改 `src/themes/Museum.jsx` 里的两个列表。

## 3D 鱼缸里的立体字
“上班/休息”是用 Noto Sans CJK SC Black（OFL 授权）的字形轮廓挤出的，轮廓存在 `src/glyphs.json`。
要换字：`python3 scripts/extract_glyphs.py <NotoSansCJK-Black.ttc 路径> src/glyphs.json 上班休息`
