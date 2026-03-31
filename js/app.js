(function() {
/**
 * Main application — wires up UI to the converter pipeline.
 */

var textToDeseret = window.textToDeseret;
var prefetchUnknowns = window.prefetchUnknowns;

var inputEl = document.getElementById('input-text');
var deseretEl = document.getElementById('deseret-output');

// Track the current word being typed for the 4-char trigger
let currentWordLen = 0;
// Set of words already sent for lookup to avoid duplicate fetches
const fetchedWords = new Set();

function convert() {
  const text = inputEl.value;

  if (!text.trim()) {
    deseretEl.textContent = '';
    return;
  }

  const { deseret } = textToDeseret(text);
  deseretEl.textContent = deseret;
}

/**
 * Fetch any unknown words in the text that haven't been fetched yet.
 */
async function fetchNewUnknowns(text) {
  const words = text.match(/[a-zA-Z]+/g) || [];
  const PRONUNCIATIONS = window.PRONUNCIATIONS;
  const apiCache = window.apiCache;
  const toFetch = words
    .map(w => w.toLowerCase())
    .filter(w => !PRONUNCIATIONS[w] && apiCache[w] === undefined && !fetchedWords.has(w));

  const unique = [...new Set(toFetch)];
  if (!unique.length) return;

  unique.forEach(w => fetchedWords.add(w));
  await window.prefetchUnknowns(text);
  convert();
}

// Live conversion on every keystroke
inputEl.addEventListener('input', (e) => {
  convert();

  const text = inputEl.value;
  const lastChar = text.slice(-1);

  // On space (or punctuation): word just finished — fetch unknowns
  if (/[\s.,!?;:]/.test(lastChar)) {
    currentWordLen = 0;
    fetchNewUnknowns(text);
    return;
  }

  // Track letters in the current word
  if (/[a-zA-Z]/.test(lastChar)) {
    currentWordLen++;
  } else {
    currentWordLen = 0;
  }

  // After 4+ characters in the current word, fetch on every keystroke
  if (currentWordLen >= 4) {
    fetchNewUnknowns(text);
  }
});

// --- Resize handle: drag upward to grow the input area ---
const inputArea = document.getElementById('input-area');
const resizeHandle = document.getElementById('resize-handle');
let dragging = false;
let startY = 0;
let startHeight = 0;

resizeHandle.addEventListener('mousedown', (e) => {
  dragging = true;
  startY = e.clientY;
  startHeight = inputArea.offsetHeight;
  document.body.style.cursor = 'ns-resize';
  document.body.style.userSelect = 'none';
  e.preventDefault();
});

document.addEventListener('mousemove', (e) => {
  if (!dragging) return;
  // Dragging up = negative deltaY = larger input area
  const delta = startY - e.clientY;
  const newHeight = Math.max(80, Math.min(window.innerHeight * 0.7, startHeight + delta));
  inputArea.style.height = newHeight + 'px';
});

document.addEventListener('mouseup', () => {
  if (!dragging) return;
  dragging = false;
  document.body.style.cursor = '';
  document.body.style.userSelect = '';
});

// Touch support for mobile
resizeHandle.addEventListener('touchstart', (e) => {
  dragging = true;
  startY = e.touches[0].clientY;
  startHeight = inputArea.offsetHeight;
  e.preventDefault();
}, { passive: false });

document.addEventListener('touchmove', (e) => {
  if (!dragging) return;
  const delta = startY - e.touches[0].clientY;
  const newHeight = Math.max(80, Math.min(window.innerHeight * 0.7, startHeight + delta));
  inputArea.style.height = newHeight + 'px';
}, { passive: false });

document.addEventListener('touchend', () => {
  if (!dragging) return;
  dragging = false;
});

// Focus input on load
inputEl.focus();
})();
