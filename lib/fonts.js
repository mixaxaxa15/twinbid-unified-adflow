const path = require('node:path');

const CYRILLIC = 'U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116';
const LATIN = 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD';

const DEFINITIONS = [
  ['Inter', 'inter', true, [400, 700]],
  ['Roboto', 'roboto', true, [400, 700]],
  ['Montserrat', 'montserrat', true, [400, 700]],
  ['Open Sans', 'open-sans', true, [400, 700]],
  ['Oswald', 'oswald', true, [400, 700]],
  ['Playfair Display', 'playfair-display', true, [400, 700]],
  ['Bebas Neue', 'bebas-neue', false, [400]],
  ['Russo One', 'russo-one', true, [400]],
  ['Ubuntu', 'ubuntu', true, [400, 700]],
  ['PT Sans', 'pt-sans', true, [400, 700]],
];

const BUILTIN_FONTS = Object.freeze(DEFINITIONS.map(([name, slug, cyrillic, weights]) => ({
  name, slug, fallback: /Playfair/.test(name) ? 'Georgia, serif' : 'Arial, sans-serif',
  faces: weights.flatMap((weight) => [
    ...(cyrillic ? [{ file:`${slug}-cyrillic-${weight}-normal.woff2`, weight, range:CYRILLIC }] : []),
    { file:`${slug}-latin-${weight}-normal.woff2`, weight, range:LATIN },
  ]),
})));

const SYSTEM_FONTS = Object.freeze([
  { name:'Arial', fallback:'Arial, sans-serif' },
  { name:'Georgia', fallback:'Georgia, serif' },
  { name:'Impact', fallback:'Impact, sans-serif' },
  { name:'Trebuchet MS', fallback:'"Trebuchet MS", sans-serif' },
]);
const FONT_NAMES = Object.freeze([...BUILTIN_FONTS, ...SYSTEM_FONTS].map((font) => font.name));

function cleanName(value) {
  return String(value || '').replace(/[<>"'{};]/g, '').replace(/\s+/g, ' ').trim().slice(0, 60);
}

function sanitizeCustomFonts(value) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  return value.map((font) => {
    const name = cleanName(font?.name);
    const source = String(font?.source || '');
    const match = source.match(/^\/fonts\/custom\/([a-f0-9-]+\.(?:woff2|woff|ttf|otf))$/i);
    if (!name || !match || FONT_NAMES.includes(name) || seen.has(name.toLowerCase())) return null;
    seen.add(name.toLowerCase());
    return { name, source, format:path.extname(match[1]).slice(1).toLowerCase() };
  }).filter(Boolean).slice(0, 8);
}

function sanitizeFontName(value, customFonts = [], fallback = 'Inter') {
  const raw = cleanName(String(value || '').split(',')[0]);
  const aliases = { "'Trebuchet MS'":'Trebuchet MS', 'sans-serif':'Inter', serif:'Georgia' };
  const candidate = aliases[raw] || raw;
  const allowed = [...FONT_NAMES, ...sanitizeCustomFonts(customFonts).map((font) => font.name)];
  return allowed.find((name) => name.toLowerCase() === candidate.toLowerCase()) || fallback;
}

function fontStack(name, customFonts = []) {
  const clean = sanitizeFontName(name, customFonts);
  const definition = [...BUILTIN_FONTS, ...SYSTEM_FONTS].find((font) => font.name === clean);
  const fallback = definition?.fallback || 'Arial, sans-serif';
  return `'${clean}', ${fallback}`;
}

function fontFaceCss(customFonts = [], mode = 'preview') {
  const prefix = mode === 'export' ? 'assets/fonts/' : '/fonts/';
  const rules = [];
  for (const font of BUILTIN_FONTS) for (const face of font.faces) rules.push(`@font-face{font-family:"${font.name}";font-style:normal;font-display:swap;font-weight:${face.weight};src:url("${prefix}${face.file}") format("woff2");unicode-range:${face.range}}`);
  for (const font of sanitizeCustomFonts(customFonts)) {
    const file = path.basename(font.source);
    const target = mode === 'export' ? `${prefix}custom-${file}` : font.source;
    const format = font.format === 'ttf' ? 'truetype' : font.format === 'otf' ? 'opentype' : font.format;
    rules.push(`@font-face{font-family:"${font.name}";font-style:normal;font-display:swap;font-weight:100 900;src:url("${target}") format("${format}")}`);
  }
  return `${rules.join('\n')}\n`;
}

function fontAssets(customFonts = []) {
  const assets = BUILTIN_FONTS.flatMap((font) => font.faces.map((face) => ({ source:face.file, target:face.file, custom:false })));
  for (const font of sanitizeCustomFonts(customFonts)) {
    const file = path.basename(font.source);
    assets.push({ source:`custom/${file}`, target:`custom-${file}`, custom:true });
  }
  return assets;
}

module.exports = { BUILTIN_FONTS, SYSTEM_FONTS, FONT_NAMES, sanitizeCustomFonts, sanitizeFontName, fontStack, fontFaceCss, fontAssets };
