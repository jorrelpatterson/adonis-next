// lib/news/fonts.js
// Loads Google Fonts as ArrayBuffer for Satori rendering. Pattern
// mirrors lib/invoiceImage.js. Cached at module scope across requests.

let fontPromise = null;

async function fetchFont(family, weight, italic = false) {
  const css = await fetch(
    `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:ital,wght@${italic ? 1 : 0},${weight}&display=swap`,
    { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } },
  ).then((r) => r.text());
  const m = css.match(/src:\s*url\((https:[^)]+)\)/);
  if (!m) throw new Error(`font URL missing for ${family} ${weight}`);
  return await fetch(m[1]).then((r) => r.arrayBuffer());
}

export async function loadNewsFonts() {
  if (fontPromise) return fontPromise;
  fontPromise = (async () => {
    const [bar400, bar900, mono400, mono500, serif400, serifItalic] = await Promise.all([
      fetchFont('Barlow Condensed', 400),
      fetchFont('Barlow Condensed', 900),
      fetchFont('JetBrains Mono', 400),
      fetchFont('JetBrains Mono', 500),
      fetchFont('Cormorant Garamond', 400),
      fetchFont('Cormorant Garamond', 400, true),
    ]);
    return [
      { name: 'Barlow Condensed', data: bar400, weight: 400, style: 'normal' },
      { name: 'Barlow Condensed', data: bar900, weight: 900, style: 'normal' },
      { name: 'JetBrains Mono',   data: mono400, weight: 400, style: 'normal' },
      { name: 'JetBrains Mono',   data: mono500, weight: 500, style: 'normal' },
      { name: 'Cormorant Garamond', data: serif400, weight: 400, style: 'normal' },
      { name: 'Cormorant Garamond', data: serifItalic, weight: 400, style: 'italic' },
    ];
  })();
  return fontPromise;
}
