// Control Room: I Love TV! — Master Frontend

export function setup(ctx) {
  let currentLedger = {
    affinity: 0,
    dynamic: 'Neutral Ground',
    continuity: { seasonArc: '', episodeTarget: '' },
    selectedConnection: '',
    lastActions: []
  };
  let connectionsList = [];
  let activeModal = null;

  // ─── 1. BULLETPROOF COMPOSER INJECTION ─────────────────────────────────────
  function insertIntoComposer(text) {
    const ta = document.querySelector('textarea[name="chat-message"]') 
            || document.querySelector('[data-component="InputArea"] textarea')
            || document.querySelector('textarea');
            
    if (!ta) {
      showToast('⚠️ Could not locate chat input box');
      return;
    }

    ta.focus();
    ta.select();

    // Use execCommand first to simulate genuine user typing into React inputs
    const success = document.execCommand('insertText', false, text);

    if (!success || ta.value !== text) {
      const nativeSetter = Object.getOwnPropertyDescriptor(
        window.HTMLTextAreaElement.prototype,
        'value'
      )?.set;

      if (nativeSetter) {
        nativeSetter.call(ta, text);
      } else {
        ta.value = text;
      }

      ta.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
      ta.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    }

    ta.selectionStart = ta.selectionEnd = ta.value.length;
    showToast('✦ Choice copied to composer!');
  }

  function showToast(msg) {
    let toast = document.getElementById('cr-floating-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'cr-floating-toast';
      toast.style.cssText = `
        position: fixed;
        bottom: 84px;
        left: 50%;
        transform: translateX(-50%);
        background: var(--lumiverse-fill-strong, #16161e);
        border: 1px solid var(--lumiverse-primary, #8c82ff);
        color: var(--lumiverse-text, #fff);
        padding: 6px 16px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 700;
        z-index: 99999;
        box-shadow: 0 4px 16px rgba(0,0,0,0.6);
        pointer-events: none;
        transition: opacity 0.2s ease;
      `;
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.style.opacity = '1';
    setTimeout(() => { if (toast) toast.style.opacity = '0'; }, 2200);
  }

  // ─── 2. CAPTURE-PHASE CYOA CLICK DELEGATION ───────────────────────────────
  // true = capture phase, fires BEFORE Lumiverse message stopPropagation()
  document.addEventListener('click', (e) => {
    const row = e.target.closest('.obs-cyoa-row, .lumi-cyoa-row, [class*="cyoa-row"]');
    if (!row) return;

    e.preventDefault();
    e.stopPropagation();

    const textSpan = row.querySelector('.obs-cyoa-text, .lumi-cyoa-text, span:last-child');
    if (textSpan) {
      insertIntoComposer(textSpan.textContent.trim());
    }
  }, true);

  // Direct element binding backup
  function bindCyoaRows() {
    const rows = document.querySelectorAll('.obs-cyoa-row, .lumi-cyoa-row');
    rows.forEach(row => {
      if (row.dataset.crBound) return;
      row.dataset.crBound = 'true';
      row.style.cursor = 'pointer';
      row.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const textSpan = row.querySelector('.obs-cyoa-text, .lumi-cyoa-text, span:last-child');
        if (textSpan) {
          insertIntoComposer(textSpan.textContent.trim());
        }
      }, true);
    });
  }

  // ─── 3. MODAL DASHBOARD ────────────────────────────────────────────────────
  function openLedgerDashboard() {
    ctx.sendToBackend({ type: 'control_room:get_state' });

    activeModal = ctx.ui.showModal({
      title: '📺 CONTROL ROOM // BROADCAST DECK',
      width: 460
    });

    renderModalContent();
    activeModal.onDismiss(() => { activeModal = null; });
  }

  function renderModalContent() {
    if (!activeModal) return;
    const root = activeModal.root;
    root.innerHTML = '';

    const container = document.createElement('div');
    container.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 12px;
      font-family: inherit;
      color: var(--lumiverse-text, #e2e8f0);
      font-size: 13px;
    `;

    let connOptions = '<option value="">Default Active Connection</option>';
    connectionsList.forEach(c => {
      const sel = c.id === currentLedger.selectedConnection ? 'selected' : '';
      connOptions += `<option value="${c.id}" ${sel}>${c.name}</option>`;
    });

    const actionsList = (currentLedger.lastActions || []).slice(-8).reverse().map(
      a => `<div style="padding: 2px 0; border-bottom: 1px dashed rgba(255,255,255,0.06);">${esc(a)}</div>`
    ).join('') || '<div style="color: var(--lumiverse-text-dim, #888);">No actions logged yet.</div>';

    container.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 4px;">
        <label style="font-weight: 700; font-size: 11px; text-transform: uppercase; color: var(--lumiverse-primary, #8c82ff);">Director Background Profile</label>
        <select id="cr-conn-select" style="background: var(--lumiverse-fill-subtle, rgba(255,255,255,0.05)); border: 1px solid var(--lumiverse-border, #444); border-radius: 4px; padding: 6px 8px; color: inherit; outline: none;">
          ${connOptions}
        </select>
        <span style="font-size: 10px; color: var(--lumiverse-text-dim, #888);">Runs background evaluation calls to judge user actions before each turn.</span>
      </div>

      <div style="display: flex; flex-direction: column; gap: 4px;">
        <div style="display: flex; justify-content: space-between; font-weight: 700;">
          <span style="color: var(--lumiverse-primary, #8c82ff);">CO-STAR AFFINITY</span>
          <span id="cr-affinity-val" style="font-family: monospace;">${currentLedger.affinity}%</span>
        </div>
        <input type="range" id="cr-affinity-slider" min="-100" max="100" value="${currentLedger.affinity}" 
          style="accent-color: var(--lumiverse-primary, #8c82ff); cursor: pointer; width: 100%;">
      </div>

      <div style="display: flex; flex-direction: column; gap: 4px;">
        <label style="font-weight: 700; font-size: 11px; text-transform: uppercase; color: var(--lumiverse-text-dim, #888);">Dynamic Subtext</label>
        <input type="text" id="cr-dynamic-input" value="${esc(currentLedger.dynamic)}" 
          style="background: var(--lumiverse-fill-subtle, rgba(255,255,255,0.05)); border: 1px solid var(--lumiverse-border, #444); border-radius: 4px; padding: 6px 8px; color: inherit; outline: none;">
      </div>

      <div style="display: flex; flex-direction: column; gap: 4px;">
        <label style="font-weight: 700; font-size: 11px; text-transform: uppercase; color: var(--lumiverse-text-dim, #888);">Episode Target (Immediate Scene Goal)</label>
        <input type="text" id="cr-target-input" value="${esc(currentLedger.continuity?.episodeTarget)}" 
          style="background: var(--lumiverse-fill-subtle, rgba(255,255,255,0.05)); border: 1px solid var(--lumiverse-border, #444); border-radius: 4px; padding: 6px 8px; color: inherit; outline: none;">
      </div>

      <div style="display: flex; flex-direction: column; gap: 4px;">
        <label style="font-weight: 700; font-size: 11px; text-transform: uppercase; color: var(--lumiverse-text-dim, #888);">Season Arc</label>
        <textarea id="cr-arc-input" rows="2" style="background: var(--lumiverse-fill-subtle, rgba(255,255,255,0.05)); border: 1px solid var(--lumiverse-border, #444); border-radius: 4px; padding: 6px 8px; color: inherit; outline: none; resize: vertical;">${esc(currentLedger.continuity?.seasonArc)}</textarea>
      </div>

      <div style="display: flex; flex-direction: column; gap: 4px; margin-top: 4px;">
        <label style="font-weight: 700; font-size: 11px; text-transform: uppercase; color: var(--lumiverse-primary, #8c82ff);">Live Director & Telemetry Feed</label>
        <div style="background: rgba(0,0,0,0.4); border: 1px solid var(--lumiverse-border, rgba(255,255,255,0.1)); border-radius: 4px; padding: 8px 10px; font-family: monospace; font-size: 11px; line-height: 1.4; max-height: 110px; overflow-y: auto;">
          ${actionsList}
        </div>
      </div>

      <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 6px;">
        <button id="cr-save-btn" style="
          padding: 6px 14px;
          border-radius: 6px;
          border: 1px solid var(--lumiverse-primary, #8c82ff);
          background: color-mix(in srgb, var(--lumiverse-primary, #8c82ff) 20%, transparent);
          color: var(--lumiverse-primary-text, #8c82ff);
          cursor: pointer;
          font-weight: 700;
        ">Save to Ledger</button>
      </div>
      <div id="cr-status" style="font-size: 11px; text-align: center; color: var(--lumiverse-primary, #8c82ff); min-height: 14px;"></div>
    `;

    const slider = container.querySelector('#cr-affinity-slider');
    const valLabel = container.querySelector('#cr-affinity-val');
    slider.oninput = (e) => { valLabel.textContent = `${e.target.value}%`; };

    container.querySelector('#cr-save-btn').onclick = () => {
      const updated = {
        affinity: parseInt(slider.value, 10),
        dynamic: container.querySelector('#cr-dynamic-input').value.trim(),
        selectedConnection: container.querySelector('#cr-conn-select').value,
        continuity: {
          seasonArc: container.querySelector('#cr-arc-input').value.trim(),
          episodeTarget: container.querySelector('#cr-target-input').value.trim()
        }
      };

      currentLedger = { ...currentLedger, ...updated };
      ctx.sendToBackend({ type: 'control_room:save_ledger', ledger: updated });
      const status = container.querySelector('#cr-status');
      status.textContent = '✦ State & Connection Synced!';
      setTimeout(() => { if (status) status.textContent = ''; }, 2000);
    };

    root.appendChild(container);
  }

  // ─── 4. MOUNT TOP-RIGHT FLOATING BADGE ───────────────────────────────────────
  function mountToolbar() {
    if (document.getElementById('cr-toolbar-btn')) return;

    const inputArea = document.querySelector('[data-component="InputArea"]');
    if (!inputArea) return;

    inputArea.style.position = 'relative';

    const btn = document.createElement('button');
    btn.id = 'cr-toolbar-btn';
    btn.type = 'button';
    btn.title = 'Control Room: I Love TV!';
    btn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="pointer-events: none;">
        <rect width="20" height="15" x="2" y="7" rx="2" ry="2"></rect>
        <polyline points="17 2 12 7 7 2"></polyline>
      </svg>
      <span style="font-family: monospace; font-size: 11px; font-weight: 700;">ON AIR</span>
    `;

    btn.style.cssText = `
      position: absolute;
      top: -32px;
      right: 14px;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: var(--lumiverse-fill-strong, #16161e);
      border: 1px solid var(--lumiverse-border, rgba(255,255,255,0.15));
      border-radius: var(--lcs-radius-xs, 6px);
      padding: 4px 8px;
      color: var(--lumiverse-primary, #8c82ff);
      cursor: pointer;
      z-index: 50;
      box-shadow: 0 4px 12px rgba(0,0,0,0.4);
      transition: all 0.15s ease;
    `;

    btn.onmouseenter = () => {
      btn.style.borderColor = 'var(--lumiverse-primary, #8c82ff)';
      btn.style.boxShadow = '0 0 10px color-mix(in srgb, var(--lumiverse-primary, #8c82ff) 40%, transparent)';
    };
    btn.onmouseleave = () => {
      btn.style.borderColor = 'var(--lumiverse-border, rgba(255,255,255,0.15))';
      btn.style.boxShadow = '0 4px 12px rgba(0,0,0,0.4)';
    };

    btn.onclick = (e) => { e.preventDefault(); openLedgerDashboard(); };
    inputArea.appendChild(btn);
  }

  // ─── 5. BACKEND IPC SYNC ──────────────────────────────────────────────────
  const unsub = ctx.onBackendMessage((payload) => {
    if (payload.type === 'control_room:state_data' || payload.type === 'control_room:save_success') {
      if (payload.ledger) currentLedger = payload.ledger;
      if (payload.connections) connectionsList = payload.connections;
      if (activeModal) renderModalContent();
    }
  });

  const obs = new MutationObserver(() => {
    mountToolbar();
    bindCyoaRows();
  });
  obs.observe(document.body, { childList: true, subtree: true });

  mountToolbar();
  bindCyoaRows();

  return () => {
    obs.disconnect();
    unsub();
    document.getElementById('cr-toolbar-btn')?.remove();
    activeModal?.dismiss();
  };
}

function esc(s = '') {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
