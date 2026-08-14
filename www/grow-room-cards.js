// =============================================================================
// Grow Room Custom Cards — Brass instrument gauge cluster + equipment rows
// Fresh file, fresh tokens — does NOT import or reuse anything from
// imperial-cards.js, and imperial-cards.js is not modified by this file.
// =============================================================================
(function () {
  'use strict';

  const VERSION = '1.0.1';

  // ── Status → color map (exact vocab from packages/botanical_bay.yaml) ──────
  const DEFAULT_STATUS_COLORS = {
    'Ideal': 'good', 'High': 'warn', 'Low': 'bad', 'N/A': 'warn',
    'Optimal': 'good', 'Needs Water': 'bad', 'Too Wet': 'warn', 'Unknown': 'warn',
  };
  const TOKEN = {
    good: 'var(--success-color, #6f8f63)',
    warn: 'var(--warning-color, #c98a3c)',
    bad: 'var(--error-color, #a6452f)',
    neutral: '#2b2a22',
  };

  // ── Dial geometry — viewBox 0 0 200 200, 270° sweep from -135° to +135° ────
  const CX = 100, CY = 100, A0 = -135, SWEEP = 270;
  const clamp01 = v => Math.min(1, Math.max(0, v));
  const frac = (v, min, max) => clamp01((v - min) / ((max - min) || 1));
  const ang = t => A0 + SWEEP * t;
  const pt = (t, r) => {
    const a = ang(t) * Math.PI / 180;
    return [CX + r * Math.sin(a), CY - r * Math.cos(a)];
  };
  const arcPath = (t0, t1, r) => {
    const [x0, y0] = pt(t0, r), [x1, y1] = pt(t1, r);
    const large = (t1 - t0) > (2 / 3) ? 1 : 0;   // sweep exceeds 180deg when >2/3 of full 270deg range
    return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
  };

  function st(hass, id) { return hass && id ? hass.states[id] : null; }

  // ── Pure gauge renderer — shared by the multi-gauge and single-gauge (bare
  // `entity:` at top level) config paths. No nested custom elements. ─────────
  function renderGauge(cfg, hass, idx) {
    const {
      entity, name = '', unit: unitOverride, min = 0, max = 100,
      decimals = 0, ideal_min, ideal_max, status_entity,
    } = cfg;
    const so = st(hass, entity);
    const rawValue = parseFloat(so?.state);
    const isValid = Number.isFinite(rawValue);
    // NEVER let NaN reach the rotate() transform — t always resolves finite.
    // Chromium silently drops a <g transform="rotate(NaN ...)"> with no
    // console error, which reads as a rendering bug rather than a data one.
    const t = isValid ? frac(rawValue, min, max) : 0;
    const unit = unitOverride ?? so?.attributes?.unit_of_measurement ?? '';
    const label = name || so?.attributes?.friendly_name || entity;

    // Status word/color resolve from status_entity independent of the main
    // value's validity, then get force-neutralled if the main value is bad.
    let statusWord = null;
    let colorKey = 'neutral';
    if (status_entity) {
      const sso = st(hass, status_entity);
      if (sso && !['unavailable', 'unknown'].includes(sso.state)) {
        statusWord = sso.state;
        colorKey = DEFAULT_STATUS_COLORS[statusWord] || 'neutral';
      }
    }
    if (!isValid) colorKey = 'neutral';
    const color = TOKEN[colorKey];
    // Readout text sits on a dark card background, unlike the needle (which
    // sits on the light dial face) — TOKEN.neutral is dark ink meant for the
    // needle only. When there's no real status color, fall back to null so
    // the CSS default (var(--primary-text-color)) applies to the text.
    const textColor = colorKey === 'neutral' ? null : color;

    const valueStr = isValid ? rawValue.toFixed(decimals) : '—';

    const hasIdealBand = ideal_min !== undefined && ideal_max !== undefined;
    const idealT0 = hasIdealBand ? frac(ideal_min, min, max) : 0;
    const idealT1 = hasIdealBand ? frac(ideal_max, min, max) : 0;

    // Major ticks: 7 at t = 0, 1/6 .. 1 (angles -135, -90, -45, 0, +45, +90, +135)
    const majors = [0, 1 / 6, 2 / 6, 3 / 6, 4 / 6, 5 / 6, 1];
    const majorTicks = majors.map(tt => {
      const [x0, y0] = pt(tt, 63), [x1, y1] = pt(tt, 52);
      return `<line x1="${x0.toFixed(2)}" y1="${y0.toFixed(2)}" x2="${x1.toFixed(2)}" y2="${y1.toFixed(2)}" stroke="#3a352a" stroke-width="2"/>`;
    }).join('');

    // Minor ticks: 3 per gap between majors (18 total, step 1/24) — skip the
    // steps that coincide with a major tick (every 4th of 24).
    let minorTicks = '';
    for (let i = 1; i < 24; i++) {
      if (i % 4 === 0) continue;
      const tt = i / 24;
      const [x0, y0] = pt(tt, 63), [x1, y1] = pt(tt, 57.5);
      minorTicks += `<line x1="${x0.toFixed(2)}" y1="${y0.toFixed(2)}" x2="${x1.toFixed(2)}" y2="${y1.toFixed(2)}" stroke="#3a352a" stroke-width="1" opacity="0.5"/>`;
    }

    // Scale labels — endpoints only (min bottom-left, max bottom-right); the
    // full 7-value major-tick label set is too cramped at this dial size.
    const [lx0, ly0] = pt(0, 42);
    const [lx1, ly1] = pt(1, 42);
    const gradId = `grow-face-${idx}-${Math.random().toString(36).slice(2, 8)}`;

    const svg = `
      <svg viewBox="0 0 200 200" class="dial" preserveAspectRatio="xMidYMid meet">
        <defs>
          <radialGradient id="${gradId}" cx="50%" cy="50%" r="65%">
            <stop offset="0%" stop-color="#eee5cf"/>
            <stop offset="100%" stop-color="#dcd0af"/>
          </radialGradient>
        </defs>
        <circle cx="${CX}" cy="${CY}" r="94" fill="none" stroke="#b08d57" stroke-width="7"/>
        <circle cx="${CX}" cy="${CY}" r="88" fill="none" stroke="#7a6238" stroke-width="1.5"/>
        <circle cx="${CX}" cy="${CY}" r="87" fill="url(#${gradId})"/>
        <path d="${arcPath(0, 1, 70)}" fill="none" stroke="#c7b995" stroke-width="10" stroke-linecap="butt"/>
        ${hasIdealBand ? `<path d="${arcPath(idealT0, idealT1, 70)}" fill="none" stroke="${TOKEN.good}" stroke-width="10" stroke-linecap="butt"/>` : ''}
        ${majorTicks}
        ${minorTicks}
        <text x="${lx0.toFixed(2)}" y="${ly0.toFixed(2)}" font-size="10" fill="#3a352a" opacity="0.65" text-anchor="middle">${min}</text>
        <text x="${lx1.toFixed(2)}" y="${ly1.toFixed(2)}" font-size="10" fill="#3a352a" opacity="0.65" text-anchor="middle">${max}</text>
        <g opacity="${isValid ? 1 : 0.25}" transform="rotate(${ang(t).toFixed(2)} 100 100)">
          <polygon points="100,36 103,100 97,100" fill="${color}"/>
          <polygon points="100,100 101.8,116 98.2,116" fill="${color}" opacity="0.75"/>
        </g>
        <circle cx="${CX}" cy="${CY}" r="7" fill="#2b2a22"/>
        <circle cx="${CX}" cy="${CY}" r="3" fill="#b08d57"/>
      </svg>`;

    return { label, svg, valueStr, unit, color, textColor, statusWord };
  }

  function renderGaugeCell(cfg, hass, idx) {
    const g = renderGauge(cfg, hass, idx);
    return `
      <div class="cell">
        <div class="glabel">${g.label.toUpperCase()}</div>
        ${g.svg}
        <div class="greadout"><span class="gval"${g.textColor ? ` style="color:${g.textColor}"` : ''}>${g.valueStr}</span><span class="gunit">${g.unit}</span></div>
        <!-- TODO (follow-up): .gstatus should conditionally guard g.textColor like .gval does, but is currently unreachable (no neutral status in packages/botanical_bay.yaml). Dormant gap, not a current defect. -->
        ${g.statusWord ? `<div class="gstatus" style="color:${g.textColor}">${g.statusWord.toUpperCase()}</div>` : ''}
      </div>`;
  }

  function renderFooter(items, hass) {
    const parts = items.map(f => {
      const so = st(hass, f.entity);
      const unit = f.unit ?? so?.attributes?.unit_of_measurement ?? '';
      const label = (f.name || so?.attributes?.friendly_name || f.entity).toUpperCase();
      const stateVal = so?.state;
      const known = stateVal !== undefined && !['unavailable', 'unknown'].includes(stateVal);
      const valStr = known ? `${stateVal}${unit}` : '—';
      return `<span class="frow"><span class="flabel">${label}</span>${valStr}</span>`;
    });
    return `<div class="footer">${parts.join('')}</div>`;
  }

  // ============================================================================
  // grow-gauge-card
  // ============================================================================
  class GrowGaugeCard extends HTMLElement {
    setConfig(c) {
      if (!c) throw new Error('grow-gauge-card: config required');
      const gauges = Array.isArray(c.gauges) && c.gauges.length
        ? c.gauges
        : (c.entity ? [c] : null);
      if (!gauges || !gauges.length) throw new Error('grow-gauge-card: gauges (or entity) required');
      this._c = { footer: c.footer, gauges };
      if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
      this._r();
    }
    set hass(h) { this._h = h; this._r(); }
    _r() {
      if (!this.shadowRoot || !this._c) return;
      const hass = this._h;
      const { gauges, footer } = this._c;
      const cells = gauges.map((g, i) => renderGaugeCell(g, hass, i)).join('');
      this.shadowRoot.innerHTML = `
        <style>
          :host { display: block; container-type: inline-size; }
          .wrap { padding: 10px 4px 6px; font-family: 'Roboto', 'Helvetica Neue', Arial, sans-serif; }
          .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
          @container (max-width: 620px) { .grid { grid-template-columns: repeat(2, 1fr); } }
          @container (max-width: 300px) { .grid { grid-template-columns: 1fr; } }
          .cell { display: flex; flex-direction: column; align-items: center; gap: 4px; min-width: 0; }
          .glabel { font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase;
            color: var(--secondary-text-color, #a89f8b); }
          .dial { width: 100%; max-width: 140px; height: auto; }
          .greadout { display: flex; align-items: baseline; gap: 3px;
            font-family: ui-monospace, 'SF Mono', Menlo, Consolas, monospace; }
          .gval { font-size: 19px; font-weight: 700; color: var(--primary-text-color, #f3ede0); }
          .gunit { font-size: 11px; color: var(--secondary-text-color, #a89f8b); }
          .gstatus { font-size: 10px; letter-spacing: 1.5px; text-transform: uppercase; font-weight: 600; }
          .footer { margin-top: 10px; padding-top: 8px; border-top: 1px solid var(--divider-color, #34352e);
            font-size: 11px; letter-spacing: 1px; text-transform: uppercase;
            color: var(--secondary-text-color, #a89f8b); display: flex; gap: 18px;
            flex-wrap: wrap; justify-content: center; }
          .flabel { opacity: 0.7; margin-right: 4px; }
        </style>
        <div class="wrap">
          <div class="grid">${cells}</div>
          ${footer && footer.length ? renderFooter(footer, hass) : ''}
        </div>`;
    }
    getGridOptions() { return { columns: 'full', rows: 'auto', min_columns: 6 }; }
    getCardSize() { return 2 + Math.ceil((this._c?.gauges?.length || 0) / 2) * 5; }
    static getStubConfig() {
      return {
        gauges: [
          { entity: 'sensor.grow_room_inside_vpd', name: 'VPD', min: 0, max: 2.0, decimals: 2,
            ideal_min: 0.8, ideal_max: 1.2, status_entity: 'sensor.grow_room_vpd_status' },
        ],
      };
    }
  }

  // ============================================================================
  // grow-equipment-card
  //
  // Read-only by design: the AC Infinity AI+ integration
  // (dalinicus/homeassistant-acinfinity) exposes no fan.*/switch.* entity for
  // AI-series controller ports, only sensor.grow_controller_port_N_* readouts.
  // There is nothing to toggle, so this card implements no tap_action,
  // hold_action, or service call anywhere — adding interaction here would be
  // dead/misleading code pointing at entities that don't exist.
  // ============================================================================
  class GrowEquipmentCard extends HTMLElement {
    setConfig(c) {
      if (!c?.entities?.length) throw new Error('grow-equipment-card: entities required');
      this._c = c;
      if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
      this._r();
    }
    set hass(h) { this._h = h; this._r(); }
    _r() {
      if (!this.shadowRoot || !this._c) return;
      const hass = this._h;
      const { title, max = 10, entities } = this._c;

      const rows = entities.map(e => {
        const so = st(hass, e.entity);
        const rawState = so?.state;
        const isUnavailable = !so || rawState === 'unavailable' || rawState === 'unknown';
        const raw = parseFloat(rawState);
        const isValidNumber = !isUnavailable && Number.isFinite(raw);
        const isZero = isValidNumber && raw === 0;
        const muted = isUnavailable || isZero || !isValidNumber;
        const pct = isValidNumber ? clamp01(raw / (max || 1)) * 100 : 0;
        const valueDisplay = isValidNumber ? `${Math.round(raw)}/${max}` : `—/${max}`;
        const name = e.name || so?.attributes?.friendly_name || e.entity;
        const icon = e.icon || 'mdi:power-socket';
        const textColor = muted ? '#6b6455' : 'var(--primary-text-color, #f3ede0)';

        return `
          <div class="row">
            <ha-icon icon="${icon}" style="color:${muted ? '#6b6455' : '#b08d57'}"></ha-icon>
            <span class="name" style="color:${textColor}">${name}</span>
            <span class="track"><span class="fill" style="width:${pct}%"></span></span>
            <span class="val" style="color:${textColor}">${valueDisplay}</span>
          </div>`;
      }).join('');

      this.shadowRoot.innerHTML = `
        <style>
          :host { display: block; }
          .card { background: var(--ha-card-background, var(--card-background-color, #232420));
            border-radius: var(--ha-card-border-radius, 10px);
            border: var(--ha-card-border-width, 1px) solid var(--ha-card-border-color, #34352e);
            box-shadow: var(--ha-card-box-shadow, none);
            padding: 12px 16px 8px; font-family: 'Roboto', 'Helvetica Neue', Arial, sans-serif; }
          .hd { display: flex; align-items: center; gap: 8px; padding-bottom: 8px;
            margin-bottom: 4px; border-bottom: 1px solid var(--divider-color, #34352e); }
          .rivet { width: 6px; height: 6px; border-radius: 50%; background: #b08d57;
            box-shadow: inset 0 0 0 1px #7a6238; flex-shrink: 0; }
          .title { font-size: 12px; font-weight: 700; letter-spacing: 3px; text-transform: uppercase;
            color: var(--primary-text-color, #f3ede0); }
          .row { display: flex; align-items: center; gap: 10px; padding: 7px 0; }
          .row ha-icon { --mdc-icon-size: 18px; flex-shrink: 0; }
          .name { flex: 0 1 auto; max-width: 42%; font-size: 13px;
            overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
          .track { flex: 1; min-width: 60px; height: 8px; border-radius: 4px;
            background: #1a1b17; box-shadow: inset 0 0 0 1px #34352e; overflow: hidden; }
          .fill { display: block; height: 100%; border-radius: 4px; transition: width 0.4s;
            background: linear-gradient(90deg, #7a6238, #b08d57); }
          .val { flex-shrink: 0; min-width: 44px; text-align: right;
            font-family: ui-monospace, 'SF Mono', Menlo, Consolas, monospace; font-size: 12px; }
        </style>
        <div class="card">
          ${title ? `<div class="hd"><span class="rivet"></span><span class="title">${title}</span></div>` : ''}
          <div class="rows">${rows}</div>
        </div>`;
    }
    getGridOptions() { return { columns: 'full', rows: 'auto' }; }
    getCardSize() { return 1 + (this._c?.entities?.length || 0); }
    static getStubConfig() {
      return {
        title: 'EQUIPMENT', max: 10,
        entities: [{ entity: 'sensor.example', name: 'Example', icon: 'mdi:power-socket' }],
      };
    }
  }

  // ── Register cards ─────────────────────────────────────────────────────────
  [
    ['grow-gauge-card', GrowGaugeCard],
    ['grow-equipment-card', GrowEquipmentCard],
  ].forEach(([tag, cls]) => {
    if (!customElements.get(tag)) customElements.define(tag, cls);
  });

  window.customCards = window.customCards || [];
  window.customCards.push(
    { type: 'grow-gauge-card', name: 'Grow Gauge Card', description: 'Analog brass dial gauge cluster for grow room vitals' },
    { type: 'grow-equipment-card', name: 'Grow Equipment Card', description: 'Read-only level-bar rows for grow room equipment power draw' },
  );

  console.info(
    '%c GROW ROOM INSTRUMENT PANEL %c v' + VERSION + ' ',
    'background:#b08d57;color:#1c1d19;font-weight:700;padding:2px 6px;',
    'background:#232420;color:#b08d57;font-weight:700;padding:2px 6px;'
  );
})();
