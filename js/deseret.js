(function() {
/**
 * IPA to Deseret Alphabet mapping and conversion.
 *
 * Deseret Unicode block: U+10400–U+1044F
 * Uppercase: U+10400–U+10427
 * Lowercase: U+10428–U+1044F
 */

var DESERET = {
  // IPA → Deseret lowercase codepoint
  // Long vowels
  'iː':  0x10428, // 𐐨 Long I
  'eɪ':  0x10429, // 𐐩 Long E
  'ɑː':  0x1042A, // 𐐪 Long A
  'ɔː':  0x1042B, // 𐐫 Long Ah
  'oʊ':  0x1042C, // 𐐬 Long O
  'uː':  0x1042D, // 𐐭 Long Oo

  // Short vowels
  'ɪ':   0x1042E, // 𐐮 Short I
  'ɛ':   0x1042F, // 𐐯 Short E
  'æ':   0x10430, // 𐐰 Short A
  'ɒ':   0x10431, // 𐐱 Short Ah
  'ʌ':   0x10432, // 𐐲 Short O
  'ʊ':   0x10433, // 𐐳 Short Oo

  // Diphthongs
  'aɪ':  0x10434, // 𐐴 Ay
  'aʊ':  0x10435, // 𐐵 Ow
  'ɔɪ':  0x1044E, // 𐑎 Oi
  'juː': 0x1044F, // 𐑏 Ew

  // Consonants
  'w':   0x10436, // 𐐶 Wu
  'j':   0x10437, // 𐐷 Yee
  'h':   0x10438, // 𐐸 H
  'p':   0x10439, // 𐐹 Pee
  'b':   0x1043A, // 𐐺 Bee
  't':   0x1043B, // 𐐻 Tee
  'd':   0x1043C, // 𐐼 Dee
  'tʃ':  0x1043D, // 𐐽 Chee
  'dʒ':  0x1043E, // 𐐾 Jee
  'k':   0x1043F, // 𐐿 Kay
  'ɡ':   0x10440, // 𐑀 Gay
  'f':   0x10441, // 𐑁 Ef
  'v':   0x10442, // 𐑂 Vee
  'θ':   0x10443, // 𐑃 Eth
  'ð':   0x10444, // 𐑄 Thee
  's':   0x10445, // 𐑅 Es
  'z':   0x10446, // 𐑆 Zee
  'ʃ':   0x10447, // 𐑇 Esh
  'ʒ':   0x10448, // 𐑈 Zhee
  'r':   0x10449, // 𐑉 Er
  'l':   0x1044A, // 𐑊 El
  'm':   0x1044B, // 𐑋 Em
  'n':   0x1044C, // 𐑌 En
  'ŋ':   0x1044D, // 𐑍 Eng
};

// Also map some common IPA variants
const IPA_ALIASES = {
  'i':   'iː',
  'e':   'ɛ',    // short e
  'a':   'ɑː',
  'o':   'oʊ',
  'u':   'uː',
  'ə':   'ʌ',    // schwa → short O (common Deseret convention)
  'ɜː':  'ʌ',   // as in "bird" — mapped to Er + short O typically
  'ɝ':   'ʌ',
  'ɚ':   'ʌ',
  'ɑ':   'ɑː',
  'ɔ':   'ɔː',
  'g':   'ɡ',    // ASCII g → IPA ɡ
  'ɹ':   'r',    // IPA ɹ (alveolar approximant) → Deseret Er
};

// Ordered by longest match first to avoid partial matches
const IPA_KEYS_SORTED = Object.keys(DESERET).sort((a, b) => b.length - a.length);
const ALIAS_KEYS_SORTED = Object.keys(IPA_ALIASES).sort((a, b) => b.length - a.length);

/**
 * Convert a Deseret lowercase codepoint to uppercase.
 * Lowercase: U+10428–U+1044F, Uppercase: U+10400–U+10427 (offset 0x28)
 */
function deseretToUpper(cp) {
  if (cp >= 0x10428 && cp <= 0x1044F) return cp - 0x28;
  return cp;
}

/**
 * Convert an IPA string to Deseret alphabet string.
 * If capitalize === 'first', uppercase the first Deseret letter.
 * If capitalize === 'all', uppercase every Deseret letter.
 * Non-phonemic characters (spaces, punctuation) pass through.
 */
function ipaToDeseret(ipa, capitalize) {
  let result = '';
  let i = 0;
  var firstDone = false;

  while (i < ipa.length) {
    const remaining = ipa.slice(i);

    // Skip whitespace and punctuation
    if (/^[\s.,!?;:'"()\-–—\d]/.test(remaining)) {
      result += remaining[0];
      i++;
      continue;
    }

    // Try direct Deseret match (longest first)
    let matched = false;
    for (const key of IPA_KEYS_SORTED) {
      if (remaining.startsWith(key)) {
        var cp = DESERET[key];
        if (capitalize === 'all' || (capitalize === 'first' && !firstDone)) {
          cp = deseretToUpper(cp);
        }
        firstDone = true;
        result += String.fromCodePoint(cp);
        i += key.length;
        matched = true;
        break;
      }
    }
    if (matched) continue;

    // Try alias match
    for (const key of ALIAS_KEYS_SORTED) {
      if (remaining.startsWith(key)) {
        const target = IPA_ALIASES[key];
        if (DESERET[target]) {
          var cp2 = DESERET[target];
          if (capitalize === 'all' || (capitalize === 'first' && !firstDone)) {
            cp2 = deseretToUpper(cp2);
          }
          firstDone = true;
          result += String.fromCodePoint(cp2);
        }
        i += key.length;
        matched = true;
        break;
      }
    }
    if (matched) continue;

    // Stress marks and length marks — skip
    if (/^[ˈˌːˑ̃]/.test(remaining)) {
      i++;
      continue;
    }

    // Unknown character — pass through
    result += remaining[0];
    i++;
  }

  return result;
}

window.ipaToDeseret = ipaToDeseret;
window.DESERET = DESERET;
window.IPA_ALIASES = IPA_ALIASES;
})();
