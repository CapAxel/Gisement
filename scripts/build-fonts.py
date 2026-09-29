"""Génère les polices auto-hébergées (WOFF2, sous-ensemble latin + symboles techniques).

Usage : python3 scripts/build-fonts.py <dossier_plex_mono> <dossier_plex_sans>
Sources : paquets npm @ibm/plex-mono, @ibm/plex-sans (complets) et
@fontsource-variable/newsreader (installé en devDependency).
Dépendances : pip install fonttools brotli
"""
import sys
from pathlib import Path
from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from fontTools.ttLib.tables._g_l_y_f import Glyph

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "fonts"
OUT.mkdir(parents=True, exist_ok=True)

UNICODES = (
    "U+0020-007E,U+00A0-00FF,U+0152-0153,U+0178,U+02C6,U+02DA,U+02DC,"
    "U+2009-200A,U+2010-2015,U+2018-201E,U+2022,U+2026,U+202F,U+2032-2033,"
    "U+2039-203A,U+20AC,U+2116,U+2190-2199,U+2212,U+2248,U+2260,U+2264-2265,"
    "U+2300,U+25A0-25A1,U+25CB,U+25CF"
)


def save_subset(font: TTFont, dest: Path) -> None:
    opts = subset.Options()
    opts.flavor = "woff2"
    opts.layout_features = ["*"]
    opts.name_IDs = ["*"]
    opts.notdef_outline = True
    opts.hinting = False
    opts.desubroutinize = True
    sub = subset.Subsetter(opts)
    sub.populate(unicodes=subset.parse_unicodes(UNICODES))
    sub.subset(font)
    font.flavor = "woff2"
    font.save(dest)
    print(f"{dest.name:40s} {dest.stat().st_size/1024:6.1f} Ko")


def add_thin_spaces(font: TTFont) -> None:
    """Ajoute les espaces fines (U+202F, U+2009) absentes de Newsreader.

    Les nombres sont formatés à la française (900 000 €) avec l'espace fine
    insécable : sans ce glyphe, le navigateur irait le chercher dans une autre police.
    """
    space = font.getBestCmap()[0x20]
    width = round(font["hmtx"][space][0] * 0.62)
    order = font.getGlyphOrder()
    for cp, name in ((0x202F, "uni202F"), (0x2009, "uni2009")):
        if name in order:
            continue
        order.append(name)
        font["glyf"].glyphs[name] = Glyph()
        font["hmtx"][name] = (width, 0)
        for table in font["cmap"].tables:
            if table.isUnicode():
                table.cmap[cp] = name
    font.setGlyphOrder(order)
    font["glyf"].glyphOrder = order
    font["maxp"].numGlyphs = len(order)


def main() -> None:
    mono_dir, sans_dir = Path(sys.argv[1]), Path(sys.argv[2])
    statics = {
        "plex-mono-400.woff2": mono_dir / "fonts/complete/woff2/IBMPlexMono-Regular.woff2",
        "plex-mono-500.woff2": mono_dir / "fonts/complete/woff2/IBMPlexMono-Medium.woff2",
        "plex-sans-400.woff2": sans_dir / "fonts/complete/woff2/IBMPlexSans-Regular.woff2",
        "plex-sans-400-italic.woff2": sans_dir / "fonts/complete/woff2/IBMPlexSans-Italic.woff2",
        "plex-sans-500.woff2": sans_dir / "fonts/complete/woff2/IBMPlexSans-Medium.woff2",
        "plex-sans-600.woff2": sans_dir / "fonts/complete/woff2/IBMPlexSans-SemiBold.woff2",
    }
    for name, src in statics.items():
        save_subset(TTFont(src), OUT / name)

    # Newsreader : instances statiques à la taille optique « affichage »
    # (opsz 56, graisse 400) — ~20 Ko au lieu de ~130 Ko pour la variable complète.
    nr = ROOT / "node_modules/@fontsource-variable/newsreader/files"
    for style in ("normal", "italic"):
        font = TTFont(nr / f"newsreader-latin-opsz-{style}.woff2")
        font = instancer.instantiateVariableFont(font, {"opsz": 56, "wght": 400})
        add_thin_spaces(font)
        suffix = "" if style == "normal" else "-italic"
        save_subset(font, OUT / f"newsreader-400{suffix}.woff2")


if __name__ == "__main__":
    main()
