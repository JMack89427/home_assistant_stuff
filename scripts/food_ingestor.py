#!/usr/bin/env python3
"""
Imperial Food Ingestor — Claude Vision → Grocy
Analyzes a food image and adds identified items to Grocy inventory.

Usage:
    python food_ingestor.py <image_path>
    python food_ingestor.py /path/to/fridge.jpg
    python food_ingestor.py /path/to/receipt.png

Environment variables (set in .env or export before running):
    GROCY_URL         Base URL of your Grocy instance
    GROCY_API_KEY     Grocy API key (Admin → Manage API keys)
    ANTHROPIC_API_KEY Anthropic API key
"""

import anthropic
import requests
import base64
import json
import sys
import os
from pathlib import Path
from datetime import datetime, timedelta

try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).parent / '.env')
except ImportError:
    pass  # dotenv optional

GROCY_URL     = os.getenv('GROCY_URL', 'http://homeassistant.local:9192')
GROCY_API_KEY = os.getenv('GROCY_API_KEY', '')
ANTHROPIC_KEY = os.getenv('ANTHROPIC_API_KEY', '')

GROCY_HEADERS = {
    'GROCY-API-KEY': GROCY_API_KEY,
    'Content-Type': 'application/json',
}

UNIT_MAP = {
    'piece': 1, 'pieces': 1, 'each': 1, 'item': 1, 'items': 1,
}


# ── Grocy API helpers ──────────────────────────────────────────────────────────

def grocy_get(endpoint: str) -> list | dict:
    r = requests.get(f'{GROCY_URL}/api/{endpoint}', headers=GROCY_HEADERS, timeout=10)
    r.raise_for_status()
    return r.json()


def grocy_post(endpoint: str, data: dict) -> dict:
    r = requests.post(
        f'{GROCY_URL}/api/{endpoint}',
        headers=GROCY_HEADERS,
        json=data,
        timeout=10,
    )
    r.raise_for_status()
    return r.json() if r.text.strip() else {}


def get_or_create_product(name: str, products: list[dict]) -> int:
    match = next((p for p in products if p['name'].lower() == name.lower()), None)
    if match:
        return int(match['id'])
    result = grocy_post('objects/products', {
        'name': name,
        'description': '',
        'qu_id_purchase': 1,
        'qu_id_stock': 1,
        'location_id': 1,
    })
    return int(result['created_object_id'])


def resolve_unit_id(unit_name: str, units: list[dict]) -> int:
    """Return Grocy qu_id for the given unit name, defaulting to piece (1)."""
    normalized = unit_name.lower().rstrip('s')  # "grams" → "gram"
    for u in units:
        if u['name'].lower() == normalized or u['name'].lower() == unit_name.lower():
            return int(u['id'])
    return UNIT_MAP.get(unit_name.lower(), 1)


# ── Image analysis ─────────────────────────────────────────────────────────────

def encode_image(path: str) -> tuple[str, str]:
    suffix = Path(path).suffix.lower()
    media_types = {
        '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
        '.png': 'image/png',  '.webp': 'image/webp',
        '.gif': 'image/gif',
    }
    media_type = media_types.get(suffix, 'image/jpeg')
    with open(path, 'rb') as f:
        return base64.standard_b64encode(f.read()).decode('utf-8'), media_type


def analyze_image(image_path: str) -> list[dict]:
    """Send image to Claude Vision and return structured list of food items."""
    client = anthropic.Anthropic(api_key=ANTHROPIC_KEY)
    data, media_type = encode_image(image_path)

    prompt = """Analyze this image and identify every distinct food or grocery item visible.

Return a JSON array where each element is an object with these exact keys:
- "name"              : string — common grocery store name (e.g. "Whole Milk", "Chicken Breast", "Roma Tomatoes")
- "quantity"          : number — numeric quantity visible (default 1 if unclear)
- "unit"              : string — one of: piece, g, kg, ml, L, oz, lb, pack, can, bottle, bag, box, jar, bunch
- "best_before_days"  : integer or null — estimated days until expiry from today (null if unknown)
- "notes"             : string or null — brand, flavor, or relevant detail visible on packaging

Rules:
- Be specific with names (not just "fruit" but "Granny Smith Apple")
- If you see a package with quantity printed on it (e.g. "6 pack"), reflect that in quantity/unit
- Return ONLY the JSON array with no markdown, no explanation, no code fences

Example output:
[
  {"name": "Whole Milk", "quantity": 1, "unit": "bottle", "best_before_days": 7, "notes": "Organic Valley"},
  {"name": "Cheddar Cheese", "quantity": 200, "unit": "g", "best_before_days": 21, "notes": null}
]"""

    response = client.messages.create(
        model='claude-opus-4-7',
        max_tokens=2048,
        messages=[{
            'role': 'user',
            'content': [
                {
                    'type': 'image',
                    'source': {'type': 'base64', 'media_type': media_type, 'data': data},
                },
                {'type': 'text', 'text': prompt},
            ],
        }],
    )

    raw = response.content[0].text.strip()
    # Strip markdown code fences if model includes them despite instructions
    if raw.startswith('```'):
        raw = raw.split('\n', 1)[1].rsplit('```', 1)[0]
    return json.loads(raw)


# ── Ingest pipeline ────────────────────────────────────────────────────────────

def ingest(image_path: str) -> None:
    if not GROCY_API_KEY:
        print('[ERROR] GROCY_API_KEY not set. Check your .env file.')
        sys.exit(1)
    if not ANTHROPIC_KEY:
        print('[ERROR] ANTHROPIC_API_KEY not set. Check your .env file.')
        sys.exit(1)

    print(f'\n[IMPERIAL INGESTOR] Analyzing: {image_path}')
    print('[IMPERIAL INGESTOR] Sending to Claude Vision...')
    items = analyze_image(image_path)

    print(f'[IMPERIAL INGESTOR] Identified {len(items)} item(s):')
    for item in items:
        notes = f'  ({item["notes"]})' if item.get('notes') else ''
        expiry = f'  — expires in {item["best_before_days"]}d' if item.get('best_before_days') else ''
        print(f'  • {item["quantity"]} {item["unit"]}  {item["name"]}{notes}{expiry}')

    print('\n[IMPERIAL INGESTOR] Fetching Grocy product list...')
    products = grocy_get('objects/products')
    units    = grocy_get('objects/quantity_units')

    print('[IMPERIAL INGESTOR] Adding to Grocy stock...')
    added, skipped = [], []

    for item in items:
        name = item['name']
        qty  = float(item.get('quantity', 1))
        best_before_days = item.get('best_before_days')

        best_before_date = (
            (datetime.now() + timedelta(days=best_before_days)).strftime('%Y-%m-%d')
            if best_before_days is not None else '2099-12-31'
        )

        try:
            product_id = get_or_create_product(name, products)
            grocy_post(f'stock/products/{product_id}/add', {
                'amount': qty,
                'best_before_date': best_before_date,
                'transaction_type': 'purchase',
            })
            added.append(f'  + {qty} × {name}' + (f' (exp {best_before_date})' if best_before_days else ''))
            # Keep local product list current to avoid duplicate creates
            if not next((p for p in products if p['name'].lower() == name.lower()), None):
                products = grocy_get('objects/products')
        except Exception as e:
            skipped.append(f'  ! {name}: {e}')

    for line in added:
        print(line)
    for line in skipped:
        print(line)

    print(f'\n[IMPERIAL INGESTOR] Complete — {len(added)} added, {len(skipped)} failed.')


# ── Entry point ────────────────────────────────────────────────────────────────

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    path = sys.argv[1]
    if not Path(path).exists():
        print(f'[ERROR] File not found: {path}')
        sys.exit(1)

    ingest(path)
