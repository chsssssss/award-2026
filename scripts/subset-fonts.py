"""링크 미리보기 이미지(next/og ImageResponse)용 한글 폰트 서브셋을 만든다.

사용법: python3 scripts/subset-fonts.py
  입력: fonts-src/ (git에 올리지 않음)
  출력: assets/fonts/*.ttf + OFL.txt (git에 올림)

남기는 글자
  - KS X 1001 완성형 한글 2,350자 (EUC-KR 0xB0A1~0xC8FE를 디코딩)
  - 한글 호환 자모 U+3131~U+318E, ASCII U+0020~U+007E
  - 기호 · ~ – — ‘ ’ “ ” … × → ↑ ↓
woff2는 ImageResponse가 읽지 못해서 .ttf로 저장한다.

보조 폰트(Myeongjo-ExtraBold-Ext.ttf): 2,350자에 없는 나머지 한글 음절(8,822자)만 담은 명조.
이름에 그런 글자(예: 똠)가 있을 때만 읽어서, 네트워크 없이도 같은 명조로 그린다.

나눔명조는 OFL의 예약 글꼴 이름(Reserved Font Name)에 "Nanum"이 있어서,
수정본(서브셋)은 글꼴 안의 이름을 바꿔서 저장한다. 저작권·라이선스 문구는 그대로 남긴다.
"""

from __future__ import annotations

import shutil
import sys
from pathlib import Path

try:
    from fontTools import subset
    from fontTools.ttLib import TTFont
except ImportError:
    sys.exit("fontTools가 없어요. pip install fonttools (필요하면 --user) 후 다시 실행해 주세요.")

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "fonts-src"
OUT = ROOT / "assets" / "fonts"

# (원본 파일, 결과 파일, 바꿀 글꼴 이름 또는 None)
FONTS = [
    ("NanumMyeongjo-ExtraBold.ttf", "Myeongjo-ExtraBold.ttf", "Award Myeongjo"),
    ("NotoSansKR-Regular.ttf", "NotoSansKR-Regular.ttf", None),
    ("NotoSansKR-Bold.ttf", "NotoSansKR-Bold.ttf", None),
]
# 2,350자 밖의 한글 음절만 담는 보조 명조(이름에 드문 글자가 있을 때만 쓴다)
EXT_FONT = ("NanumMyeongjo-ExtraBold.ttf", "Myeongjo-ExtraBold-Ext.ttf", "Award Myeongjo Ext")
LICENSE = "OFL.txt"

SYMBOLS = "·~–—‘’“”…×→↑↓"


def ks_x_1001_hangul() -> list[int]:
    """EUC-KR 0xB0A1~0xC8FE(행 0xB0~0xC8, 열 0xA1~0xFE)를 디코딩한 완성형 한글."""
    chars: list[int] = []
    for lead in range(0xB0, 0xC9):
        for trail in range(0xA1, 0xFF):
            try:
                ch = bytes([lead, trail]).decode("euc-kr")
            except UnicodeDecodeError:
                continue
            chars.append(ord(ch))
    return chars


def codepoints() -> list[int]:
    cps = set(ks_x_1001_hangul())
    cps.update(range(0x3131, 0x318F))  # 한글 호환 자모
    cps.update(range(0x20, 0x7F))  # ASCII
    cps.update(ord(ch) for ch in SYMBOLS)
    return sorted(cps)


def rename_family(font: TTFont, family: str) -> None:
    """예약 글꼴 이름이 들어간 이름 레코드(1, 3, 4, 6, 16, 18)를 새 이름으로 바꾼다."""
    name = font["name"]
    style = name.getDebugName(17) or name.getDebugName(2) or "Regular"
    compact = family.replace(" ", "")
    values = {
        1: family,
        3: f"{compact}-{style.replace(' ', '')};subset",
        4: f"{family} {style}",
        6: f"{compact}-{style.replace(' ', '')}",
        16: family,
        18: f"{family} {style}",
    }
    for record in name.names:
        if record.nameID in values:
            record.string = values[record.nameID]


def subset_font(src: Path, dst: Path, family: str | None, unicodes: list[int]) -> None:
    options = subset.Options()
    options.hinting = False  # 이미지로만 그리므로 힌팅 불필요
    options.name_IDs = ["*"]  # 저작권(0)·라이선스(13, 14) 문구 유지
    options.name_languages = ["*"]
    options.notdef_outline = True
    options.layout_features = ["*"]

    font = subset.load_font(str(src), options)
    subsetter = subset.Subsetter(options)
    subsetter.populate(unicodes=unicodes)
    subsetter.subset(font)
    if family:
        rename_family(font, family)
    subset.save_font(font, str(dst), options)
    font.close()


def human(size: int) -> str:
    return f"{size / 1024 / 1024:.2f}MB" if size >= 1024 * 1024 else f"{size / 1024:.0f}KB"


def main() -> None:
    missing = [n for n, _, _ in FONTS if not (SRC / n).is_file()]
    if not (SRC / LICENSE).is_file():
        missing.append(LICENSE)
    if missing:
        sys.exit(f"fonts-src/에 없는 파일이 있어요: {', '.join(missing)}")

    hangul = ks_x_1001_hangul()
    if len(hangul) != 2350:
        sys.exit(f"KS X 1001 한글이 2,350자가 아니에요: {len(hangul)}자")
    unicodes = codepoints()

    OUT.mkdir(parents=True, exist_ok=True)
    print(f"남길 글자 {len(unicodes)}개 (한글 {len(hangul)}자)")
    for src_name, dst_name, family in FONTS:
        src, dst = SRC / src_name, OUT / dst_name
        subset_font(src, dst, family, unicodes)
        before, after = src.stat().st_size, dst.stat().st_size
        print(f"  {src_name} {human(before)} -> {dst_name} {human(after)} ({after / before:.0%})")
    src_name, dst_name, family = EXT_FONT
    ks = set(hangul)
    ext_unicodes = [cp for cp in range(0xAC00, 0xD7A4) if cp not in ks]
    src, dst = SRC / src_name, OUT / dst_name
    subset_font(src, dst, family, ext_unicodes)
    print(f"  {src_name} {human(src.stat().st_size)} -> {dst_name} {human(dst.stat().st_size)} (보조: 나머지 한글 {len(ext_unicodes)}자)")
    shutil.copyfile(SRC / LICENSE, OUT / LICENSE)
    print(f"  {LICENSE} 복사")


if __name__ == "__main__":
    main()
