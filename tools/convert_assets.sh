#!/bin/bash
# 资源管线：rg-game/assets/art -> rg-h5/assets（sips 等比压缩，保留 alpha，不转格式）
set -euo pipefail

SRC="/Users/qingpao/rg-game/assets/art"
DST="/Users/qingpao/rg-h5/assets"

pixw() { local o; o=$(sips -g pixelWidth "$1"); echo "${o##*: }"; }
pixh() { local o; o=$(sips -g pixelHeight "$1"); echo "${o##*: }"; }

# 限定最大边长（不放大）
to_max() { # src dst max
  local w h
  w=$(pixw "$1"); h=$(pixh "$1")
  if [ "$w" -le "$3" ] && [ "$h" -le "$3" ]; then
    cp "$1" "$2"
  else
    sips -Z "$3" "$1" --out "$2" >/dev/null
  fi
}

# 强制 N x N（图标类，源本为方形）
to_square() { # src dst n
  local w h
  w=$(pixw "$1"); h=$(pixh "$1")
  if [ "$w" -le "$3" ] && [ "$h" -le "$3" ]; then
    cp "$1" "$2"
  else
    sips -z "$3" "$3" "$1" --out "$2" >/dev/null
  fi
}

# 固定高度，宽度按原比例换算（不放大）
to_height() { # src dst height
  local w h nw
  w=$(pixw "$1"); h=$(pixh "$1")
  if [ "$h" -le "$3" ]; then
    cp "$1" "$2"
  else
    nw=$(( w * $3 / h ))
    sips -z "$3" "$nw" "$1" --out "$2" >/dev/null
  fi
}

convert_dir() { # dir rule arg
  local d="$1" rule="$2" arg="$3" f base
  [ -d "$SRC/$d" ] || return 0
  mkdir -p "$DST/$d"
  for f in "$SRC/$d"/*.png; do
    base=$(basename "$f")
    case "$rule" in
      square) to_square "$f" "$DST/$d/$base" "$arg" ;;
      max)    to_max    "$f" "$DST/$d/$base" "$arg" ;;
      height) to_height "$f" "$DST/$d/$base" "$arg" ;;
      copy)   cp "$f" "$DST/$d/$base" ;;
    esac
  done
}

convert_dir icons     square 128
convert_dir portraits square 128
convert_dir characters height 256
convert_dir enemies   height 256
convert_dir summons   height 256
convert_dir projectiles max 256
convert_dir effects   max 256
convert_dir status    max 256
convert_dir drops     max 256
convert_dir ui        max 512

# maps：broken_dragon_palace_bg 保持宽 1672，其余 <=512
mkdir -p "$DST/maps"
for f in "$SRC/maps"/*.png; do
  base=$(basename "$f")
  if [ "$base" = "broken_dragon_palace_bg.png" ]; then
    cp "$f" "$DST/maps/$base"
  else
    to_max "$f" "$DST/maps/$base" 512
  fi
done

# menu：main_menu_bg 保持原尺寸，其余 <=512
mkdir -p "$DST/menu"
for f in "$SRC/menu"/*.png; do
  base=$(basename "$f")
  if [ "$base" = "main_menu_bg.png" ]; then
    cp "$f" "$DST/menu/$base"
  else
    to_max "$f" "$DST/menu/$base" 512
  fi
done

echo "== converted =="
find "$DST" -name '*.png' | wc -l
du -sh "$DST"
