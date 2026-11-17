"""Writes src/handwriting.ts, Engineering Paper's lettering, from Patrick Hand.

    python3 scripts/handwriting.py PatrickHand-Regular.ttf src/handwriting.ts

The font: https://github.com/google/fonts (ofl/patrickhand, SIL Open Font
License 1.1, Copyright 2010-2012 Patrick Wagesreiter). Takes Python with fontTools; only maintainers
run it, and the server uses the generated outlines, with no font installed.
"""

import json
import sys

from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont

font = TTFont(sys.argv[1])
upm = font["head"].unitsPerEm
cmap = font.getBestCmap()
glyph_set = font.getGlyphSet()
hmtx = font["hmtx"]
# Printable ASCII, Latin-1 letters, curly quotes, dashes and a few marks
chars = (
    [chr(c) for c in range(32, 127)]
    + [chr(c) for c in range(0xC0, 0x100) if c not in (0xD7, 0xF7)]
    + list("‘’“”–—•…·©")
)


def number(v):
    s = ("%.3f" % v).rstrip("0").rstrip(".")
    return s.replace("0.", ".", 1) if s.startswith("0.") else s.replace("-0.", "-.", 1)


glyphs = {}
for ch in chars:
    name = cmap.get(ord(ch))
    if not name:
        continue
    pen = SVGPathPen(glyph_set, ntos=number)
    # One em tall, y down, baseline at 0
    glyph_set[name].draw(TransformPen(pen, (1 / upm, 0, 0, -1 / upm, 0, 0)))
    glyphs[ch] = [round(hmtx[name][0] / upm, 4), pen.getCommands()]

with open(sys.argv[2], "w") as out:
    out.write(
        """// Engineering Paper's lettering: Patrick Hand outlines (SIL Open Font
// License 1.1, Copyright 2010-2012 Patrick Wagesreiter), so the text looks
// the same in any SVG viewer and in PNGs, with no font installed. One em
// tall, baseline at 0; each glyph is its advance width and its outline.
// Characters the font lacks fall back to Open Sans. Written by
// scripts/handwriting.py.
export const HANDWRITING: Record<string, [number, string]> = %s;
"""
        % json.dumps(glyphs, ensure_ascii=False)
    )
print(len(glyphs), "glyphs")
