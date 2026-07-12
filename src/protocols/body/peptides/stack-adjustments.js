// Adaptive peptide-stack suggestions based on the user's last-7-day check-in
// averages. Ported from public/app.html:637-652 (v1's getStackAdj).
//
// Rules:
//   - Need 5+ days of check-ins (handled upstream — averages will be null)
//   - avg sleep < 2.5 → suggest DSIP if not already in stack (sleep recovery)
//   - avg energy < 2.5 → suggest CJC/Ipa Blend (GH support for low energy)
//   - avg focus < 2.5 → suggest Selank (mental clarity)
//   - mood + energy + sleep all > 4 → suggest cycling off DSIP / Selank
//
// Catalog name conventions: v1 used canonical names ("DSIP", "Selank") but v2
// catalog has sized variants ("DSIP 5mg", "Selank 10mg", "CJC/Ipa Blend").
// We match by name prefix and pick the lowest-priced not-already-in-stack variant.

function pickCheapest(matches, excludeNames) {
  const available = matches.filter(p => !excludeNames.has(p.name));
  if (available.length === 0) return null;
  return available.slice().sort((a, b) => (a.price || 0) - (b.price || 0))[0];
}

function namePrefixMatch(peptides, prefix) {
  return peptides.filter(p => typeof p.name === 'string' && p.name.startsWith(prefix));
}

function nameContainsAny(peptides, fragments) {
  return peptides.filter(p => {
    if (typeof p.name !== 'string') return false;
    return fragments.some(f => p.name.includes(f));
  });
}

/**
 * Compute add/reduce suggestions for the user's peptide stack based on
 * 7-day check-in averages.
 *
 * @param {Object|null} averages   - output of getCheckinAverages(), or null when insufficient data
 * @param {string[]}    stackNames - peptide names currently in the user's active stack
 * @param {Array}       peptides   - peptide catalog (PEPTIDES)
 * @returns {Array<{ type: 'add'|'reduce', peptide: object, reason: string }>}
 */
export function getStackAdjustments(averages, stackNames = [], peptides = []) {
  if (!averages) return [];

  const exclude = new Set(stackNames);
  const out = [];

  // Low sleep → DSIP variant
  if (averages.sleep != null && averages.sleep < 2.5) {
    const inStackHasDsip = stackNames.some(n => n.startsWith('DSIP'));
    if (!inStackHasDsip) {
      const pick = pickCheapest(namePrefixMatch(peptides, 'DSIP'), exclude);
      if (pick) out.push({ type: 'add', peptide: pick, reason: 'Sleep consistently below baseline' });
    }
  }

  // Low energy → CJC/Ipa Blend (or any CJC + Ipa containing variant)
  if (averages.energy != null && averages.energy < 2.5) {
    const inStackHasCjcIpa = stackNames.some(n => n.includes('CJC') && (n.includes('Ipa') || n.includes('Blend')));
    if (!inStackHasCjcIpa) {
      const pick = pickCheapest(nameContainsAny(peptides, ['CJC/Ipa', 'CJC-1295/Ipa']), exclude);
      if (pick) out.push({ type: 'add', peptide: pick, reason: 'Low energy — GH support recommended' });
    }
  }

  // Low focus → Selank variant
  if (averages.focus != null && averages.focus < 2.5) {
    const inStackHasSelank = stackNames.some(n => n.startsWith('Selank'));
    if (!inStackHasSelank) {
      const pick = pickCheapest(namePrefixMatch(peptides, 'Selank'), exclude);
      if (pick) out.push({ type: 'add', peptide: pick, reason: 'Mental clarity low' });
    }
  }

  // Strong metrics across the board → suggest cycling off recovery peptides
  const strongAcrossBoard =
    averages.mood != null && averages.mood > 4 &&
    averages.energy != null && averages.energy > 4 &&
    averages.sleep != null && averages.sleep > 4;

  if (strongAcrossBoard) {
    for (const name of stackNames) {
      if (name.startsWith('DSIP') || name.startsWith('Selank')) {
        const inStack = peptides.find(p => p.name === name);
        if (inStack) {
          out.push({ type: 'reduce', peptide: inStack, reason: 'Metrics strong — consider cycling off' });
        }
      }
    }
  }

  return out;
}
