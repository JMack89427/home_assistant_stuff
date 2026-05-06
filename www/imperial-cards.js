// =============================================================================
// IMPERIAL COMMAND INTERFACE — Custom Lovelace Cards v1.0.0
// Star Wars Dark Side aesthetic for Home Assistant
// =============================================================================
(function () {
  'use strict';

  const VERSION = '1.4.0';

  // ── Shared CSS tokens ──────────────────────────────────────────────────────
  const V = `
    --ir: #CC0000; --ir-dim: rgba(204,0,0,0.25); --ir-glow: rgba(204,0,0,0.15);
    --ig: #00C853; --ig-glow: rgba(0,200,83,0.5);
    --ia: #FFB300; --ia-glow: rgba(255,179,0,0.5);
    --ibg: #0A0A0A; --ipanel: #1A1A1A;
    --igrey: #444444; --igreyl: #909090;
    --itext: #E8E8E8; --itextd: #909090;
    --imono: 'Courier New', Courier, monospace;
    --iui:   'Arial Narrow', Arial, sans-serif;
  `;

  const SCAN = `
    .sl { position:absolute; inset:0; pointer-events:none; z-index:0;
      background: repeating-linear-gradient(
        to bottom, transparent 0, transparent 3px,
        rgba(0,0,0,0.07) 3px, rgba(0,0,0,0.07) 4px); }
  `;

  const PIPS = `
    .p { position:absolute; width:6px; height:6px; background:var(--ir); z-index:3; }
    .p.tl { top:0;    left:0;  } .p.tr { top:0;    right:0; }
    .p.bl { bottom:0; left:0;  } .p.br { bottom:0; right:0; }
  `;

  const PHTML = `<s class="p tl"></s><s class="p tr"></s><s class="p bl"></s><s class="p br"></s>`;

  // ── Helpers ────────────────────────────────────────────────────────────────
  function st(hass, id)   { return hass && id ? hass.states[id] : null; }
  function txt(so) {
    if (!so) return 'N/A';
    const { state: s, attributes: a } = so;
    if (s === 'unavailable') return 'OFFLINE';
    if (s === 'unknown')     return 'UNKNOWN';
    if (a.unit_of_measurement) return `${s} ${a.unit_of_measurement}`;
    return s.toUpperCase();
  }
  function col(so) {
    if (!so || so.state === 'unavailable') return 'var(--igrey)';
    return ['on','playing','home','open','active','true'].includes(so.state)
      ? 'var(--ir)' : 'var(--igreyl)';
  }
  function icon(id) {
    const m = { light:'mdi:lightbulb', switch:'mdi:toggle-switch',
      sensor:'mdi:gauge', binary_sensor:'mdi:radiobox-marked',
      media_player:'mdi:speaker', script:'mdi:script-text',
      automation:'mdi:robot', camera:'mdi:cctv',
      climate:'mdi:thermostat', cover:'mdi:garage',
      input_boolean:'mdi:toggle-switch' };
    return m[id.split('.')[0]] || 'mdi:help-circle-outline';
  }
  function toggle(hass, id) {
    if (!hass || !id) return;
    const d = id.split('.')[0];
    hass.callService(d, d === 'script' ? 'turn_on' : 'toggle', { entity_id: id });
  }
  function svc(hass, str, data = {}) {
    if (!hass || !str) return;
    const [d, s] = str.split('.');
    hass.callService(d, s, data);
  }

  // ============================================================================
  // imperial-header
  // ============================================================================
  class ImperialHeader extends HTMLElement {
    setConfig(c) {
      if (!c.title) throw new Error('imperial-header: title required');
      this._c = c;
      if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
      this._r();
    }
    set hass(_) {}
    _r() {
      const { title, subtitle, icon: ic } = this._c;
      this.shadowRoot.innerHTML = `
        <style>
          :host{display:block}
          .w{${V} position:relative}
          .b{background:linear-gradient(90deg,var(--ir) 0%,rgba(204,0,0,.2) 45%,transparent 100%);
            border:1px solid rgba(204,0,0,.45);padding:10px 16px;
            display:flex;align-items:center;gap:10px}
          ha-icon{color:var(--ir);--mdc-icon-size:20px;flex-shrink:0}
          .t{flex:1}
          .ti{font-family:var(--iui);font-size:12px;font-weight:700;
            letter-spacing:3.5px;text-transform:uppercase;color:#fff}
          .su{font-family:var(--imono);font-size:9px;letter-spacing:2px;
            color:var(--itextd);margin-top:2px}
          .di{width:8px;height:8px;flex-shrink:0;background:var(--ir);
            clip-path:polygon(50% 0%,100% 50%,50% 100%,0% 50%)}
          ${PIPS}
        </style>
        <div class="w">${PHTML}
          <div class="b">
            ${ic ? `<ha-icon icon="${ic}"></ha-icon>` : '<div class="di"></div>'}
            <div class="t">
              <div class="ti">${title}</div>
              ${subtitle ? `<div class="su">${subtitle}</div>` : ''}
            </div>
            <div class="di"></div>
          </div>
        </div>`;
    }
    getCardSize() { return 1; }
    static getStubConfig() { return { title: 'SYSTEM HEADER', subtitle: 'SUBSYSTEM ACTIVE' }; }
  }

  // ============================================================================
  // imperial-panel  (entity list)
  // ============================================================================
  class ImperialPanel extends HTMLElement {
    setConfig(c) {
      if (!c.entities?.length) throw new Error('imperial-panel: entities required');
      this._c = c;
      if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
    }
    set hass(h) { this._h = h; this._r(); }
    _r() {
      if (!this.shadowRoot || !this._c) return;
      const { title, entities } = this._c;
      const h = this._h;
      const TOGGLE_DOMAINS = new Set(['light','switch','input_boolean','fan','automation','script']);
      const rows = entities.map(e => {
        const id     = typeof e === 'string' ? e : e.entity;
        const nm     = e.name  || h?.states[id]?.attributes?.friendly_name || id;
        const ic     = e.icon  || h?.states[id]?.attributes?.icon || icon(id);
        const so     = st(h, id);
        const tog    = TOGGLE_DOMAINS.has(id.split('.')[0]) && !e.attribute;
        const unavail = !so || so.state === 'unavailable';
        let dotColor, txtColor, tx;
        if (e.attribute) {
          const val = so?.attributes?.[e.attribute];
          const u   = e.unit ?? so?.attributes?.[`${e.attribute}_unit`] ?? '';
          tx        = val !== undefined ? `${val}${u ? ' ' + u : ''}`.toUpperCase() : 'N/A';
          dotColor  = unavail ? 'var(--igrey)' : 'var(--itextd)';
          txtColor  = unavail ? 'var(--igrey)' : 'var(--itext)';
        } else if (tog) {
          dotColor = col(so);
          txtColor = col(so);
          tx       = txt(so);
        } else {
          // pure sensor — keep dot color-coded, make value text readable
          dotColor = col(so);
          txtColor = unavail ? 'var(--igrey)' : 'var(--itext)';
          tx       = txt(so);
        }
        return `<div class="row${tog?' tog':''}" data-id="${id}">
          <ha-icon icon="${ic}" style="color:${dotColor}"></ha-icon>
          <span class="nm">${nm.toUpperCase()}</span>
          <span class="vl" style="color:${txtColor}">${tx}</span>
          <span class="dt" style="background:${dotColor};box-shadow:0 0 5px ${dotColor}"></span>
        </div>`;
      }).join('');
      this.shadowRoot.innerHTML = `
        <style>
          :host{display:block}
          .card{${V} background:var(--ipanel);border:1px solid rgba(204,0,0,.3);position:relative}
          ${PIPS} ${SCAN}
          .hd{background:linear-gradient(90deg,rgba(204,0,0,.5),rgba(204,0,0,.1) 55%,transparent);
            border-bottom:1px solid rgba(204,0,0,.25);padding:7px 14px;
            font-family:var(--iui);font-size:10px;font-weight:700;
            letter-spacing:3px;text-transform:uppercase;color:#fff;position:relative;z-index:1}
          .row{display:flex;align-items:center;gap:10px;padding:9px 14px;
            border-bottom:1px solid rgba(204,0,0,.07);position:relative;z-index:1;
            transition:background .12s}
          .row:last-child{border-bottom:none}
          .row.tog{cursor:pointer}
          .row.tog:hover{background:rgba(204,0,0,.06)}
          .row.tog:active{background:rgba(204,0,0,.12)}
          ha-icon{--mdc-icon-size:17px;flex-shrink:0}
          .nm{flex:1;font-family:var(--iui);font-size:11px;letter-spacing:1.5px;color:var(--itext)}
          .vl{font-family:var(--imono);font-size:11px;letter-spacing:.5px}
          .dt{width:6px;height:6px;border-radius:50%;flex-shrink:0}
        </style>
        <div class="card">${PHTML}<div class="sl"></div>
          ${title ? `<div class="hd">${title}</div>` : ''}
          ${rows}
        </div>`;
      this.shadowRoot.querySelectorAll('.row.tog').forEach(r =>
        r.addEventListener('click', () => toggle(this._h, r.dataset.id)));
    }
    getCardSize() { return 1 + (this._c?.entities?.length || 0); }
    static getStubConfig() {
      return { title: 'SUBSYSTEM', entities: [{ entity: 'light.example', name: 'EXAMPLE' }] };
    }
  }

  // ============================================================================
  // imperial-readout  (big phosphor number)
  // ============================================================================
  class ImperialReadout extends HTMLElement {
    setConfig(c) {
      if (!c.entity) throw new Error('imperial-readout: entity required');
      this._c = c;
      if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
    }
    set hass(h) { this._h = h; this._r(); }
    _r() {
      if (!this.shadowRoot || !this._c) return;
      const { entity, name, color = 'green', attribute, unit: unitOverride } = this._c;
      const so    = st(this._h, entity);
      const state = attribute
        ? String(so?.attributes?.[attribute] ?? '---')
        : (so?.state || '---');
      const unit  = unitOverride
        ?? (attribute ? (so?.attributes?.[`${attribute}_unit`] ?? '') : (so?.attributes?.unit_of_measurement ?? ''));
      const label = name || so?.attributes?.friendly_name || entity;
      const dead  = ['unavailable','unknown','none','---'].includes(state) || so?.state === 'unavailable';
      const pal   = {
        green: ['#00C853','rgba(0,200,83,.55)','rgba(0,200,83,.12)'],
        amber: ['#FFB300','rgba(255,179,0,.55)','rgba(255,179,0,.12)'],
        red:   ['#CC0000','rgba(204,0,0,.55)',  'rgba(204,0,0,.12)'  ],
      };
      const [c2, glow, dim] = pal[color] || pal.green;
      this.shadowRoot.innerHTML = `
        <style>
          :host{display:block}
          .card{${V} background:var(--ipanel);border:1px solid ${dead?'rgba(100,100,100,.25)':dim};
            padding:14px 16px 12px;position:relative;overflow:hidden}
          .card::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;
            background:${dead?'var(--igrey)':c2}}
          ${SCAN} ${PIPS}
          .p{background:${dead?'var(--igrey)':c2}}
          .lb{font-family:var(--imono);font-size:9px;letter-spacing:3px;text-transform:uppercase;
            color:${c2};opacity:${dead?.3:.7};margin-bottom:6px;position:relative;z-index:1}
          .rv{display:flex;align-items:baseline;gap:5px;position:relative;z-index:1}
          .vl{font-family:var(--imono);font-size:46px;font-weight:700;line-height:1;
            letter-spacing:-2px;color:${dead?'var(--igrey)':c2};
            text-shadow:${dead?'none':`0 0 12px ${glow},0 0 28px ${dim}`}}
          .un{font-family:var(--imono);font-size:16px;color:${c2};opacity:.5}
          .dv{height:1px;background:linear-gradient(90deg,${c2},transparent);
            margin:9px 0 5px;opacity:.3;position:relative;z-index:1}
          .ft{font-family:var(--imono);font-size:9px;letter-spacing:2px;
            color:${c2};opacity:.35;text-transform:uppercase;position:relative;z-index:1}
        </style>
        <div class="card">${PHTML}<div class="sl"></div>
          <div class="lb">${label.toUpperCase()}</div>
          <div class="rv">
            <div class="vl">${dead?'---':state}</div>
            ${unit?`<div class="un">${unit}</div>`:''}
          </div>
          <div class="dv"></div>
          <div class="ft">${dead?'SENSOR OFFLINE':'FEED ACTIVE'}</div>
        </div>`;
    }
    getCardSize() { return 3; }
    static getStubConfig() {
      return { entity: 'sensor.temperature', name: 'ATMOSPHERIC TEMP', color: 'green' };
    }
  }

  // ============================================================================
  // imperial-button  (command button with rank pips)
  // ============================================================================
  class ImperialButton extends HTMLElement {
    setConfig(c) {
      if (!c.name) throw new Error('imperial-button: name required');
      this._c = c;
      if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
    }
    set hass(h) { this._h = h; this._r(); }
    _r() {
      if (!this.shadowRoot || !this._c) return;
      const { name, icon: ic = 'mdi:power', color = 'red',
              service: sv, service_data: sd, entity } = this._c;
      const so     = entity ? st(this._h, entity) : null;
      const active = so && ['on','playing','active'].includes(so.state);
      const pal    = {
        red:   ['#CC0000','rgba(204,0,0,.45)','rgba(204,0,0,.12)'],
        green: ['#00C853','rgba(0,200,83,.45)','rgba(0,200,83,.1)'],
        amber: ['#FFB300','rgba(255,179,0,.45)','rgba(255,179,0,.1)'],
      };
      const [c2, gl, dm] = pal[color] || pal.red;
      this.shadowRoot.innerHTML = `
        <style>
          :host{display:block;cursor:pointer}
          .b{${V} background:${active?dm:'var(--ipanel)'};
            border:1px solid ${active?c2:'rgba(204,0,0,.3)'};
            padding:16px 12px 12px;display:flex;flex-direction:column;
            align-items:center;gap:8px;text-align:center;
            position:relative;overflow:hidden;min-height:100px;
            box-shadow:${active?`0 0 18px ${gl}`:'none'};
            transition:background .15s,box-shadow .15s,border-color .15s}
          .b:hover{background:${dm};border-color:${c2};box-shadow:0 0 22px ${gl}}
          .b:active{opacity:.7}
          ${PIPS} .p{background:${c2}}
          ${SCAN}
          ha-icon{color:${active?c2:'var(--igreyl)'};--mdc-icon-size:30px;
            transition:color .15s;position:relative;z-index:1}
          .b:hover ha-icon{color:${c2}}
          .lb{font-family:var(--iui);font-size:9px;font-weight:700;
            letter-spacing:2.5px;text-transform:uppercase;
            color:var(--itext);position:relative;z-index:1}
          .rk{display:flex;gap:3px;position:relative;z-index:1}
          .rp{width:14px;height:4px;background:${c2}}
          .rp:nth-child(-n+4){opacity:${active?1:.3}}
          .rp:nth-child(n+5){opacity:.15}
        </style>
        <div class="b">${PHTML}<div class="sl"></div>
          <ha-icon icon="${ic}"></ha-icon>
          <div class="lb">${name}</div>
          <div class="rk">${[1,2,3,4,5,6].map(()=>'<div class="rp"></div>').join('')}</div>
        </div>`;
      this.shadowRoot.querySelector('.b').addEventListener('click', () => {
        if (sv) svc(this._h, sv, sd || {});
        else if (entity) toggle(this._h, entity);
      });
    }
    getCardSize() { return 3; }
    static getStubConfig() {
      return { name: 'EXECUTE ORDER', icon: 'mdi:lightning-bolt',
               service: 'script.turn_on', color: 'red' };
    }
  }

  // ============================================================================
  // imperial-printer-status  (fleet overview block — one per printer)
  // ============================================================================
  class ImperialPrinterStatus extends HTMLElement {
    setConfig(c) {
      if (!c.prefix) throw new Error('imperial-printer-status: prefix required');
      this._c = c;
      if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
    }
    set hass(h) { this._h = h; this._r(); }
    _r() {
      if (!this.shadowRoot || !this._c) return;
      const { prefix, name } = this._c;
      const h   = this._h;
      // Try multiple suffixes — supports both Bambu and Moonraker naming
      const eid = (...suffixes) => {
        for (const suffix of suffixes) {
          const target = `${prefix}_${suffix}`;
          const found = Object.values(h?.states || {}).find(s => s.entity_id.endsWith('.' + target));
          if (found) return found;
        }
        return null;
      };

      const onlineEnt      = eid('online');
      const printerStateEnt= eid('printer_state');
      const statusEnt      = eid('current_print_state', 'print_status');
      const progressEnt    = eid('progress', 'print_progress');
      const taskEnt        = eid('filename', 'task_name');
      const remainEnt      = eid('print_time_left', 'remaining_time');
      const curLayEnt      = eid('current_layer');
      const totLayEnt      = eid('total_layer', 'total_layer_count');
      const nozzEnt        = eid('extruder_temperature', 'nozzle_temperature');
      const bedEnt         = eid('bed_temperature');
      const errEnt         = eid('print_error');
      const nameEnt        = eid('printer_name');

      // Bambu: binary_sensor online; Moonraker: derive from printer_state
      const isOnline = onlineEnt
        ? onlineEnt.state === 'on'
        : (printerStateEnt ? !['shutdown','startup','unavailable'].includes(printerStateEnt.state) : false);

      const sv       = statusEnt?.state || 'unavailable';
      const pct      = Math.min(100, Math.max(0, parseFloat(progressEnt?.state) || 0));
      const hasError = errEnt?.state === 'on' || sv === 'error' || printerStateEnt?.state === 'error';

      const PRINTING  = new Set(['running','prepare','slicing','printing']);
      const isPrinting = PRINTING.has(sv);
      const isPaused   = sv === 'pause' || sv === 'paused';
      const isDone     = sv === 'finish' || sv === 'complete';
      const isFailed   = sv === 'failed' || sv === 'error';
      const isCancelled= sv === 'cancelled';
      const isOffline  = sv === 'unavailable' || sv === 'offline' || sv === 'shutdown' || !isOnline;

      let statusColor, statusLabel;
      if (hasError || isFailed)  { statusColor = 'var(--ir)'; statusLabel = 'ERROR'; }
      else if (isPrinting)       { statusColor = 'var(--ia)'; statusLabel = 'PRINTING'; }
      else if (isPaused)         { statusColor = 'var(--ia)'; statusLabel = 'PAUSED'; }
      else if (isDone)           { statusColor = 'var(--ig)'; statusLabel = 'COMPLETE'; }
      else if (isCancelled)      { statusColor = 'var(--igreyl)'; statusLabel = 'CANCELLED'; }
      else if (isOffline)        { statusColor = 'var(--igrey)'; statusLabel = 'OFFLINE'; }
      else                       { statusColor = 'var(--igreyl)'; statusLabel = 'IDLE'; }

      const displayName = name || nameEnt?.state || prefix;

      const clean = (ent) => (!ent || ['unavailable','unknown','none',''].includes(ent.state)) ? null : ent.state;
      const taskStr  = clean(taskEnt);
      const remVal   = clean(remainEnt);
      const remStr   = remVal ? (parseFloat(remVal) < 1
        ? `${Math.round(parseFloat(remVal)*60)}M`
        : `${parseFloat(remVal).toFixed(1)}H`) : '---';
      const layerStr = (clean(curLayEnt) && clean(totLayEnt))
        ? `${curLayEnt.state}/${totLayEnt.state}` : '---';
      const nozzStr  = clean(nozzEnt) ? `${nozzEnt.state}°` : '---';
      const bedStr   = clean(bedEnt)  ? `${bedEnt.state}°`  : '---';
      const barColor = isPrinting ? 'var(--ir)' : isDone ? 'var(--ig)' : 'var(--igreyl)';
      const barGlow  = isPrinting ? 'box-shadow:0 0 8px rgba(204,0,0,.7)' : '';

      this.shadowRoot.innerHTML = `
        <style>
          :host{display:block}
          .card{${V} background:var(--ipanel);border:1px solid rgba(204,0,0,.3);
            position:relative;overflow:hidden}
          ${PIPS} ${SCAN}
          .hd{display:flex;align-items:center;gap:10px;padding:10px 14px;
            border-bottom:1px solid rgba(204,0,0,.12);position:relative;z-index:1}
          .dot{width:9px;height:9px;border-radius:50%;flex-shrink:0;
            background:${statusColor};
            ${isPrinting?`box-shadow:0 0 8px ${statusColor};animation:pulse 1.8s ease-in-out infinite`:''}}
          @keyframes pulse{0%,100%{opacity:1}50%{opacity:.25}}
          .pn{flex:1;font-family:var(--iui);font-size:12px;font-weight:700;
            letter-spacing:2.5px;text-transform:uppercase;color:#fff}
          .sb{font-family:var(--imono);font-size:9px;letter-spacing:2px;
            padding:3px 8px;border:1px solid ${statusColor};
            color:${statusColor};background:${statusColor}22;flex-shrink:0}
          .pb{height:3px;background:var(--igrey);position:relative;z-index:1}
          .pf{height:100%;width:${pct}%;background:${barColor};${barGlow};transition:width .6s}
          .pct{position:absolute;right:6px;top:50%;transform:translateY(-50%);
            font-family:var(--imono);font-size:8px;color:${barColor};opacity:.7;z-index:2;
            ${pct===0?'display:none':''}}
          .st{display:grid;grid-template-columns:repeat(4,1fr);position:relative;z-index:1;
            border-bottom:1px solid rgba(204,0,0,.08)}
          .sc{padding:9px 10px;text-align:center;border-right:1px solid rgba(204,0,0,.08)}
          .sc:last-child{border-right:none}
          .sl2{font-family:var(--imono);font-size:8px;letter-spacing:1.5px;
            color:var(--itextd);text-transform:uppercase}
          .sv{font-family:var(--imono);font-size:13px;color:var(--itext);margin-top:3px}
          .jb{padding:8px 14px;position:relative;z-index:1;
            display:flex;align-items:center;gap:8px;
            border-top:1px solid rgba(204,0,0,.08)}
          .jl{font-family:var(--imono);font-size:9px;letter-spacing:1.5px;color:var(--itextd)}
          .jn{font-family:var(--imono);font-size:10px;color:var(--itext);flex:1;
            overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
            letter-spacing:.5px}
          .er{padding:6px 14px;background:rgba(204,0,0,.1);
            border-top:1px solid rgba(204,0,0,.5);
            font-family:var(--imono);font-size:9px;letter-spacing:2px;
            color:var(--ir);display:flex;align-items:center;gap:6px;
            position:relative;z-index:1;animation:pulse 1.2s ease-in-out infinite}
        </style>
        <div class="card">${PHTML}<div class="sl"></div>
          <div class="hd">
            <div class="dot"></div>
            <div class="pn">${displayName}</div>
            <div class="sb">${statusLabel}</div>
          </div>
          <div class="pb" style="position:relative">
            <div class="pf"></div>
            ${pct>0?`<div class="pct">${Math.round(pct)}%</div>`:''}
          </div>
          <div class="st">
            <div class="sc"><div class="sl2">Nozzle</div><div class="sv">${nozzStr}</div></div>
            <div class="sc"><div class="sl2">Bed</div><div class="sv">${bedStr}</div></div>
            <div class="sc"><div class="sl2">Layers</div><div class="sv">${layerStr}</div></div>
            <div class="sc"><div class="sl2">Remain</div><div class="sv">${remStr}</div></div>
          </div>
          ${taskStr?`<div class="jb"><span class="jl">JOB //</span>
            <span class="jn">${taskStr.toUpperCase()}</span></div>`:''}
          ${hasError?`<div class="er">
            <ha-icon icon="mdi:alert-circle" style="--mdc-icon-size:14px"></ha-icon>
            PRINT ERROR DETECTED — INTERVENTION REQUIRED</div>`:''}
        </div>`;
    }
    getCardSize() { return 3; }
    static getStubConfig() {
      return { prefix: 'p1p_01s00c431300106', name: 'BAMBU P1P — UNIT ALPHA' };
    }
  }

  // ── Register cards ─────────────────────────────────────────────────────────
  [
    ['imperial-header',          ImperialHeader],
    ['imperial-panel',           ImperialPanel],
    ['imperial-readout',         ImperialReadout],
    ['imperial-button',          ImperialButton],
    ['imperial-printer-status',  ImperialPrinterStatus],
  ].forEach(([tag, cls]) => {
    if (!customElements.get(tag)) customElements.define(tag, cls);
  });

  window.customCards = window.customCards || [];
  window.customCards.push(
    { type: 'imperial-header',         name: 'Imperial Header',         description: 'Imperial section divider' },
    { type: 'imperial-panel',          name: 'Imperial Panel',          description: 'Imperial entity list' },
    { type: 'imperial-readout',        name: 'Imperial Readout',        description: 'Phosphor sensor display' },
    { type: 'imperial-button',         name: 'Imperial Button',         description: 'Imperial command button' },
    { type: 'imperial-printer-status', name: 'Imperial Printer Status', description: 'Printer fleet status block' },
  );

  console.info(
    '%c IMPERIAL COMMAND INTERFACE %c v' + VERSION + ' ',
    'background:#CC0000;color:#fff;font-weight:700;padding:2px 6px;',
    'background:#111;color:#CC0000;font-weight:700;padding:2px 6px;'
  );
})();
