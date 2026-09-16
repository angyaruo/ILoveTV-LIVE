// Control Room: I Love TV! — floating TV controls

export function setup(ctx) {
  let state = {
    chatId: null,
    ledger: {
      affinity: 0,
      dynamic: 'Neutral Ground',
      continuity: { seasonArc: '', episodeTarget: '', bPlots: [], coreMemories: [], futureBranches: [] },
      selectedConnection: '',
      authorNote: '',
      settings: { expandChoices: true, trackerInterval: 1 },
      lastActions: []
    },
    connections: [],
    choices: []
  };
  let modal = null;
  let widget = null;
  let widgetExpanded = false;
  let generating = false;
  let choiceLoading = false;
  let pendingChoiceRequest = null;
  let positionFrame = null;
  const cleanups = [];

  const escapeHtml = (value = '') => String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  function showToast(message) {
    let toast = document.getElementById('cr-floating-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'cr-floating-toast';
      toast.style.cssText = 'position:fixed;bottom:84px;left:50%;transform:translateX(-50%);background:var(--lumiverse-fill-strong,#16161e);border:1px solid var(--lumiverse-primary,#8c82ff);color:var(--lumiverse-text,#fff);padding:7px 16px;border-radius:20px;font-size:12px;font-weight:700;z-index:99999;box-shadow:0 4px 16px rgba(0,0,0,.6);pointer-events:none;transition:opacity .2s';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.style.opacity = '1';
    setTimeout(() => { toast.style.opacity = '0'; }, 2400);
  }

  function findComposer() {
    return document.querySelector('textarea[name="chat-message"]')
      || document.querySelector('[data-component="InputArea"] textarea')
      || document.querySelector('textarea[placeholder*="message" i]')
      || document.querySelector('textarea');
  }

  function insertIntoComposer(text) {
    const textarea = findComposer();
    if (!textarea) {
      showToast('Could not locate the chat composer.');
      return false;
    }
    textarea.focus();
    const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
    if (setter) setter.call(textarea, text);
    else textarea.value = text;
    textarea.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true, inputType: 'insertText', data: text }));
    textarea.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    textarea.selectionStart = textarea.selectionEnd = textarea.value.length;
    showToast('Draft written into the composer.');
    return true;
  }

  function requestState() {
    ctx.sendToBackend({ type: 'control_room:get_state', chatId: state.chatId || undefined });
  }

  function saveLedger(patch) {
    ctx.sendToBackend({ type: 'control_room:save_ledger', chatId: state.chatId || undefined, ledger: patch });
  }

  function parseChoices(content) {
    const choices = [];
    for (const line of String(content || '').split(/\r?\n/)) {
      const match = line.match(/^\s*\[(\d+)\]\s*(.+?)\s*$/);
      if (match) choices.push({ number: Number(match[1]), text: match[2].replace(/^\[|\]$/g, '').trim() });
    }
    return choices.slice(0, 8);
  }

  function captureChoices(content) {
    const text = String(content || '');
    const tagged = text.match(/<cyoa_choices\b[^>]*>([\s\S]*?)<\/cyoa_choices>/i)?.[1] || text;
    const parsed = parseChoices(tagged);
    if (!parsed.length) return false;
    state.choices = parsed;
    generating = false;
    renderWidget();
    return true;
  }

  function isLive() {
    return generating || choiceLoading || state.choices.length > 0;
  }

  function positionWidget() {
    if (!widget) return;
    const composer = findComposer();
    const width = widgetExpanded ? Math.min(380, Math.max(280, window.innerWidth - 24)) : 58;
    const height = widgetExpanded ? Math.min(430, Math.max(220, window.innerHeight - 140)) : 48;
    widget.setSize(width, height);
    const rect = composer?.closest('[data-component="InputArea"]')?.getBoundingClientRect() || composer?.getBoundingClientRect();
    const x = rect ? Math.max(12, Math.min(window.innerWidth - width - 12, rect.right - width)) : Math.max(12, window.innerWidth - width - 24);
    const y = rect ? Math.max(12, rect.top - height - 10) : Math.max(12, window.innerHeight - height - 110);
    widget.moveTo(x, y);
  }

  function scheduleWidgetPosition() {
    if (positionFrame) cancelAnimationFrame(positionFrame);
    positionFrame = requestAnimationFrame(() => {
      positionFrame = null;
      positionWidget();
    });
  }

  function handleChoice(choice) {
    if (choiceLoading) return;
    if (state.ledger.settings?.expandChoices === false) {
      insertIntoComposer(String(choice.number));
      widgetExpanded = false;
      renderWidget();
      return;
    }
    pendingChoiceRequest = crypto.randomUUID();
    choiceLoading = true;
    renderWidget();
    ctx.sendToBackend({ type: 'control_room:expand_choice', chatId: state.chatId || undefined, requestId: pendingChoiceRequest, option: `[${choice.number}] ${choice.text}` });
  }

  function renderWidget() {
    if (!widget) return;
    const root = widget.root;
    root.innerHTML = '';
    root.style.cssText = 'overflow:visible;font-family:inherit;color:var(--lumiverse-text,#eee)';
    const shell = document.createElement('div');
    shell.style.cssText = `box-sizing:border-box;width:100%;height:100%;display:flex;flex-direction:column;overflow:hidden;border:1px solid ${isLive() ? '#ff3b3b' : 'var(--lumiverse-border,#444)'};border-radius:12px;background:var(--lumiverse-fill-strong,#16161e);box-shadow:0 8px 28px rgba(0,0,0,.52)`;
    const header = document.createElement('button');
    header.type = 'button';
    header.title = widgetExpanded ? 'Collapse Director’s Cut' : 'Open Director’s Cut';
    header.style.cssText = 'min-height:46px;display:flex;align-items:center;gap:8px;padding:8px 10px;border:0;background:transparent;color:inherit;cursor:pointer;text-align:left';
    header.innerHTML = `<span style="font-size:22px;line-height:1">📺</span>${widgetExpanded ? '<span style="font-size:12px;font-weight:900;flex:1;letter-spacing:.04em">DIRECTOR’S CUT</span>' : ''}<span aria-label="${isLive() ? 'Live' : 'Idle'}" style="width:9px;height:9px;flex:0 0 9px;border-radius:999px;background:${isLive() ? '#ff3030' : '#60606a'};box-shadow:${isLive() ? '0 0 0 3px rgba(255,48,48,.18),0 0 10px #ff3030' : 'none'};${isLive() ? 'animation:cr-live-pulse 1.25s ease-in-out infinite' : ''}"></span>`;
    header.onclick = () => { widgetExpanded = !widgetExpanded; renderWidget(); };
    shell.appendChild(header);

    if (widgetExpanded) {
      const body = document.createElement('div');
      body.style.cssText = 'display:flex;flex:1;min-height:0;flex-direction:column;gap:8px;padding:0 10px 10px;overflow:auto';
      if (choiceLoading) {
        body.innerHTML = '<div style="padding:18px 8px;text-align:center;font-size:12px;color:var(--lumiverse-primary,#8c82ff)">🎙️ Writing {{user}}’s take…</div>';
      } else if (!state.choices.length) {
        body.innerHTML = `<div style="padding:18px 8px;text-align:center;font-size:12px;color:var(--lumiverse-text-dim,#999)">${generating ? 'Control Room is live. Waiting for the response…' : 'CYOA options will appear here after the next broadcast.'}</div>`;
      } else {
        state.choices.forEach(choice => {
          const button = document.createElement('button');
          button.type = 'button';
          button.textContent = `[${choice.number}] ${choice.text}`;
          button.style.cssText = 'width:100%;padding:9px 10px;text-align:left;border:1px solid var(--lumiverse-border,#444);border-radius:7px;background:var(--lumiverse-fill-subtle,rgba(255,255,255,.05));color:inherit;cursor:pointer;font-size:12px';
          button.onclick = () => handleChoice(choice);
          body.appendChild(button);
        });
      }
      const mode = document.createElement('label');
      mode.style.cssText = 'display:flex;align-items:center;gap:7px;margin-top:auto;padding-top:7px;border-top:1px solid var(--lumiverse-border,rgba(255,255,255,.1));font-size:11px;color:var(--lumiverse-text-dim,#aaa);cursor:pointer';
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = state.ledger.settings?.expandChoices !== false;
      checkbox.onchange = () => {
        state.ledger.settings = { ...(state.ledger.settings || {}), expandChoices: checkbox.checked };
        saveLedger({ settings: state.ledger.settings });
      };
      mode.append(checkbox, document.createTextNode('AI writes the selected option as {{user}}'));
      body.appendChild(mode);
      shell.appendChild(body);
    }
    const style = document.createElement('style');
    style.textContent = '@keyframes cr-live-pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.45;transform:scale(.82)}}';
    root.append(style, shell);
    scheduleWidgetPosition();
  }

  function ensureWidget() {
    if (widget || !ctx.ui?.createFloatWidget) return;
    try {
      widget = ctx.ui.createFloatWidget({ width: 58, height: 48, initialPosition: { x: window.innerWidth - 82, y: window.innerHeight - 170 }, snapToEdge: false, tooltip: 'Director’s Cut', chromeless: true });
      renderWidget();
    } catch (error) {
      showToast(`Director’s Cut widget unavailable: ${error?.message || 'ui_panels permission required'}`);
    }
  }

  function listHtml(values, fallback) {
    return Array.isArray(values) && values.length ? `<ul style="margin:5px 0 0;padding-left:18px">${values.map(value => `<li>${escapeHtml(value)}</li>`).join('')}</ul>` : `<div class="cr-muted">${fallback}</div>`;
  }

  function renderDashboard() {
    if (!modal) return;
    const ledger = state.ledger;
    const continuity = ledger.continuity || {};
    const settings = ledger.settings || { expandChoices: true, trackerInterval: 1 };
    const connectionOptions = ['<option value="">Active/default connection</option>', ...state.connections.map(connection => `<option value="${escapeHtml(connection.id)}" ${connection.id === ledger.selectedConnection ? 'selected' : ''}>${escapeHtml(connection.name)}</option>`)].join('');
    const logs = (ledger.lastActions || []).slice(-12).reverse().map(item => `<div class="cr-log">${escapeHtml(item)}</div>`).join('') || '<div class="cr-muted">No passes logged yet.</div>';
    modal.root.innerHTML = `
      <style>.cr-grid{display:flex;flex-direction:column;gap:12px;color:var(--lumiverse-text,#e2e8f0);font-size:13px}.cr-row{display:flex;flex-direction:column;gap:5px}.cr-label{font-size:11px;font-weight:800;text-transform:uppercase;color:var(--lumiverse-primary,#8c82ff)}.cr-input{box-sizing:border-box;width:100%;padding:7px 9px;border:1px solid var(--lumiverse-border,#444);border-radius:6px;background:var(--lumiverse-fill-subtle,rgba(255,255,255,.05));color:inherit}.cr-muted{font-size:11px;color:var(--lumiverse-text-dim,#888)}.cr-card{padding:9px 10px;border:1px solid var(--lumiverse-border,#444);border-radius:7px;background:rgba(0,0,0,.18)}.cr-log{padding:3px 0;border-bottom:1px dashed rgba(255,255,255,.08)}.cr-save{align-self:flex-end;padding:7px 15px;border:1px solid var(--lumiverse-primary,#8c82ff);border-radius:6px;background:color-mix(in srgb,var(--lumiverse-primary,#8c82ff) 20%,transparent);color:var(--lumiverse-primary,#8c82ff);font-weight:800;cursor:pointer}</style>
      <div class="cr-grid">
        <div class="cr-row"><label class="cr-label">Background connection</label><select id="cr-connection" class="cr-input">${connectionOptions}</select></div>
        <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px"><div class="cr-card"><div class="cr-label">Affinity</div><div style="font:800 22px monospace">${Number(ledger.affinity) || 0}%</div></div><div class="cr-card"><div class="cr-label">Tracker cadence</div><div>Every <input id="cr-interval" type="number" min="1" max="10" value="${Number(settings.trackerInterval) || 1}" style="width:42px"> user turn(s)</div></div></div>
        <div class="cr-card"><div class="cr-label">Dynamic subtext</div><div>${escapeHtml(ledger.dynamic || 'Neutral Ground')}</div></div>
        <div class="cr-card"><div class="cr-label">Immediate episode target</div><div>${escapeHtml(continuity.episodeTarget || 'Awaiting tracker pass.')}</div></div>
        <div class="cr-card"><div class="cr-label">Season arc</div><div>${escapeHtml(continuity.seasonArc || 'Awaiting tracker pass.')}</div></div>
        <div class="cr-card"><div class="cr-label">B-plots & flags</div>${listHtml(continuity.bPlots, 'None captured yet.')}</div>
        <div class="cr-card"><div class="cr-label">Core memories</div>${listHtml(continuity.coreMemories, 'None captured yet.')}</div>
        <div class="cr-card"><div class="cr-label">Possible future branches</div>${listHtml(continuity.futureBranches, 'None captured yet.')}</div>
        <label style="display:flex;align-items:center;gap:8px"><input id="cr-expand" type="checkbox" ${settings.expandChoices !== false ? 'checked' : ''}> Use the selected model to write CYOA choices as {{user}}</label>
        <div class="cr-row"><label class="cr-label">Author’s note</label><textarea id="cr-note" class="cr-input" rows="3" placeholder="Direction, reminder, tone request…">${escapeHtml(ledger.authorNote)}</textarea></div>
        <div class="cr-row"><label class="cr-label">Director telemetry</label><div style="max-height:150px;overflow:auto;padding:8px 10px;border:1px solid var(--lumiverse-border,#444);border-radius:6px;background:rgba(0,0,0,.25);font:11px/1.45 monospace">${logs}</div></div>
        <button id="cr-save" type="button" class="cr-save">Save configuration</button><div id="cr-status" class="cr-muted" style="text-align:center;min-height:14px"></div>
      </div>`;
    modal.root.querySelector('#cr-save').onclick = () => {
      const nextSettings = { expandChoices: modal.root.querySelector('#cr-expand').checked, trackerInterval: Math.max(1, Math.min(10, Number(modal.root.querySelector('#cr-interval').value || 1))) };
      state.ledger.settings = nextSettings;
      saveLedger({ selectedConnection: modal.root.querySelector('#cr-connection').value, authorNote: modal.root.querySelector('#cr-note').value.trim(), settings: nextSettings });
      modal.root.querySelector('#cr-status').textContent = 'Saving…';
      renderWidget();
    };
  }

  function openDashboard() {
    requestState();
    if (modal) return;
    modal = ctx.ui.showModal({ title: '📺 CONTROL ROOM // BROADCAST DECK', width: 540, maxHeight: 760 });
    modal.onDismiss(() => { modal = null; });
    renderDashboard();
  }

  cleanups.push(ctx.onBackendMessage(payload => {
    if (!payload) return;
    if (payload.type === 'control_room:state_data' || payload.type === 'control_room:save_success') {
      if (payload.chatId) state.chatId = payload.chatId;
      if (payload.ledger) state.ledger = payload.ledger;
      if (payload.connections) state.connections = payload.connections;
      renderDashboard();
      renderWidget();
      if (payload.type === 'control_room:save_success') showToast('Control Room configuration saved.');
    }
    if (payload.type === 'control_room:choice_expanded' && payload.requestId === pendingChoiceRequest) {
      choiceLoading = false;
      pendingChoiceRequest = null;
      if (insertIntoComposer(payload.text)) { state.choices = []; widgetExpanded = false; }
      renderWidget();
    }
    if (payload.type === 'control_room:choice_error' && payload.requestId === pendingChoiceRequest) {
      choiceLoading = false;
      pendingChoiceRequest = null;
      showToast(`Choice writer failed: ${payload.error}`);
      renderWidget();
    }
  }));

  if (ctx.messages?.registerTagInterceptor) cleanups.push(ctx.messages.registerTagInterceptor({ tagName: 'cyoa_choices' }, payload => {
    if (payload.isStreaming) return;
    captureChoices(payload.content);
  }));

  if (ctx.events?.on) {
    cleanups.push(ctx.events.on('GENERATION_STARTED', () => { generating = true; state.choices = []; renderWidget(); }));
    cleanups.push(ctx.events.on('GENERATION_ENDED', payload => { generating = false; if (!captureChoices(payload?.content)) renderWidget(); }));
    cleanups.push(ctx.events.on('GENERATION_STOPPED', () => { generating = false; renderWidget(); }));
    cleanups.push(ctx.events.on('CHAT_SWITCHED', payload => { state.chatId = payload?.chatId || null; state.choices = []; generating = false; renderWidget(); requestState(); }));
  }

  if (ctx.ui?.registerInputBarAction) {
    const action = ctx.ui.registerInputBarAction({ id: 'control-room', label: 'Open Control Room', iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="15" rx="2"/><path d="m17 2-5 5-5-5"/></svg>' });
    cleanups.push(action.onClick(openDashboard), () => action.destroy());
  }

  const resizeHandler = () => scheduleWidgetPosition();
  window.addEventListener('resize', resizeHandler);
  window.visualViewport?.addEventListener('resize', resizeHandler);
  cleanups.push(() => window.removeEventListener('resize', resizeHandler), () => window.visualViewport?.removeEventListener('resize', resizeHandler));
  const observer = new MutationObserver(() => scheduleWidgetPosition());
  observer.observe(document.body, { childList: true, subtree: true });
  cleanups.push(() => observer.disconnect());

  ensureWidget();
  requestState();
  return () => {
    cleanups.reverse().forEach(cleanup => { try { cleanup?.(); } catch { /* best effort */ } });
    if (positionFrame) cancelAnimationFrame(positionFrame);
    widget?.destroy?.();
    modal?.dismiss?.();
    document.getElementById('cr-floating-toast')?.remove();
  };
}

