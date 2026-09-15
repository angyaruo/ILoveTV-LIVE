// Control Room: I Love TV! — Master Frontend

export function setup(ctx) { //[cite: 2]
  let currentLedger = {
    affinity: 0,
    dynamic: '',
    continuity: { seasonArc: '', episodeTarget: '' }
  };
  let activeModal = null;

  // ─── 1. CYOA CLICK-TO-COMPOSER INJECTION ──────────────────────────────────
  function insertIntoComposer(text) {
    const ta = document.querySelector('[data-component="InputArea"] textarea'); //[cite: 7]
    if (!ta) return;

    const nativeSetter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype,
      'value'
    )?.set;

    if (nativeSetter) {
      nativeSetter.call(ta, text);
    } else {
      ta.value = text;
    }

    ta.dispatchEvent(new Event('input', { bubbles: true }));
    ta.dispatchEvent(new Event('change', { bubbles: true }));
    ta.focus();
  }

  function bindCyoaButtons() {
    const rows = document.querySelectorAll(
      '.obs-cyoa-row:not([data-cr-bound="true"]), .lumi-cyoa-row:not([data-cr-bound="true"])' //[cite: 1]
    );

    rows.forEach((row) => {
      row.setAttribute('data-cr-bound', 'true');
      row.style.cursor = 'pointer';

      row.addEventListener('click', (e) => {
        e.preventDefault();
        const textSpan = row.querySelector('.obs-cyoa-text, .lumi-cyoa-text'); //[cite: 1]
        if (textSpan) {
          insertIntoComposer(textSpan.textContent.trim());
        }
      });
    });
  }

  // ─── 2. EDITABLE LEDGER DASHBOARD MODAL ────────────────────────────────────
  function openLedgerDashboard() {
    // Request fresh state from backend[cite: 2]
    ctx.sendToBackend({ type: 'control_room:get_ledger' });

    activeModal = ctx.ui.showModal({ //[cite: 2]
      title: '📺 CONTROL ROOM // STATE LEDGER',
      width: 420
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

    container.innerHTML = `
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
        <label style="font-weight: 700; font-size: 11px; text-transform: uppercase; color: var(--lumiverse-text-dim, #888);">Season Arc (Long-Term Continuity)</label>
        <textarea id="cr-arc-input" rows="2" style="background: var(--lumiverse-fill-subtle, rgba(255,255,255,0.05)); border: 1px solid var(--lumiverse-border, #444); border-radius: 4px; padding: 6px 8px; color: inherit; outline: none; resize: vertical;">${esc(currentLedger.continuity.seasonArc)}</textarea>
      </div>

      <div style="display: flex; flex-direction: column; gap: 4px;">
        <label style="font-weight: 700; font-size: 11px; text-transform: uppercase; color: var(--lumiverse-text-dim, #888);">Episode Target (Immediate Scene Goal)</label>
        <textarea id="cr-target-input" rows="2" style="background: var(--lumiverse-fill-subtle, rgba(255,255,255,0.05)); border: 1px solid var(--lumiverse-border, #444); border-radius: 4px; padding: 6px 8px; color: inherit; outline: none; resize: vertical;">${esc(currentLedger.continuity.episodeTarget)}</textarea>
      </div>

      <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 8px;">
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

    // Live update slider value label
    const slider = container.querySelector('#cr-affinity-slider');
    const valLabel = container.querySelector('#cr-affinity-val');
    slider.oninput = (e) => {
      valLabel.textContent = `${e.target.value}%`;
    };

    // Save button event
    container.querySelector('#cr-save-btn').onclick = () => {
      const updated = {
        affinity: parseInt(slider.value, 10),
        dynamic: container.querySelector('#cr-dynamic-input').value.trim(),
        continuity: {
          seasonArc: container.querySelector('#cr-arc-input').value.trim(),
          episodeTarget: container.querySelector('#cr-target-input').value.trim()
        }
      };

      currentLedger = updated;
      ctx.sendToBackend({ type: 'control_room:save_ledger', ledger: updated }); //[cite: 2]
      const status = container.querySelector('#cr-status');
      status.textContent = '✦ Canonical State Synced to Disk!';
      setTimeout(() => { if (status) status.textContent = ''; }, 2000);
    };

    root.appendChild(container);
  }

  // ─── 3. MOUNT CONTROL ROOM TOOLBAR BUTTON ─────────────────────────────────
  function mountToolbar() {
    if (document.getElementById('cr-toolbar-btn')) return;

    const inputArea = document.querySelector('[data-component="InputArea"]'); //[cite: 7]
    if (!inputArea) return;

    const btn = document.createElement('button');
    btn.id = 'cr-toolbar-btn';
    btn.title = 'Open Control Room Ledger';
    btn.innerHTML = `📺`;
    btn.style.cssText = `
      position: absolute;
      top: -34px;
      right: 12px;
      background: var(--lumiverse-fill-subtle, rgba(20,20,25,0.8));
      border: 1px solid var(--lumiverse-border, rgba(255,255,255,0.15));
      border-radius: 6px;
      padding: 4px 8px;
      font-size: 14px;
      cursor: pointer;
      z-index: 10;
      transition: all 0.15s ease;
    `;

    btn.onmouseenter = () => {
      btn.style.borderColor = 'var(--lumiverse-primary, #8c82ff)';
      btn.style.boxShadow = '0 0 8px rgba(140,130,255,0.3)';
    };
    btn.onmouseleave = () => {
      btn.style.borderColor = 'var(--lumiverse-border, rgba(255,255,255,0.15))';
      btn.style.boxShadow = 'none';
    };

    btn.onclick = openLedgerDashboard;
    inputArea.style.position = 'relative';
    inputArea.appendChild(btn);
  }

  // ─── 4. BACKEND IPC SYNC ──────────────────────────────────────────────────
  const unsub = ctx.onBackendMessage((payload) => { //[cite: 2]
    if (payload.type === 'control_room:ledger_data' && payload.ledger) {
      currentLedger = payload.ledger;
      if (activeModal) renderModalContent();
    }
  });

  // DOM observer to keep CYOA clicks and toolbar button mounted
  const obs = new MutationObserver(() => {
    bindCyoaButtons();
    mountToolbar();
  });
  obs.observe(document.body, { childList: true, subtree: true });

  mountToolbar();
  bindCyoaButtons();

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
