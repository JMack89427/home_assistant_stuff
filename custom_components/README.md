# custom_components/

Place custom Home Assistant integrations here.

Each integration lives in its own sub-directory and must include at minimum:
- `manifest.json`
- `__init__.py`

**Installing via HACS**

If you manage custom integrations through [HACS](https://hacs.xyz/), HACS will
populate this folder automatically.  Commit only the files you want to track;
add any auto-generated or large binary files to `.gitignore` if desired.
