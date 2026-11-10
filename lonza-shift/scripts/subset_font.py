"""把 Fusion Pixel 12px 简中字体裁剪成页面用到的字（来源：npm @vp-tw/cjk-web-fonts-fusion-pixel-font，OFL 授权）"""
import glob, pathlib, sys
from fontTools.ttLib import TTFont
from fontTools.merge import Merger
from fontTools import subset

font_dir, out = sys.argv[1], sys.argv[2]
text = "".join(p.read_text() for p in pathlib.Path("src").rglob("*.js*"))
chars = set(text) | set(chr(c) for c in range(0x20, 0x7F)) | set("日一二三四五六今月年：·（）！")
chars = {c for c in chars if c.isprintable()}

needed = []
for f in sorted(glob.glob(f"{font_dir}/*.woff2")):
    cmap = TTFont(f).getBestCmap()
    if any(ord(c) in cmap for c in chars):
        needed.append(f)
print("subset files used:", len(needed))

tmp = []
for i, f in enumerate(needed):
    t = TTFont(f); t.flavor = None
    p = f"/tmp/fp_{i}.ttf"; t.save(p); tmp.append(p)
merged = Merger().merge(tmp) if len(tmp) > 1 else TTFont(tmp[0])
opts = subset.Options(); opts.flavor = "woff2"; opts.layout_features = ["*"]
s = subset.Subsetter(opts); s.populate(text="".join(chars)); s.subset(merged)
merged.flavor = "woff2"; merged.save(out)
cmap = merged.getBestCmap()
missing = [c for c in chars if ord(c) not in cmap and not c.isspace()]
print("glyphs:", len(cmap), "missing:", "".join(sorted(missing))[:200])
