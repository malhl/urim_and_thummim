(function() {
/**
 * English text → IPA → Deseret converter.
 *
 * Pipeline:
 * 1. Dictionary lookup (local)
 * 2. Free Dictionary API lookup (for unknown full words, no key needed)
 * 3. Rules-based grapheme-to-phoneme fallback (for partial words / unknowns)
 */

var PRONUNCIATIONS = window.PRONUNCIATIONS;
var ipaToDeseret = window.ipaToDeseret;

// Cache for API lookups (word → IPA string, or null if not found)
var apiCache = {};

/**
 * Grapheme-to-phoneme rules for live partial-word conversion.
 * Ordered longest-first so multi-character combos match before singles.
 */
const GRAPHEME_RULES = [
  // Silent combos & special digraphs/trigraphs (order matters!)
  ['igh', 'aɪ'],
  ['ough', 'oʊ'],
  ['tion', 'ʃən'],
  ['sion', 'ʒən'],
  ['ture', 'tʃɜːr'],
  ['sure', 'ʃɜːr'],
  ['tch', 'tʃ'],
  ['dge', 'dʒ'],
  ['wh', 'w'],
  ['wr', 'r'],
  ['kn', 'n'],
  ['gn', 'n'],
  ['mb', 'm'],
  ['mn', 'm'],
  ['ph', 'f'],
  ['gh', ''],
  ['th', 'θ'],
  ['sh', 'ʃ'],
  ['ch', 'tʃ'],
  ['ck', 'k'],
  ['ng', 'ŋ'],
  ['nk', 'ŋk'],
  ['qu', 'kw'],

  // Vowel digraphs
  ['ee', 'iː'],
  ['ea', 'iː'],
  ['oo', 'uː'],
  ['ou', 'aʊ'],
  ['ow', 'aʊ'],
  ['oi', 'ɔɪ'],
  ['oy', 'ɔɪ'],
  ['ai', 'eɪ'],
  ['ay', 'eɪ'],
  ['ei', 'eɪ'],
  ['ey', 'eɪ'],
  ['au', 'ɔː'],
  ['aw', 'ɔː'],
  ['ie', 'iː'],
  ['ue', 'uː'],
  ['oa', 'oʊ'],

  // Consonant digraphs
  ['ss', 's'],
  ['ll', 'l'],
  ['ff', 'f'],
  ['zz', 'z'],
  ['tt', 't'],
  ['dd', 'd'],
  ['pp', 'p'],
  ['bb', 'b'],
  ['gg', 'ɡ'],
  ['mm', 'm'],
  ['nn', 'n'],
  ['rr', 'r'],
  ['cc', 'k'],

  // Single consonants
  ['b', 'b'],
  ['c', 'k'],
  ['d', 'd'],
  ['f', 'f'],
  ['g', 'ɡ'],
  ['h', 'h'],
  ['j', 'dʒ'],
  ['k', 'k'],
  ['l', 'l'],
  ['m', 'm'],
  ['n', 'n'],
  ['p', 'p'],
  ['q', 'k'],
  ['r', 'r'],
  ['s', 's'],
  ['t', 't'],
  ['v', 'v'],
  ['w', 'w'],
  ['x', 'ks'],
  ['y', 'j'],
  ['z', 'z'],

  // Single vowels (short by default)
  ['a', 'æ'],
  ['e', 'ɛ'],
  ['i', 'ɪ'],
  ['o', 'ɒ'],
  ['u', 'ʌ'],
];

/**
 * Convert a single word to IPA using grapheme rules.
 * This is the fallback for words not in the dictionary.
 */
function graphemeToIPA(word) {
  const lower = word.toLowerCase();
  let ipa = '';
  let i = 0;

  while (i < lower.length) {
    const remaining = lower.slice(i);
    let matched = false;

    for (const [grapheme, phoneme] of GRAPHEME_RULES) {
      if (remaining.startsWith(grapheme)) {
        ipa += phoneme;
        i += grapheme.length;
        matched = true;
        break;
      }
    }

    if (!matched) {
      ipa += remaining[0];
      i++;
    }
  }

  return ipa;
}

/**
 * Look up a word using the Free Dictionary API (no key required).
 * Returns IPA string or null.
 */
async function lookupWord(word) {
  const lower = word.toLowerCase();

  if (apiCache[lower] !== undefined) {
    return apiCache[lower];
  }

  try {
    const resp = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(lower)}`
    );

    if (!resp.ok) {
      apiCache[lower] = null;
      return null;
    }

    const data = await resp.json();

    if (!Array.isArray(data) || !data.length) {
      apiCache[lower] = null;
      return null;
    }

    // Walk through entries and phonetics looking for an IPA string
    for (const entry of data) {
      if (entry.phonetic) {
        const ipa = cleanIPA(entry.phonetic);
        if (ipa) { apiCache[lower] = ipa; return ipa; }
      }
      if (entry.phonetics) {
        for (const p of entry.phonetics) {
          if (p.text) {
            const ipa = cleanIPA(p.text);
            if (ipa) { apiCache[lower] = ipa; return ipa; }
          }
        }
      }
    }

    apiCache[lower] = null;
    return null;
  } catch (err) {
    console.warn('Dictionary API error:', err);
    apiCache[lower] = null;
    return null;
  }
}

/**
 * Strip slashes and surrounding whitespace from an IPA string.
 */
function cleanIPA(raw) {
  if (!raw) return null;
  const cleaned = raw.replace(/^[\/\[]\s*/, '').replace(/\s*[\/\]]$/, '').trim();
  return cleaned || null;
}

/**
 * Detect capitalization style of an English word.
 * Returns 'all' for ALL CAPS, 'first' for Title Case, or null for lowercase.
 */
function detectCase(word) {
  if (word === word.toUpperCase() && word.length > 1) return 'all';
  if (word[0] === word[0].toUpperCase() && word[0] !== word[0].toLowerCase()) return 'first';
  return null;
}

/**
 * Full synchronous pipeline: English → IPA → Deseret (per-word with capitalization).
 * Used for live typing feedback.
 */
function textToDeseret(text) {
  var tokens = text.match(/[a-zA-Z]+|[^a-zA-Z]+/g) || [];
  var ipaResult = '';
  var deseretResult = '';

  for (var t = 0; t < tokens.length; t++) {
    var token = tokens[t];
    if (/^[a-zA-Z]+$/.test(token)) {
      var lower = token.toLowerCase();
      var ipa = PRONUNCIATIONS[lower] || apiCache[lower] || graphemeToIPA(lower);
      var cap = detectCase(token);
      ipaResult += ipa;
      deseretResult += ipaToDeseret(ipa, cap);
    } else {
      ipaResult += token;
      deseretResult += token;
    }
  }

  return { ipa: ipaResult, deseret: deseretResult };
}

/**
 * Trigger async API lookups for unknown words in the text.
 * Call this on debounced input; results get cached for the next sync call.
 */
async function prefetchUnknowns(text) {
  const words = text.match(/[a-zA-Z]+/g) || [];
  const toFetch = words
    .map(w => w.toLowerCase())
    .filter(w => !PRONUNCIATIONS[w] && apiCache[w] === undefined);

  const unique = [...new Set(toFetch)];

  // Fetch in parallel, max 5 at a time to be polite to the free API
  for (let i = 0; i < unique.length; i += 5) {
    const batch = unique.slice(i, i + 5);
    await Promise.all(batch.map(w => lookupWord(w)));
  }
}

window.textToDeseret = textToDeseret;
window.prefetchUnknowns = prefetchUnknowns;
window.graphemeToIPA = graphemeToIPA;
window.apiCache = apiCache;
})();
