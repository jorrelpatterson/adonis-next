// Pure helpers for the ambassador business-card generator (/admin/cards).

// First 4 hex chars of the ambassador UUID, uppercased — decorative card ID.
export function shortId(uuid) {
  return String(uuid || '').replace(/-/g, '').slice(0, 4).toUpperCase();
}

// QR payload. Short URL keeps the QR module count low so it scans at ~0.6in.
export function refUrl(code) {
  return `https://advncelabs.com/?ref=${encodeURIComponent(String(code || '').trim().toUpperCase())}`;
}

// Code text sizing. JetBrains Mono glyphs are ~0.6em wide; with letter-spacing
// at 19% of font size, each char occupies ~0.79em. Codes must fit ~2.1in
// (151pt) beside the QR. Cap at 11pt for short codes.
const MAX_PT = 11;
const MAX_WIDTH_PT = 151;
export function codeStyle(code) {
  const len = Math.max(1, String(code || '').length);
  const fontSizePt = Math.min(MAX_PT, MAX_WIDTH_PT / (0.79 * len));
  return {
    fontSize: `${fontSizePt.toFixed(2)}pt`,
    letterSpacing: `${(fontSizePt * 0.19).toFixed(2)}pt`,
  };
}
