// dist/frontend.js

function populateComposer(text) {
  // Hook into the native Lumiverse composer textarea
  const textarea = document.querySelector('[data-component="InputArea"] textarea');
  if (!textarea) return;

  // React state synchronizer
  const nativeSetter = Object.getOwnPropertyDescriptor(
    window.HTMLTextAreaElement.prototype,
    'value'
  )?.set;

  if (nativeSetter) {
    nativeSetter.call(textarea, text);
  } else {
    textarea.value = text;
  }

  textarea.dispatchEvent(new Event('input', { bubbles: true }));
  textarea.dispatchEvent(new Event('change', { bubbles: true }));
  textarea.focus();
}

// Watch chat messages for CYOA choice rows
const observer = new MutationObserver(() => {
  const choiceRows = document.querySelectorAll('.obs-cyoa-row:not([data-bound="true"]), .lumi-cyoa-row:not([data-bound="true"])');

  choiceRows.forEach((row) => {
    row.setAttribute('data-bound', 'true');
    row.style.cursor = 'pointer';

    row.addEventListener('click', (e) => {
      e.preventDefault();
      const textSpan = row.querySelector('.obs-cyoa-text, .lumi-cyoa-text');
      if (textSpan) {
        populateComposer(textSpan.textContent.trim());
      }
    });
  });
});

observer.observe(document.body, { childList: true, subtree: true });
