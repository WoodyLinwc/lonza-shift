"""从 Noto Sans CJK SC（OFL 授权）提取 上班休息 的字形轮廓，供 three.js 挤出成 3D 字"""
import json, sys
from fontTools.ttLib import TTCollection
from fontTools.pens.recordingPen import DecomposingRecordingPen

path, out, chars = sys.argv[1], sys.argv[2], sys.argv[3]
coll = TTCollection(path)
font = next(f for f in coll.fonts if "SC" in f["name"].getDebugName(1))
print("using", font["name"].getDebugName(4))
gs = font.getGlyphSet(); cmap = font.getBestCmap(); upm = font["head"].unitsPerEm
data = {"upm": upm, "glyphs": {}}
for ch in chars:
    name = cmap[ord(ch)]
    pen = DecomposingRecordingPen(gs); gs[name].draw(pen)
    cmds = []
    for op, args in pen.value:
        pts = [round(v) for p in args for v in p]
        cmds.append([{"moveTo": "M", "lineTo": "L", "curveTo": "C", "qCurveTo": "Q", "closePath": "Z", "endPath": "Z"}[op]] + pts)
    data["glyphs"][ch] = {"adv": gs[name].width, "cmds": cmds}
json.dump(data, open(out, "w"), separators=(",", ":"))
