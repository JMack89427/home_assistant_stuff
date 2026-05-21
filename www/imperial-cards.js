// =============================================================================
// IMPERIAL COMMAND INTERFACE — Custom Lovelace Cards v1.0.0
// Star Wars Dark Side aesthetic for Home Assistant
// =============================================================================
(function () {
  'use strict';

  const VERSION = '2.7.2';

  const WX_ICONS = {
    'sunny':'mdi:weather-sunny','clear-night':'mdi:weather-night',
    'partlycloudy':'mdi:weather-partly-cloudy','cloudy':'mdi:weather-cloudy',
    'fog':'mdi:weather-fog','rainy':'mdi:weather-rainy',
    'pouring':'mdi:weather-pouring','snowy':'mdi:weather-snowy',
    'snowy-rainy':'mdi:weather-snowy-rainy','windy':'mdi:weather-windy',
    'windy-variant':'mdi:weather-windy-variant','hail':'mdi:weather-hail',
    'lightning':'mdi:weather-lightning','lightning-rainy':'mdi:weather-lightning-rainy',
    'exceptional':'mdi:alert-circle-outline',
  };

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
    .p { position:absolute; width:8px; height:8px; background:var(--ir); z-index:3; }
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

  // Shared printer data extractor — supports Bambu and Moonraker naming
  function getPrinterInfo(h, prefix) {
    const eid = (...sfx) => {
      for (const s of sfx) {
        const key = `${prefix}_${s}`;
        const e = Object.values(h?.states || {}).find(x => x.entity_id.endsWith('.' + key));
        if (e) return e;
      }
      return null;
    };
    const onlineEnt       = eid('online');
    const printerStateEnt = eid('printer_state');
    const statusEnt       = eid('current_print_state', 'print_status');
    const progressEnt     = eid('progress', 'print_progress');
    const taskEnt         = eid('filename', 'task_name');
    const remainEnt       = eid('print_time_left', 'remaining_time');
    const curLayEnt       = eid('current_layer');
    const totLayEnt       = eid('total_layer', 'total_layer_count');
    const nozzEnt         = eid('extruder_temperature', 'nozzle_temperature');
    const bedEnt          = eid('bed_temperature');
    const errEnt          = eid('print_error');
    const nameEnt         = eid('printer_name');

    const isOnline = onlineEnt
      ? onlineEnt.state === 'on'
      : (printerStateEnt ? !['shutdown','startup','unavailable'].includes(printerStateEnt.state) : false);

    const sv       = statusEnt?.state || 'unavailable';
    const pct      = Math.min(100, Math.max(0, parseFloat(progressEnt?.state) || 0));
    const hasError = errEnt?.state === 'on' || sv === 'error' || printerStateEnt?.state === 'error';

    const PRINTING   = new Set(['running','prepare','slicing','printing']);
    const isPrinting = PRINTING.has(sv);
    const isPaused   = sv === 'pause'  || sv === 'paused';
    const isDone     = sv === 'finish' || sv === 'complete';
    const isFailed   = sv === 'failed' || sv === 'error';
    const isCancelled= sv === 'cancelled';
    const isOffline  = sv === 'unavailable' || sv === 'offline' || sv === 'shutdown' || !isOnline;
    const isActive   = isPrinting || isPaused || hasError;

    let statusColor, statusLabel;
    if (hasError || isFailed)  { statusColor = 'var(--ir)'; statusLabel = 'ERROR'; }
    else if (isPrinting)       { statusColor = 'var(--ia)'; statusLabel = 'PRINTING'; }
    else if (isPaused)         { statusColor = 'var(--ia)'; statusLabel = 'PAUSED'; }
    else if (isDone)           { statusColor = 'var(--ig)'; statusLabel = 'COMPLETE'; }
    else if (isCancelled)      { statusColor = 'var(--igreyl)'; statusLabel = 'CANCELLED'; }
    else if (isOffline)        { statusColor = 'var(--igrey)'; statusLabel = 'OFFLINE'; }
    else                       { statusColor = 'var(--igreyl)'; statusLabel = 'IDLE'; }

    const clean  = e => (!e || ['unavailable','unknown','none',''].includes(e.state)) ? null : e.state;
    const remVal = clean(remainEnt);
    return {
      isActive, isPrinting, isPaused, isDone, isFailed, isCancelled, isOffline, hasError,
      statusColor, statusLabel, pct,
      taskStr:  clean(taskEnt),
      remStr:   remVal ? (parseFloat(remVal) < 1
        ? `${Math.round(parseFloat(remVal) * 60)}M`
        : `${parseFloat(remVal).toFixed(1)}H`) : '---',
      layerStr: (clean(curLayEnt) && clean(totLayEnt))
        ? `${curLayEnt.state}/${totLayEnt.state}` : '---',
      nozzStr:  clean(nozzEnt) ? `${nozzEnt.state}°` : '---',
      bedStr:   clean(bedEnt)  ? `${bedEnt.state}°`  : '---',
      barColor: isPrinting ? 'var(--ir)' : isDone ? 'var(--ig)' : 'var(--igreyl)',
      barGlow:  isPrinting ? 'box-shadow:0 0 8px rgba(204,0,0,.7)' : '',
      fallbackName: clean(nameEnt),
    };
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
      const { title, subtitle, icon: ic, lock } = this._c;
      this.shadowRoot.innerHTML = `
        <style>
          :host{display:block}
          .w{${V} position:relative}
          .b{background:linear-gradient(90deg,var(--ir) 0%,rgba(204,0,0,.2) 45%,transparent 100%);
            border:1px solid rgba(204,0,0,.45);padding:18px 29px;
            display:flex;align-items:center;gap:18px}
          .b > ha-icon{color:#000;--mdc-icon-size:36px;flex-shrink:0}
          .t{flex:1}
          .ti{font-family:var(--iui);font-size:18px;font-weight:700;
            letter-spacing:5px;text-transform:uppercase;color:#fff}
          .su{font-family:var(--imono);font-size:13px;letter-spacing:3px;
            color:#fff;margin-top:3px}
          .di{width:14px;height:14px;flex-shrink:0;background:var(--ir);
            clip-path:polygon(50% 0%,100% 50%,50% 100%,0% 50%)}
          .lk{cursor:pointer;display:flex;align-items:center;padding:4px;
            color:rgba(255,255,255,.45);transition:color .15s;flex-shrink:0}
          .lk:hover{color:rgba(255,255,255,.9)}
          .lk ha-icon{--mdc-icon-size:24px;color:inherit}
          ${PIPS}
        </style>
        <div class="w">${PHTML}
          <div class="b">
            ${ic ? `<ha-icon icon="${ic}"></ha-icon>` : '<div class="di"></div>'}
            <div class="t">
              <div class="ti">${title}</div>
              ${subtitle ? `<div class="su">${subtitle}</div>` : ''}
            </div>
            ${lock ? `<div class="lk"><ha-icon icon="mdi:lock-outline"></ha-icon></div>` : '<div class="di"></div>'}
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
          if (e.round && !unavail && !isNaN(parseFloat(so.state))) {
            const u = so.attributes?.unit_of_measurement || '';
            tx = (String(Math.round(parseFloat(so.state))) + (u ? ' ' + u : '')).toUpperCase();
          } else {
            tx = txt(so);
          }
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
            border-bottom:1px solid rgba(204,0,0,.25);padding:10px 20px;
            font-family:var(--iui);font-size:14px;font-weight:700;
            letter-spacing:4px;text-transform:uppercase;color:#fff;position:relative;z-index:1}
          .row{display:flex;align-items:center;gap:14px;padding:13px 20px;
            border-bottom:1px solid rgba(204,0,0,.07);position:relative;z-index:1;
            transition:background .12s}
          .row:last-child{border-bottom:none}
          .row.tog{cursor:pointer}
          .row.tog:hover{background:rgba(204,0,0,.06)}
          .row.tog:active{background:rgba(204,0,0,.12)}
          ha-icon{--mdc-icon-size:24px;flex-shrink:0}
          .nm{flex:1;min-width:0;font-family:var(--iui);font-size:15px;letter-spacing:2px;color:var(--itext);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
          .vl{flex-shrink:0;font-family:var(--imono);font-size:15px;letter-spacing:.5px;white-space:nowrap}
          .dt{width:8px;height:8px;border-radius:50%;flex-shrink:0;align-self:center}
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
      const { entity, name, color = 'green', attribute, unit: unitOverride, round: doRound } = this._c;
      const so  = st(this._h, entity);
      let state = attribute
        ? String(so?.attributes?.[attribute] ?? '---')
        : (so?.state || '---');
      if (doRound && !isNaN(parseFloat(state)) && state !== '---') {
        state = String(Math.round(parseFloat(state)));
      }
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
            padding:20px 22px 17px;position:relative;overflow:hidden}
          .card::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;
            background:${dead?'var(--igrey)':c2}}
          ${SCAN} ${PIPS}
          .p{background:${dead?'var(--igrey)':c2}}
          .lb{font-family:var(--imono);font-size:13px;letter-spacing:4px;text-transform:uppercase;
            color:${c2};opacity:${dead?.3:.7};margin-bottom:8px;position:relative;z-index:1}
          .rv{display:flex;align-items:baseline;gap:7px;position:relative;z-index:1}
          .vl{font-family:var(--imono);font-size:64px;font-weight:700;line-height:1;
            letter-spacing:-3px;color:${dead?'var(--igrey)':c2};
            text-shadow:${dead?'none':`0 0 12px ${glow},0 0 28px ${dim}`}}
          .un{font-family:var(--imono);font-size:22px;color:${c2};opacity:.5}
          .dv{height:1px;background:linear-gradient(90deg,${c2},transparent);
            margin:13px 0 7px;opacity:.3;position:relative;z-index:1}
          .ft{font-family:var(--imono);font-size:13px;letter-spacing:3px;
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
            padding:22px 17px 17px;display:flex;flex-direction:column;
            align-items:center;gap:11px;text-align:center;
            position:relative;overflow:hidden;min-height:140px;
            box-shadow:${active?`0 0 18px ${gl}`:'none'};
            transition:background .15s,box-shadow .15s,border-color .15s}
          .b:hover{background:${dm};border-color:${c2};box-shadow:0 0 22px ${gl}}
          .b:active{opacity:.7}
          ${PIPS} .p{background:${c2}}
          ${SCAN}
          ha-icon{color:${active?c2:'var(--igreyl)'};--mdc-icon-size:42px;
            transition:color .15s;position:relative;z-index:1}
          .b:hover ha-icon{color:${c2}}
          .lb{font-family:var(--iui);font-size:13px;font-weight:700;
            letter-spacing:3.5px;text-transform:uppercase;
            color:var(--itext);position:relative;z-index:1}
        </style>
        <div class="b">${PHTML}<div class="sl"></div>
          <ha-icon icon="${ic}"></ha-icon>
          <div class="lb">${name}</div>
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
      const { isActive, isPrinting, isDone, hasError, isOffline,
              statusColor, statusLabel, pct,
              taskStr, remStr, layerStr, nozzStr, bedStr, barColor, barGlow,
              fallbackName } = getPrinterInfo(h, prefix);
      const displayName = name || fallbackName || prefix;

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

  // ============================================================================
  // imperial-fleet-grid  (2-col active/standby grouped printer overview)
  // ============================================================================
  class ImperialFleetGrid extends HTMLElement {
    setConfig(c) {
      if (!c.printers?.length) throw new Error('imperial-fleet-grid: printers required');
      this._c = c;
      if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
    }
    set hass(h) { this._h = h; this._r(); }
    _r() {
      if (!this.shadowRoot || !this._c) return;
      const h = this._h;
      const items = this._c.printers.map(p => ({
        name: p.name || p.prefix,
        info: getPrinterInfo(h, p.prefix),
      }));
      const active   = items.filter(i => i.info.isActive);
      const standby  = items.filter(i => !i.info.isActive && !i.info.isOffline);
      const offline  = items.filter(i => i.info.isOffline);

      const block = (displayName, info) => {
        const { statusColor, statusLabel, pct, taskStr,
                remStr, layerStr, nozzStr, bedStr, barColor, barGlow,
                isPrinting, hasError } = info;
        return `
          <div class="pb-wrap">
            ${PHTML}
            <div class="phd">
              <div class="dot" style="background:${statusColor};${isPrinting?`box-shadow:0 0 6px ${statusColor};animation:pulse 1.8s ease-in-out infinite`:''}"></div>
              <div class="pname">${displayName}</div>
              <div class="sbadge" style="border-color:${statusColor};color:${statusColor};background:${statusColor}1a">${statusLabel}</div>
            </div>
            <div class="pbar"><div class="pfill" style="width:${pct}%;background:${barColor};${barGlow}"></div>${pct>0?`<span class="ppct">${Math.round(pct)}%</span>`:''}</div>
            <div class="stats">
              <div class="stat"><div class="slabel">Nozzle</div><div class="sval">${nozzStr}</div></div>
              <div class="stat"><div class="slabel">Bed</div><div class="sval">${bedStr}</div></div>
              <div class="stat"><div class="slabel">Layers</div><div class="sval">${layerStr}</div></div>
              <div class="stat"><div class="slabel">Remain</div><div class="sval">${remStr}</div></div>
            </div>
            ${taskStr ? `<div class="job"><span class="jlabel">JOB //</span><span class="jname">${taskStr.toUpperCase()}</span></div>` : ''}
            ${hasError ? `<div class="err"><ha-icon icon="mdi:alert-circle" style="--mdc-icon-size:20px"></ha-icon>PRINT ERROR</div>` : ''}
          </div>`;
      };

      const section = (title, list, accentColor) => {
        if (!list.length) return '';
        return `
          <div class="sh">
            <div class="shbar" style="background:${accentColor}"></div>
            <span class="shtitle" style="color:${accentColor}">${title}</span>
            <span class="shcount">${list.length}</span>
          </div>
          <div class="grid">${list.map(i => block(i.name, i.info)).join('')}</div>`;
      };

      this.shadowRoot.innerHTML = `
        <style>
          :host{display:block}
          .wrap{${V}}
          @keyframes pulse{0%,100%{opacity:1}50%{opacity:.25}}
          /* section header */
          .sh{display:flex;align-items:center;gap:12px;padding:12px 2px;margin-top:15px}
          .sh:first-child{margin-top:0}
          .shbar{width:5px;height:21px;flex-shrink:0}
          .shtitle{font-family:var(--iui);font-size:15px;font-weight:700;
            letter-spacing:4px;text-transform:uppercase;flex:1}
          .shcount{font-family:var(--imono);font-size:16px;color:var(--itextd)}
          /* 2-col grid */
          .grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:4px}
          /* printer block */
          .pb-wrap{${V} background:var(--ipanel);border:1px solid rgba(204,0,0,.28);
            position:relative;overflow:hidden}
          ${PIPS} ${SCAN}
          .phd{display:flex;align-items:center;gap:12px;padding:14px 18px;
            border-bottom:1px solid rgba(204,0,0,.1);position:relative;z-index:1}
          .dot{width:12px;height:12px;border-radius:50%;flex-shrink:0}
          .pname{flex:1;font-family:var(--iui);font-size:15px;font-weight:700;
            letter-spacing:3px;text-transform:uppercase;color:#fff;
            overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
          .sbadge{font-family:var(--imono);font-size:12px;letter-spacing:2.5px;
            padding:4px 9px;border:1px solid;flex-shrink:0}
          .pbar{height:5px;background:var(--igrey);position:relative;z-index:1}
          .pfill{height:100%;transition:width .6s}
          .ppct{position:absolute;right:6px;top:50%;transform:translateY(-50%);
            font-family:var(--imono);font-size:10px;color:var(--itext);opacity:.6;z-index:2}
          .stats{display:grid;grid-template-columns:repeat(4,1fr);
            border-bottom:1px solid rgba(204,0,0,.07);position:relative;z-index:1}
          .stat{padding:9px 6px;text-align:center;border-right:1px solid rgba(204,0,0,.07)}
          .stat:last-child{border-right:none}
          .slabel{font-family:var(--imono);font-size:11px;letter-spacing:1px;
            color:var(--itextd);text-transform:uppercase}
          .sval{font-family:var(--imono);font-size:16px;color:var(--itext);margin-top:3px}
          .job{padding:8px 18px;display:flex;align-items:center;gap:9px;
            position:relative;z-index:1}
          .jlabel{font-family:var(--imono);font-size:12px;letter-spacing:1px;
            color:var(--itextd);flex-shrink:0}
          .jname{font-family:var(--imono);font-size:14px;color:var(--itext);
            overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
          .err{padding:8px 18px;background:rgba(204,0,0,.1);
            border-top:1px solid rgba(204,0,0,.5);
            font-family:var(--imono);font-size:12px;letter-spacing:2px;
            color:var(--ir);display:flex;align-items:center;gap:8px;
            position:relative;z-index:1;animation:pulse 1.2s ease-in-out infinite}
        </style>
        <div class="wrap">
          ${section('Active Units', active, 'var(--ia)')}
          ${section('Standby', standby, 'var(--igreyl)')}
          ${section('Offline', offline, 'var(--igrey)')}
        </div>`;
    }
    getCardSize() { return Math.ceil((this._c?.printers?.length || 0) / 2) * 3 + 2; }
    static getStubConfig() {
      return { printers: [{ prefix: 'p1p_01s00c431300106', name: 'BAMBU P1P' }] };
    }
  }

  // ============================================================================
  // imperial-responsive-columns  (2-col on wide, 1-col on narrow/mobile)
  // ============================================================================
  class ImperialResponsiveColumns extends HTMLElement {
    setConfig(c) {
      if (!c.left || !c.right) throw new Error('imperial-responsive-columns: left and right required');
      this._c = c;
      this._hass = null;
      this._leftEls = [];
      this._rightEls = [];
      if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
      this._setup();
    }

    async _setup() {
      const helpers = await window.loadCardHelpers();
      this._leftEls  = (this._c.left  || []).map(cfg => helpers.createCardElement(cfg));
      this._rightEls = (this._c.right || []).map(cfg => helpers.createCardElement(cfg));
      this._render();
      if (this._hass) this._passHass();
    }

    _passHass() {
      [...this._leftEls, ...this._rightEls].forEach(el => { el.hass = this._hass; });
    }

    set hass(h) {
      this._hass = h;
      this._passHass();
    }

    _render() {
      this.shadowRoot.innerHTML = `
        <style>
          :host { display: block; }
          .cols { display: grid; grid-template-columns: minmax(0,2fr) minmax(0,3fr); gap: 8px; align-items: start; }
          @media (max-width: 900px) { .cols { grid-template-columns: 1fr; } }
          .col { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
        </style>
        <div class="cols">
          <div class="left col"></div>
          <div class="right col"></div>
        </div>`;
      const leftEl  = this.shadowRoot.querySelector('.left');
      const rightEl = this.shadowRoot.querySelector('.right');
      this._leftEls.forEach(el  => leftEl.appendChild(el));
      this._rightEls.forEach(el => rightEl.appendChild(el));
    }

    getCardSize() { return 6; }
    static getStubConfig() { return { left: [], right: [] }; }
  }

  // ============================================================================
  // imperial-clock  (self-updating time/date display — no sensor needed)
  // ============================================================================
  class ImperialClock extends HTMLElement {
    setConfig(c) {
      this._c = c || {};
      if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
      this._render();
    }
    connectedCallback() {
      if (!this._timer) this._timer = setInterval(() => this._tick(), 1000);
    }
    disconnectedCallback() {
      clearInterval(this._timer);
      this._timer = null;
      if (this._fUnsub) { this._fUnsub(); this._fUnsub = null; }
    }
    set hass(h) {
      this._h = h;
      this._subscribeForecast();
      this._wupdate();
    }
    async _subscribeForecast() {
      if (this._fUnsub || !this._h || !this._c.weather) return;
      try {
        this._fUnsub = await this._h.connection.subscribeMessage(
          (msg) => { this._fData = msg.forecast?.[0] ?? null; this._wupdate(); },
          { type: 'weather/subscribe_forecast', forecast_type: 'daily', entity_id: this._c.weather }
        );
      } catch (_) {}
    }
    _render() {
      const wx = !!this._c.weather;
      this.shadowRoot.innerHTML = `
        <style>
          :host{display:block}
          .card{${V} background:var(--ipanel);border:1px solid rgba(204,0,0,.3);
            position:relative;overflow:hidden;padding:28px 24px;}
          ${PIPS} ${SCAN}
          .top{position:relative;z-index:1;display:flex;align-items:baseline;
            justify-content:space-between;margin-bottom:10px}
          .day{font-family:var(--iui);font-size:13px;font-weight:700;
            letter-spacing:6px;text-transform:uppercase;color:var(--ia);opacity:.85}
          .dt{font-family:var(--iui);font-size:12px;letter-spacing:4px;
            text-transform:uppercase;color:var(--igreyl)}
          .dv{height:1px;background:linear-gradient(90deg,transparent,var(--ir),transparent);
            margin:0 0 14px;opacity:.25;position:relative;z-index:1}
          .main{position:relative;z-index:1;display:flex;align-items:center;
            justify-content:space-between;gap:12px}
          .tc{display:flex;align-items:baseline;gap:6px}
          .tm{font-family:var(--imono);font-size:72px;font-weight:700;
            letter-spacing:-3px;line-height:1;color:var(--ir);
            text-shadow:0 0 20px rgba(204,0,0,.55),0 0 50px rgba(204,0,0,.2)}
          .ap{font-family:var(--imono);font-size:20px;letter-spacing:2px;
            color:var(--ir);opacity:.5;align-self:flex-end;padding-bottom:8px}
          .wx{display:flex;align-items:center;gap:12px}
          .wx-svg{flex-shrink:0;fill:var(--ir);filter:drop-shadow(0 0 8px rgba(204,0,0,.45))}
          .wx-rows{text-align:left}
          .wx-row{font-family:var(--iui);font-size:11px;letter-spacing:3px;
            text-transform:uppercase;color:var(--igreyl);line-height:2}
          .wx-val{color:var(--ia);font-weight:700}
        </style>
        <div class="card">${PHTML}<div class="sl"></div>
          <div class="top">
            <span class="day" id="cl-d">---</span>
            <span class="dt" id="cl-dt">--- --, ----</span>
          </div>
          <div class="dv"></div>
          <div class="main">
            <div class="tc">
              <span class="tm" id="cl-t">--:--</span>
              <span class="ap" id="cl-ap">--</span>
            </div>
            ${wx ? `<div class="wx">
              <svg class="wx-svg" id="cl-icon" viewBox="0 0 24 24" width="72" height="72"><path id="cl-icon-path" d=""/></svg>
              <div class="wx-rows">
                <div class="wx-row">H <span class="wx-val" id="cl-hi">--</span> &nbsp; L <span class="wx-val" id="cl-lo">--</span></div>
                <div class="wx-row">Feels <span class="wx-val" id="cl-fl">--</span></div>
              </div>
            </div>` : ''}
          </div>
        </div>`;
      this._tick();
      if (this._h) this._wupdate();
    }
    _tick() {
      const sr = this.shadowRoot;
      if (!sr) return;
      const now = new Date();
      const DAYS   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
      const MONTHS = ['January','February','March','April','May','June',
                      'July','August','September','October','November','December'];
      let h = now.getHours();
      const ap = h >= 12 ? 'PM' : 'AM';
      h = h % 12 || 12;
      const m = String(now.getMinutes()).padStart(2, '0');
      const dEl  = sr.getElementById('cl-d');
      const tEl  = sr.getElementById('cl-t');
      const apEl = sr.getElementById('cl-ap');
      const dtEl = sr.getElementById('cl-dt');
      if (dEl)  dEl.textContent  = DAYS[now.getDay()];
      if (tEl)  tEl.textContent  = `${h}:${m}`;
      if (apEl) apEl.textContent = ap;
      if (dtEl) dtEl.textContent = `${MONTHS[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;
    }
    _wupdate() {
      const sr = this.shadowRoot;
      if (!sr || !this._h || !this._c.weather) return;
      const st = this._h.states[this._c.weather];
      if (!st) return;
      const attr = st.attributes;
      const unit = attr.temperature_unit || '°F';
      const hi = this._fData?.temperature != null ? Math.round(this._fData.temperature) : null;
      const lo = this._fData?.templow     != null ? Math.round(this._fData.templow)     : null;
      let fl = attr.apparent_temperature != null ? Math.round(attr.apparent_temperature) : null;
      if (fl == null && attr.temperature != null) {
        const t = attr.temperature, w = attr.wind_speed || 0, h = attr.humidity || 0;
        if (t <= 50 && w > 3)
          fl = Math.round(35.74 + 0.6215*t - 35.75*Math.pow(w,0.16) + 0.4275*t*Math.pow(w,0.16));
        else if (t >= 80 && h >= 40)
          fl = Math.round(-42.379 + 2.04901523*t + 10.14333127*h - 0.22475541*t*h
            - 0.00683783*t*t - 0.05481717*h*h + 0.00122874*t*t*h
            + 0.00085282*t*h*h - 0.00000199*t*t*h*h);
        else fl = Math.round(t);
      }
      const hiEl = sr.getElementById('cl-hi');
      const loEl = sr.getElementById('cl-lo');
      const flEl = sr.getElementById('cl-fl');
      if (hiEl) hiEl.textContent = hi != null ? `${hi}${unit}` : '--';
      if (loEl) loEl.textContent = lo != null ? `${lo}${unit}` : '--';
      if (flEl) flEl.textContent = fl != null ? `${fl}${unit}` : '--';
      this._setIconPath(WX_ICONS[st.state] || 'mdi:weather-cloudy');
    }
    _setIconPath(iconName) {
      if (!this._ipc) this._ipc = {};
      if (!this._ipl) this._ipl = new Set();
      const pathEl = this.shadowRoot?.getElementById('cl-icon-path');
      if (this._ipc[iconName] !== undefined) {
        if (pathEl) pathEl.setAttribute('d', this._ipc[iconName]);
        return;
      }
      if (this._ipl.has(iconName)) return;
      this._ipl.add(iconName);
      (async () => {
        try {
          const host = document.createElement('div');
          const el   = document.createElement('ha-icon');
          el.setAttribute('icon', iconName);
          host.appendChild(el);
          // Attach to a detached shadow so Lit can render without touching live DOM
          const detached = document.createElement('div');
          detached.attachShadow({ mode: 'open' }).appendChild(host);
          await new Promise(r => setTimeout(r, 300));
          if (el.updateComplete) await el.updateComplete.catch(() => {});
          const inner = el.shadowRoot?.querySelector('ha-svg-icon');
          if (inner?.updateComplete) await inner.updateComplete.catch(() => {});
          const d = inner?.shadowRoot?.querySelector('path')?.getAttribute('d')
                 || el.shadowRoot?.querySelector('path')?.getAttribute('d') || '';
          this._ipc[iconName] = d;
          const p = this.shadowRoot?.getElementById('cl-icon-path');
          if (p && d) p.setAttribute('d', d);
        } catch (e) { this._ipc[iconName] = ''; }
        this._ipl.delete(iconName);
      })();
    }
    getCardSize() { return 4; }
    static getStubConfig() { return { weather: 'weather.forecast_home' }; }
  }

  // ============================================================================
  // imperial-alert-panel  (low battery + unavailable entity scanner)
  // ============================================================================
  class ImperialAlertPanel extends HTMLElement {
    setConfig(c) {
      this._c = c || {};
      if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
    }
    set hass(h) { this._h = h; this._r(); }
    _r() {
      if (!this.shadowRoot || !this._c) return;
      const {
        title = 'System Alerts',
        battery_threshold = 20,
        exclude_entities: userExEntities = [],
        max_rows = 8,
      } = this._c;
      const h = this._h;
      if (!h) return;

      const exEntities = new Set(userExEntities);

      // Domains and device classes considered security/alarm-relevant
      const ALARM_DOMAINS  = new Set(['alarm_control_panel', 'lock', 'camera']);
      const ALARM_CLASSES  = new Set(['motion','door','window','garage_door','lock',
                                      'smoke','carbon_monoxide','moisture','occupancy',
                                      'safety','tamper','sound','vibration']);

      const lowBat = [], offline = [];

      Object.values(h.states).forEach(s => {
        const id     = s.entity_id;
        const domain = id.split('.')[0];
        if (exEntities.has(id)) return;
        const a  = s.attributes || {};
        const nm = a.friendly_name || id;
        const dc = a.device_class;

        // Battery: device_class=battery sensor or battery_level attribute
        if (dc === 'battery' && !isNaN(parseFloat(s.state))) {
          const pct = parseFloat(s.state);
          if (pct < battery_threshold) lowBat.push({ nm, pct: Math.round(pct) });
        } else if (a.battery_level !== undefined && !isNaN(parseFloat(a.battery_level))) {
          const pct = parseFloat(a.battery_level);
          if (pct < battery_threshold) lowBat.push({ nm, pct: Math.round(pct) });
        }

        // Offline: alarm/security-relevant entities only
        if (s.state === 'unavailable') {
          const isAlarmDomain  = ALARM_DOMAINS.has(domain);
          const isAlarmSensor  = domain === 'binary_sensor' && ALARM_CLASSES.has(dc);
          if (isAlarmDomain || isAlarmSensor) offline.push({ nm });
        }
      });

      lowBat.sort((a, b) => a.pct - b.pct);
      offline.sort((a, b) => a.nm.localeCompare(b.nm));

      const allClear = lowBat.length === 0 && offline.length === 0;

      const batPct = b => {
        const c2 = b.pct < 10 ? 'var(--ir)' : 'var(--ia)';
        return `<div class="row">
          <ha-icon icon="mdi:battery-alert" style="color:${c2}"></ha-icon>
          <span class="nm">${b.nm}</span>
          <span class="vl" style="color:${c2}">${b.pct}%</span>
        </div>`;
      };
      const offRow = o => `<div class="row">
        <ha-icon icon="mdi:wifi-off" style="color:var(--igrey)"></ha-icon>
        <span class="nm">${o.nm}</span>
        <span class="vl" style="color:var(--igrey)">UNAVAILABLE</span>
      </div>`;
      const overflow = (n, color) =>
        n > 0 ? `<div class="more" style="color:${color}">+ ${n} more</div>` : '';

      const section = (label, color, icon2, rows, fn) => {
        if (!rows.length) return '';
        const shown = rows.slice(0, max_rows);
        const extra = rows.length - shown.length;
        return `
          <div class="sh">
            <div class="shbar" style="background:${color}"></div>
            <ha-icon icon="${icon2}" style="color:${color};--mdc-icon-size:16px"></ha-icon>
            <span class="shtitle" style="color:${color}">${label}</span>
            <span class="shcount" style="color:${color}">${rows.length}</span>
          </div>
          ${shown.map(fn).join('')}
          ${overflow(extra, color)}`;
      };

      this.shadowRoot.innerHTML = `
        <style>
          :host{display:block}
          .card{${V} background:var(--ipanel);border:1px solid rgba(204,0,0,.3);
            position:relative;overflow:hidden}
          ${PIPS} ${SCAN}
          .hd{background:linear-gradient(90deg,rgba(204,0,0,.5),rgba(204,0,0,.1) 55%,transparent);
            border-bottom:1px solid rgba(204,0,0,.25);padding:10px 20px;
            font-family:var(--iui);font-size:14px;font-weight:700;
            letter-spacing:4px;text-transform:uppercase;color:#fff;
            position:relative;z-index:1}
          .sh{display:flex;align-items:center;gap:10px;
            padding:10px 20px 6px;position:relative;z-index:1}
          .shbar{width:4px;height:16px;flex-shrink:0}
          .shtitle{flex:1;font-family:var(--iui);font-size:12px;font-weight:700;
            letter-spacing:3px;text-transform:uppercase}
          .shcount{font-family:var(--imono);font-size:14px}
          .row{display:flex;align-items:center;gap:14px;padding:9px 20px;
            border-bottom:1px solid rgba(204,0,0,.06);position:relative;z-index:1}
          .row:last-of-type{border-bottom:none}
          ha-icon{--mdc-icon-size:20px;flex-shrink:0}
          .nm{flex:1;font-family:var(--iui);font-size:13px;letter-spacing:1.5px;
            color:var(--itext);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
          .vl{font-family:var(--imono);font-size:13px;flex-shrink:0}
          .more{padding:6px 20px 10px;font-family:var(--imono);font-size:11px;
            letter-spacing:2px;opacity:.6;position:relative;z-index:1}
          .ok{display:flex;align-items:center;gap:14px;padding:20px;
            position:relative;z-index:1}
          .ok ha-icon{color:var(--ig);--mdc-icon-size:28px}
          .ok span{font-family:var(--iui);font-size:14px;font-weight:700;
            letter-spacing:4px;text-transform:uppercase;
            color:var(--ig);text-shadow:0 0 10px rgba(0,200,83,.4)}
        </style>
        <div class="card">${PHTML}<div class="sl"></div>
          <div class="hd">${title.toUpperCase()}</div>
          ${allClear
            ? `<div class="ok">
                <ha-icon icon="mdi:shield-check"></ha-icon>
                <span>All Systems Nominal</span>
               </div>`
            : section('Low Battery', 'var(--ia)', 'mdi:battery-alert', lowBat, batPct)
              + section('Alarm / Security Offline', 'var(--igrey)', 'mdi:shield-off-outline', offline, offRow)
          }
        </div>`;
    }
    getCardSize() { return 3; }
    static getStubConfig() { return { battery_threshold: 20 }; }
  }

  // ============================================================================
  // imperial-camera  (rotatable camera viewer — polls /api/camera_proxy)
  // ============================================================================
  class ImperialCamera extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
    }
    setConfig(c) {
      this._c = c || {};
      this._built = false;
    }
    set hass(h) {
      this._h = h;
      if (!this._built) { this._build(); return; }
      this._refresh();
    }
    _build() {
      if (!this._c?.entity) return;
      const { rotation = 0, title = '', aspect_ratio = '' } = this._c;
      const rot = parseInt(rotation) || 0;
      const sideways = rot === 90 || rot === 270;
      const containerRatio = aspect_ratio || (sideways ? '9 / 16' : '16 / 9');
      const scale = sideways ? (16 / 9).toFixed(3) : '1';
      this.shadowRoot.innerHTML = `
        <style>
          :host { display: block; position: relative; overflow: hidden; background: #000;
                  aspect-ratio: ${containerRatio}; }
          img {
            display: block; width: 100%; height: 100%; object-fit: cover;
            ${rot ? `transform: rotate(${rot}deg) scale(${scale}); transform-origin: center;` : ''}
          }
          .lbl {
            position: absolute; bottom: 0; left: 0; right: 0;
            padding: 4px 8px; background: rgba(0,0,0,0.65);
            color: #E8E8E8; font-family: 'Courier New', monospace;
            font-size: 11px; letter-spacing: 1px; text-transform: uppercase;
            pointer-events: none; z-index: 2;
          }
        </style>
        <img id="cam" />
        ${title ? `<div class="lbl">${title}</div>` : ''}
      `;
      this._img = this.shadowRoot.getElementById('cam');
      this._built = true;
      this._refresh();
      this._timer = setInterval(() => this._refresh(), 5000);
    }
    _refresh() {
      if (!this._img || !this._h || !this._c?.entity) return;
      const token = this._h.auth?.data?.access_token || '';
      this._img.src = `/api/camera_proxy/${this._c.entity}?token=${token}&_t=${Date.now()}`;
    }
    disconnectedCallback() { clearInterval(this._timer); }
    getCardSize() { return 3; }
    static getStubConfig() { return { entity: 'camera.example', rotation: 0, title: '' }; }
  }

  // ── Register cards ─────────────────────────────────────────────────────────
  [
    ['imperial-header',          ImperialHeader],
    ['imperial-panel',           ImperialPanel],
    ['imperial-readout',         ImperialReadout],
    ['imperial-button',          ImperialButton],
    ['imperial-printer-status',  ImperialPrinterStatus],
    ['imperial-fleet-grid',         ImperialFleetGrid],
    ['imperial-responsive-columns', ImperialResponsiveColumns],
    ['imperial-clock',              ImperialClock],
    ['imperial-alert-panel',        ImperialAlertPanel],
    ['imperial-camera',             ImperialCamera],
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
    { type: 'imperial-fleet-grid',         name: 'Imperial Fleet Grid',         description: '2-col active/standby printer grid' },
    { type: 'imperial-responsive-columns', name: 'Imperial Responsive Columns', description: 'Responsive 2-col layout, stacks on mobile' },
    { type: 'imperial-clock',              name: 'Imperial Clock',              description: 'Self-updating time and date display' },
    { type: 'imperial-alert-panel',        name: 'Imperial Alert Panel',        description: 'Low battery and unavailable entity scanner' },
    { type: 'imperial-camera',             name: 'Imperial Camera',             description: 'Rotatable camera viewer' },
  );

  console.info(
    '%c IMPERIAL COMMAND INTERFACE %c v' + VERSION + ' ',
    'background:#CC0000;color:#fff;font-weight:700;padding:2px 6px;',
    'background:#111;color:#CC0000;font-weight:700;padding:2px 6px;'
  );
})();
