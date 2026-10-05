// URLs y emails se dejan intactos; el resto se procesa palabra por palabra
// (los apóstrofes quedan dentro de la palabra: "Levi's", "L'Oréal").
const TOKEN_PATTERN = /(\S+:\/\/\S+|\S+@\S+|www\.\S+)|([\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*)/gu;
const WORD_PATTERN = /[\p{L}\p{N}]+/gu;
const HAS_LOWERCASE_PATTERN = /\p{Ll}/u;
const HAS_LETTER_PATTERN = /\p{L}/u;
const HAS_DIGIT_PATTERN = /\p{N}/u;
// iPhone, McDonald, PlayStation, WiFi: jorobas capitalizadas, distinto de un "hOLA" por error.
const CAMEL_CASE_PATTERN = /^\p{L}\p{Ll}*(?:\p{Lu}\p{Ll}+)+$/u;
// En oraciones una palabra ya Capitalizada puede ser un nombre propio (Argentina): no se baja.
const CAPITALIZED_WORD_PATTERN = /^\p{Lu}\p{Ll}+$/u;
const SENTENCE_END_PATTERN = /[.!?]$/;
const LEADING_PUNCTUATION_PATTERN = /[\s¿¡"'(]+$/;
const LINE_START_PATTERN = /\n[\s¿¡"'(]*$/;
const MAX_PRESERVED_ACRONYM_LENGTH = 3;
// Letras sueltas que también son palabras ("a", "y", "o"): no se tratan como talle.
const AMBIGUOUS_SINGLE_LETTERS = new Set(['A', 'E', 'O', 'U', 'Y']);

const KNOWN_ACRONYMS = new Set(['HDMI', 'XXXL', 'XXXXL', 'UHD', 'OLED', 'AMOLED', 'PVC', 'NFC']);

// Conectores que en un título van en minúscula ("Remera de Algodón").
const TITLE_CONNECTORS = new Set([
  'de', 'del', 'la', 'las', 'el', 'los', 'y', 'e', 'o', 'u', 'a', 'en', 'con', 'sin', 'para', 'por', 'al',
]);

const capitalize = (word: string): string => word.charAt(0).toUpperCase() + word.slice(1);

const hasMixedCaseInsideWord = (word: string): boolean => CAMEL_CASE_PATTERN.test(word) && word !== word.toLowerCase();

const isLoneSizeLetter = (word: string, textBefore: string): boolean =>
  word.length === 1 &&
  word === word.toUpperCase() &&
  HAS_LETTER_PATTERN.test(word) &&
  !AMBIGUOUS_SINGLE_LETTERS.has(word) &&
  textBefore.trim() !== '';

// Siglas y talles (USB, XL, UV400, USB-C, "Talle M") se respetan; cualquier otra mezcla
// caprichosa ("hOLA", "REMERA") se pasa a minúscula. Si todo el texto está en
// mayúsculas (Bloq Mayús) no hay siglas que cuidar: se corrige completo.
const isAllCaps = (word: string): boolean => word === word.toUpperCase() && HAS_LETTER_PATTERN.test(word);

const isShortAcronym = (word: string, text: string, textBefore: string): boolean => {
  if (!isAllCaps(word)) return false;
  const textHasLowercase = HAS_LOWERCASE_PATTERN.test(text);
  const isOnlyWord = text.match(WORD_PATTERN)?.length === 1;
  if (!textHasLowercase && !isOnlyWord) return false;
  if (KNOWN_ACRONYMS.has(word)) return true;
  if (word.length >= 2 && (word.length <= MAX_PRESERVED_ACRONYM_LENGTH || HAS_DIGIT_PATTERN.test(word))) return true;
  return isLoneSizeLetter(word, textBefore) || (word.length === 1 && /[-/]$/.test(textBefore));
};

const shouldKeepWord = (word: string, text: string, textBefore: string): boolean =>
  isShortAcronym(word, text, textBefore) || hasMixedCaseInsideWord(word);

const startsSentence = (textBefore: string): boolean => {
  if (LINE_START_PATTERN.test(textBefore)) return true;
  const stripped = textBefore.replace(LEADING_PUNCTUATION_PATTERN, '');
  return stripped === '' || SENTENCE_END_PATTERN.test(stripped);
};

// Solo cambia mayúsculas/minúsculas (nunca el largo), así el cursor no salta mientras se escribe.
export const toTitleCase = (text: string): string =>
  text.replace(TOKEN_PATTERN, (match, protectedToken: string | undefined, word: string, offset: number) => {
    if (protectedToken) return match;
    const textBefore = text.slice(0, offset);
    if (shouldKeepWord(word, text, textBefore)) return word;
    const lower = word.toLowerCase();
    const isFirstWord = textBefore.trim() === '';
    return !isFirstWord && TITLE_CONNECTORS.has(lower) ? lower : capitalize(lower);
  });

export const toSentenceCase = (text: string): string =>
  text.replace(TOKEN_PATTERN, (match, protectedToken: string | undefined, word: string, offset: number) => {
    if (protectedToken) return match;
    const textBefore = text.slice(0, offset);
    const keep = shouldKeepWord(word, text, textBefore) || CAPITALIZED_WORD_PATTERN.test(word);
    const fixed = keep ? word : word.toLowerCase();
    return startsSentence(textBefore) ? capitalize(fixed) : fixed;
  });
