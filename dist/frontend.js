// Control Room: I Love TV! — frontend controls

export function setup(ctx) {
  let state = {
    chatId: null,
    ledger: {
      affinity: 0,
      dynamic: 'Neutral Ground',
      continuity: { seasonArc: '', episodeTarget: '', bPlots: [], coreMemories: [], futureBranches: [] },
      selectedConnection: '',
      authorNote: '',
      lastActions: []
    },
    connections: [],
    choices: []
  };
  let modal = null;
  let choicePanel = null;
  const cleanups = [];

  const escapeHtml = (value = '') => String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  function showToast(message) {
    if (ctx.ui?.toast?.info) {
      ctx.ui.toast.info(message);
      return;
    }
    let toast = document.getElementById('cr-floating-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'cr-floating-toast';
      toast.style.cssText = 'position:fixed;bottom:84px;left:50%;transform:translateX(-50%);background:var(--lumiverse-fill-strong,#16161e);border:1px solid var(--lumiverse-primary,#8c82ff);color:var(--lumiverse-text,#fff);padding:7px 16px;border-radius:20px;font-size:12px;font-weight:700;z-index:99999;box-shadow:0 4px 16px rgba(0,0,0,.6);pointer-events:none;transition:opacity .2s';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.style.opacity = '1';
    setTimeout(() => { toast.style.opacity = '0'; }, 2200);
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
    showToast('Choice copied to the composer.');
    return true;
  }

  function requestState() {
    ctx.sendToBackend({ type: 'control_room:get_state', chatId: state.chatId || undefined });
  }

  function saveLedger(patch) {
    ctx.sendToBackend({
      type: 'control_room:save_ledger',
      chatId: state.chatId || undefined,
      ledger: patch
    });
  }

  function parseChoices(content) {
    const choices = [];
    for (const line of String(content || '').split(/\r?\n/)) {
      const match = line.match(/^\s*\[(\d+)\]\s*(.+?)\s*$/);
      if (match) choices.push({ number: Number(match[1]), text: match[2].replace(/^\[|\]$/g, '').trim() });
    }
    return choices.slice(0, 8);
  }

  function renderChoicePanel() {
    if (!choicePanel) return;
    const root = choicePanel.root;
    root.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.style.cssText = 'display:flex;flex-direction:column;gap:8px;padding:10px;color:var(--lumiverse-text,#eee)';
    const heading = document.createElement('div');
    heading.textContent = '🎬 DIRECTOR’S CUT — PICK YOUR NEXT MOVE';
    heading.style.cssText = 'font-size:12px;font-weight:800;color:var(--lumiverse-primary,#8c82ff);letter-spacing:.03em';
    wrap.appendChild(heading);

    if (!state.choices.length) {
      const empty = document.createElement('div');
      empty.textContent = 'Choices will appear here after a response containing <cyoa_choices>.';
      empty.style.cssText = 'font-size:12px;color:var(--lumiverse-text-dim,#999)';
      wrap.appendChild(empty);
    } else {
      state.choices.forEach(choice => {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = `[${choice.number}] ${choice.text}`;
        button.style.cssText = 'text-align:left;padding:9px 10px;border-radius:7px;border:1px solid var(--lumiverse-border,#444);background:var(--lumiverse-fill-subtle,rgba(255,255,255,.05));color:inherit;cursor:pointer';
        button.onclick = () => insertIntoComposer(String(choice.number));
        wrap.appendChild(button);
      });
    }
    root.appendChild(wrap);
  }

  function ensureChoicePanel() {
    if (choicePanel || !ctx.ui?.requestDockPanel) return;
    try {
      choicePanel = ctx.ui.requestDockPanel({
        edge: 'right',
        title: 'Director’s Choice',
        size: 320,
        minSize: 240,
        maxSize: 480,
        resizable: true,
        startCollapsed: true
      });
      renderChoicePanel();
    } catch {
      // ui_panels may be ungranted. The dashboard still exposes the choices.
    }
  }

  function renderDashboard() {
    if (!modal) return;
    const ledger = state.ledger;
    const continuity = ledger.continuity || {};
    const connectionOptions = [
      '<option value="">Active/default connection</option>',
      ...state.connections.map(connection => `<option value="${escapeHtml(connection.id)}" ${connection.id === ledger.selectedConnection ? 'selected' : ''}>${escapeHtml(connection.name)}</option>`)
    ].join('');
    const logs = (ledger.lastActions || []).slice(-10).reverse().map(item => `<div class="cr-log">${escapeHtml(item)}</div>`).join('') || '<div class="cr-muted">No passes logged yet.</div>';
    const memories = (continuity.coreMemories || []).map(item => `<li>${escapeHtml(item)}</li>`).join('') || '<li>None captured yet.</li>';
    const choices = state.choices.map(choice => `<button type="button" class="cr-choice" data-choice="${choice.number}">[${choice.number}] ${escapeHtml(choice.text)}</button>`).join('') || '<div class="cr-muted">No CYOA choices captured yet.</div>';

    modal.root.innerHTML = `
      <style>
        .cr-grid{display:flex;flex-direction:column;gap:12px;color:var(--lumiverse-text,#e2e8f0);font-size:13px}.cr-row{display:flex;flex-direction:column;gap:5px}.cr-label{font-size:11px;font-weight:800;text-transform:uppercase;color:var(--lumiverse-primary,#8c82ff)}.cr-input{box-sizing:border-box;width:100%;padding:7px 9px;border:1px solid var(--lumiverse-border,#444);border-radius:6px;background:var(--lumiverse-fill-subtle,rgba(255,255,255,.05));color:inherit;outline:none}.cr-muted{font-size:11px;color:var(--lumiverse-text-dim,#888)}.cr-log{padding:3px 0;border-bottom:1px dashed rgba(255,255,255,.08)}.cr-choice{width:100%;margin:3px 0;padding:7px 9px;text-align:left;border:1px solid var(--lumiverse-border,#444);border-radius:6px;background:var(--lumiverse-fill-subtle,rgba(255,255,255,.05));color:inherit;cursor:pointer}.cr-save{align-self:flex-end;padding:7px 15px;border:1px solid var(--lumiverse-primary,#8c82ff);border-radius:6px;background:color-mix(in srgb,var(--lumiverse-primary,#8c82ff) 20%,transparent);color:var(--lumiverse-primary,#8c82ff);font-weight:800;cursor:pointer}
      </style>
      <div class="cr-grid">
        <div class="cr-row"><label class="cr-label">Background connection</label><select id="cr-connection" class="cr-input">${connectionOptions}</select></div>
        <div class="cr-row"><label class="cr-label">Co-star affinity: <span id="cr-affinity-label">${Number(ledger.affinity) || 0}%</span></label><input id="cr-affinity" type="range" min="-100" max="100" value="${Number(ledger.affinity) || 0}"></div>
        <div class="cr-row"><label class="cr-label">Dynamic subtext</label><input id="cr-dynamic" class="cr-input" value="${escapeHtml(ledger.dynamic)}"></div>
        <div class="cr-row"><label class="cr-label">Episode target</label><input id="cr-target" class="cr-input" value="${escapeHtml(continuity.episodeTarget)}"></div>
        <div class="cr-row"><label class="cr-label">Season arc</label><textarea id="cr-arc" class="cr-input" rows="2">${escapeHtml(continuity.seasonArc)}</textarea></div>
        <div class="cr-row"><label class="cr-label">Author’s note for the next generation</label><textarea id="cr-note" class="cr-input" rows="3" placeholder="Direction, reminder, tone request…">${escapeHtml(ledger.authorNote)}</textarea><div class="cr-muted">Stored only for this chat and injected by the next director pass.</div></div>
        <div class="cr-row"><label class="cr-label">Core memories</label><ul style="margin:0;padding-left:20px">${memories}</ul></div>
        <div class="cr-row"><label class="cr-label">Latest choices</label><div>${choices}</div></div>
        <div class="cr-row"><label class="cr-label">Director telemetry</label><div style="max-height:130px;overflow:auto;padding:8px 10px;border:1px solid var(--lumiverse-border,#444);border-radius:6px;background:rgba(0,0,0,.25);font:11px/1.45 monospace">${logs}</div></div>
        <button id="cr-save" type="button" class="cr-save">Save chat ledger</button>
        <div id="cr-status" class="cr-muted" style="text-align:center;min-height:14px"></div>
      </div>`;

    const affinity = modal.root.querySelector('#cr-affinity');
    affinity.oninput = () => { modal.root.querySelector('#cr-affinity-label').textContent = `${affinity.value}%`; };
    modal.root.querySelectorAll('.cr-choice').forEach(button => {
      button.onclick = () => insertIntoComposer(button.dataset.choice);
    });
    modal.root.querySelector('#cr-save').onclick = () => {
      saveLedger({
        affinity: Number(affinity.value),
        dynamic: modal.root.querySelector('#cr-dynamic').value.trim(),
        selectedConnection: modal.root.querySelector('#cr-connection').value,
        authorNote: modal.root.querySelector('#cr-note').value.trim(),
        continuity: {
          ...continuity,
          seasonArc: modal.root.querySelector('#cr-arc').value.trim(),
          episodeTarget: modal.root.querySelector('#cr-target').value.trim()
        }
      });
      modal.root.querySelector('#cr-status').textContent = 'Saving…';
    };
  }

  function openDashboard() {
    requestState();
    if (modal) return;
    modal = ctx.ui.showModal({ title: '📺 CONTROL ROOM // BROADCAST DECK', width: 520, maxHeight: 720 });
    modal.onDismiss(() => { modal = null; });
    renderDashboard();
  }

  const backendUnsub = ctx.onBackendMessage(payload => {
    if (!payload) return;
    if (payload.type === 'control_room:state_data' || payload.type === 'control_room:save_success') {
      if (payload.chatId) state.chatId = payload.chatId;
      if (payload.ledger) state.ledger = payload.ledger;
      if (payload.connections) state.connections = payload.connections;
      renderDashboard();
      if (payload.type === 'control_room:save_success') showToast('Chat ledger saved.');
    }
  });
  cleanups.push(backendUnsub);

  if (ctx.messages?.registerTagInterceptor) {
    const tagUnsub = ctx.messages.registerTagInterceptor(
      { tagName: 'cyoa_choices' },
      payload => {
        if (payload.isStreaming) return;
        const parsed = parseChoices(payload.content);
        if (!parsed.length) return;
        state.choices = parsed;
        ensureChoicePanel();
        renderChoicePanel();
        renderDashboard();
        choicePanel?.expand?.();
      }
    );
    cleanups.push(tagUnsub);
  }

  if (ctx.events?.on) {
    cleanups.push(ctx.events.on('CHAT_SWITCHED', payload => {
      state.chatId = payload?.chatId || null;
      state.choices = [];
      renderChoicePanel();
      requestState();
    }));
  }

  if (ctx.ui?.registerInputBarAction) {
    const dashboardAction = ctx.ui.registerInputBarAction({
      id: 'control-room',
      label: 'Open Control Room',
      iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="15" rx="2"/><path d="m17 2-5 5-5-5"/></svg>'
    });
    const offDashboard = dashboardAction.onClick(openDashboard);
    cleanups.push(offDashboard, () => dashboardAction.destroy());

    const noteAction = ctx.ui.registerInputBarAction({
      id: 'author-note',
      label: 'Edit Author’s Note',
      iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"/></svg>'
    });
    const offNote = noteAction.onClick(openDashboard);
    cleanups.push(offNote, () => noteAction.destroy());
  }

  ensureChoicePanel();
  requestState();

  return () => {
    cleanups.reverse().forEach(cleanup => {
      try { cleanup?.(); } catch { /* host cleanup is best-effort */ }
    });
    choicePanel?.destroy?.();
    modal?.dismiss?.();
    document.getElementById('cr-floating-toast')?.remove();
  };
}

