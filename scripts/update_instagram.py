#!/usr/bin/env python3
"""Refresh the "More Maui moments" Instagram grid on index.html.

Pulls the latest posts from the Instagram API (Instagram Login), saves
web-sized JPEGs to assets/instagram/, and rewrites the grid between the
<!-- instagram-feed:start --> / <!-- instagram-feed:end --> markers.

Env:
  IG_ACCESS_TOKEN  long-lived Instagram user access token (required)
  IG_POST_COUNT    number of tiles (default 6)

Exits 0 without changes if the token is missing or the API fails, so the
existing grid stays in place.
"""
import html
import io
import json
import os
import re
import sys
import urllib.parse
import urllib.request
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
INDEX = ROOT / "index.html"
OUT_DIR = ROOT / "assets" / "instagram"
API = "https://graph.instagram.com"
START, END = "<!-- instagram-feed:start -->", "<!-- instagram-feed:end -->"
WIDTH = 1200


def get(url, binary=False):
    req = urllib.request.Request(url, headers={"User-Agent": "mauiminisession-feed/1.0"})
    with urllib.request.urlopen(req, timeout=30) as r:
        data = r.read()
    return data if binary else json.loads(data)


def alt_from_caption(caption):
    text = re.sub(r"#\w+|@\w+", "", caption or "")
    text = re.sub(r"\s+", " ", text).strip(" .-–—|·\n")
    first = re.split(r"(?<=[.!?])\s", text)[0] if text else ""
    first = first[:140].rstrip()
    return first or "A recent Maui Mini Session photograph from our Instagram"


def main():
    token = os.environ.get("IG_ACCESS_TOKEN", "").strip()
    if not token:
        print("IG_ACCESS_TOKEN not set; leaving grid unchanged.")
        return 0
    count = int(os.environ.get("IG_POST_COUNT", "6"))

    # Keep the long-lived token alive (valid 60 days; refreshing resets the clock).
    try:
        get(f"{API}/refresh_access_token?" + urllib.parse.urlencode(
            {"grant_type": "ig_refresh_token", "access_token": token}))
    except Exception as e:  # not fatal
        print(f"Token refresh skipped: {e}")

    fields = "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp"
    try:
        data = get(f"{API}/me/media?" + urllib.parse.urlencode(
            {"fields": fields, "limit": 25, "access_token": token}))
    except Exception as e:
        print(f"Instagram API error; leaving grid unchanged: {e}")
        return 0

    posts = []
    for m in data.get("data", []):
        src = m.get("thumbnail_url") if m.get("media_type") == "VIDEO" else m.get("media_url")
        if src and m.get("permalink"):
            posts.append((m, src))
        if len(posts) == count:
            break
    if not posts:
        print("No usable posts returned; leaving grid unchanged.")
        return 0

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    keep, tiles = set(), []
    for m, src in posts:
        name = f"ig-{m['id']}.jpg"
        path = OUT_DIR / name
        keep.add(name)
        if not path.exists():
            im = ImageOps.exif_transpose(Image.open(io.BytesIO(get(src, binary=True)))).convert("RGB")
            if im.width > WIDTH:
                im = im.resize((WIDTH, round(im.height * WIDTH / im.width)), Image.LANCZOS)
            im.save(path, quality=82, optimize=True, progressive=True)
        w, h = Image.open(path).size
        alt = html.escape(alt_from_caption(m.get("caption")), quote=True)
        href = html.escape(m["permalink"], quote=True)
        tiles.append(
            f'      <a href="{href}" target="_blank" rel="noopener">'
            f'<img src="assets/instagram/{name}" width="{w}" height="{h}" alt="{alt}" loading="lazy"></a>')

    for old in OUT_DIR.glob("ig-*.jpg"):
        if old.name not in keep:
            old.unlink()

    page = INDEX.read_text()
    block = f"{START}\n" + "\n".join(tiles) + f"\n      {END}"
    new, n = re.subn(re.escape(START) + r".*?" + re.escape(END), block, page, flags=re.S)
    if n != 1:
        print("Feed markers not found in index.html", file=sys.stderr)
        return 1
    if new != page:
        INDEX.write_text(new)
        print(f"Grid updated with {len(tiles)} posts.")
    else:
        print("Grid already current.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
