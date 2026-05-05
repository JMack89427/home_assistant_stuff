#!/usr/bin/env python3
"""
Download Star Wars SVG icons from FontAwesome 5.x brands.
Run from /config/custom_icons — icons land in the current directory.
License: CC BY 4.0 (https://fontawesome.com/license/free)
"""

import urllib.request
import urllib.error
import json
import os
import sys

STAR_WARS_ICONS = [
    "empire",
    "sith",
    "rebel",
    "jedi-order",
    "first-order",
    "first-order-alt",
    "galactic-republic",
    "galactic-senate",
    "old-republic",
    "resistance",
    "mandalorian",
]

API_URL  = "https://api.github.com/repos/FortAwesome/Font-Awesome/contents/svgs/brands?ref=5.x"
RAW_BASE = "https://raw.githubusercontent.com/FortAwesome/Font-Awesome/5.x/svgs/brands/"


def fetch_json(url):
    req = urllib.request.Request(url, headers={"User-Agent": "ha-icon-downloader/1.0"})
    with urllib.request.urlopen(req, timeout=15) as r:
        return json.loads(r.read())


def download_svg(name, dest_dir):
    url  = RAW_BASE + name + ".svg"
    dest = os.path.join(dest_dir, name + ".svg")
    req  = urllib.request.Request(url, headers={"User-Agent": "ha-icon-downloader/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            content = r.read()
        with open(dest, "wb") as f:
            f.write(content)
        return True
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return False
        raise


def main():
    dest_dir = os.path.dirname(os.path.abspath(__file__))
    print(f"Destination: {dest_dir}\n")

    # Fetch the full file list to validate names exist
    print("Fetching FA5 brands file list from GitHub...")
    try:
        files = fetch_json(API_URL)
        available = {f["name"].replace(".svg", "") for f in files}
    except Exception as e:
        print(f"Warning: could not fetch file list ({e}). Attempting downloads anyway.")
        available = set(STAR_WARS_ICONS)

    found     = [n for n in STAR_WARS_ICONS if n in available]
    not_found = [n for n in STAR_WARS_ICONS if n not in available]

    if not_found:
        print(f"Not in FA5 brands (skipping): {', '.join(not_found)}\n")

    print(f"Downloading {len(found)} icons...\n")
    ok   = []
    fail = []

    for name in found:
        sys.stdout.write(f"  {name}.svg ... ")
        sys.stdout.flush()
        try:
            if download_svg(name, dest_dir):
                print("OK")
                ok.append(name)
            else:
                print("404 (skipped)")
                fail.append(name)
        except Exception as e:
            print(f"ERROR: {e}")
            fail.append(name)

    print(f"\nDone. {len(ok)} downloaded, {len(fail)} skipped.")

    if ok:
        print("\nReference these in your dashboard as:")
        for name in ok:
            print(f"  local:{name}")


if __name__ == "__main__":
    main()
