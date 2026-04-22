'use client';
// Layman-friendly "what you notice" explanations per compound name.
// Used as tooltips on the order sheet pages (admin/purchases/multi + admin/purchases new PO catalog).
// Keyed by canonical compound name (case-sensitive, must match products.name).

export const PEPTIDE_EXPLANATIONS = {
  '5-Amino-1MQ': 'Easier fat loss while keeping muscle. Stacks with semaglutide/tirzepatide.',
  'Acetic Acid Water': 'Solvent for reconstituting certain peptides (alternative to bacteriostatic water).',
  'Adipotide': 'Targets fat cell blood vessels. Drastic experimental fat loss.',
  'AICAR': '"Exercise mimetic" — boosts endurance and fat oxidation, even without training.',
  'AOD-9604': 'Targeted belly-fat loss. No effect on energy or muscle — slow, steady.',
  'ARA-290': 'Quiets nerve pain, tingling, numbness from old injuries or chronic inflammation.',
  'B12': 'Vitamin B12 injection. Energy boost, methyl donor support, mood.',
  'Bac Water': 'Bacteriostatic water for reconstituting peptides. Required supply.',
  'BBG Blend': 'BPC + GHK-Cu + TB-500 combo. Recovery + skin in one shot.',
  'Botox': 'Wrinkle smoothing + muscle relaxation. Same as cosmetic Botox.',
  'Botulinum toxin': 'Wrinkle smoothing + muscle relaxation. Same as cosmetic Botox.',
  'BPC+TB Blend': 'All-in-one recovery shot for joints, tendons, gut.',
  'BPC-157': 'Heals injuries fast, calms gut issues. Most reliable peptide overall.',
  'Cagrilintide': 'Appetite suppressor + slower digestion. Pairs with semaglutide for stronger fat loss with less muscle loss.',
  'CagriSema': 'Cagrilintide + Semaglutide combo. Stronger fat loss with appetite suppression and muscle preservation.',
  'Cerebrolysin': 'Sharper memory, clearer thinking, brain-fog relief.',
  'CJC/Ipamorelin': 'CJC + Ipamorelin combo for GH pulse therapy.',
  'CJC+IPA Blend': 'CJC + Ipamorelin combo. Convenient pairing for GH pulse therapy.',
  'CJC-1295 noDAC': 'Short pulse GH boost. Usually paired with Ipamorelin.',
  'CJC-1295 wDAC': 'Long-acting GH — one shot/week. Body recomp + recovery over 6-8 weeks.',
  'Dermorphin': 'Powerful analgesic. Strong pain relief for chronic conditions.',
  'Dihexa': 'Cognitive peptide for synaptogenesis. Memory and learning enhancement.',
  'DSIP': 'Falls asleep faster, deeper restorative sleep.',
  'Epitalon': 'Better sleep, slowed aging, more vitality. Longevity classic.',
  'FOXO4': 'Senolytic peptide. Clears senescent ("zombie") cells. Anti-aging research.',
  'GHK-Cu': 'Better skin, hair, wound healing. The "skin glow" peptide.',
  'GHRP-2': 'Cousin of GHRP-6 with less hunger. Stimulates GH release.',
  'GHRP-6': 'Hunger boost + GH release. Used for bulking cycles.',
  'GKP Blend': 'GHK + Glycyl + Pyroglutamic blend for skin and joint repair.',
  'Glow': 'Skin rejuvenation (GHK + BPC + TB, smaller doses than Glow Plus).',
  'Glow Plus': 'Stronger skin rejuvenation blend (BPC 10 + TB 10 + GHK 50).',
  'GLOW50 Blend': 'Skin rejuvenation (legacy name — same as Glow).',
  'Glutathione': 'Master antioxidant. Energy boost, lighter skin, toxin clearance.',
  'HCG': 'Preserves testicular function on TRT. Libido + mood lift.',
  'HGH': 'Real growth hormone. Body recomp, recovery, sleep, skin. The big one.',
  'HMG': 'Restarts natural testosterone production after cycles.',
  'IGF-1 LR3': 'Direct muscle-growth signal. Visible size gains in lifters.',
  'IGF-DES': 'Localized muscle growth — inject near target muscle.',
  'Ipamorelin': 'Gentle GH release. Minimal hunger, deep sleep.',
  'Kisspeptin-10': 'Restarts natural hormone signaling. Boosts test post-cycle or low-T.',
  'KLOW': 'Multi-peptide recovery blend. Similar profile to Glow.',
  'KPV': 'Calms gut and skin inflammation (eczema, psoriasis, IBS).',
  'Lemon Bottle': 'Fat-dissolving cocktail. Spot fat reduction injection.',
  'Lipo-B 216 (MIC)': 'Lipotropic + B12 fat-burner. Energy + fat metabolism shot.',
  'Lipo-C 120': 'Vitamin-C + amino blend. Antioxidant + fat support.',
  'LL-37': 'Antimicrobial peptide. Chronic Lyme, biofilm, persistent skin issues.',
  'Mazdutide': 'Newer GLP-1 with more muscle preservation than semaglutide.',
  'Melanotan I': 'Gradual safe tan without sun exposure.',
  'Melanotan II': 'Faster tan + libido boost. More potent than MT-I.',
  'Melatonin': 'Sleep regulation. Helps with jet lag, insomnia, circadian rhythm.',
  'MGF': 'Mechano Growth Factor. Localized muscle repair, often post-injury.',
  'MOTS-c': 'More energy, better cardio, easier fat loss. Mitochondrial peptide.',
  'NAD+': 'Cellular energy. Anti-fatigue, mental clarity, anti-aging support.',
  'Oxytocin': '"Bonding hormone" — mood lift, social ease, libido.',
  'Oxytocin Acetate': '"Bonding hormone" — mood lift, social ease, libido.',
  'PEG MGF': 'Long-acting MGF for sustained muscle repair.',
  'Pinealon': 'Better sleep + sharper thinking. Russian pineal peptide.',
  'PNC-27': 'Cancer-targeting research peptide. Highly experimental.',
  'PT-141': 'Strong libido boost (men + women). Brain-mediated, not blood flow.',
  'Retatrutide': 'Most powerful GLP-1 fat-loss compound. Beats semaglutide and tirzepatide.',
  'Selank': 'Anti-anxiety + cognitive boost. Calmer focus, less stress.',
  'Semaglutide': 'The famous Ozempic/Wegovy. Strong fat loss + appetite control.',
  'Semax': 'Sharper focus, neuroprotection. Russian nootropic peptide.',
  'Sermorelin': 'Gentle natural GH. Soft entry to GH protocols.',
  'SLU-PP-332': '"Workout-in-a-shot." Endurance + fat loss without exercise.',
  'Snap-8': 'Topical wrinkle reducer. The peptide version of Botox.',
  'SS-31': 'Mitochondrial repair. Energy boost for chronic fatigue, age-related decline.',
  'Survodutide': 'GLP-1 + glucagon dual agonist. Strong fat loss + liver health.',
  'TB-500': 'Deep tissue + muscle recovery. Pairs with BPC-157 for major injuries.',
  'Tesamorelin': 'Targeted visceral belly-fat loss. The most specific belly-fat compound.',
  'Thymalin': 'Russian immune booster. Pairs with Thymosin Alpha-1.',
  'Thymosin Alpha-1': 'Bulletproof immune system. Fewer colds, faster recovery from illness.',
  'Thymosin A1': 'Bulletproof immune system. Fewer colds, faster recovery from illness.',
  'Tirzepatide': 'Mounjaro/Zepbound — GLP-1 + GIP dual fat-loss compound.',
  'VIP': 'Calms gut + immune system. Good for chronic illness, mast-cell issues.',
};

export function explainFor(productName) {
  if (!productName) return null;
  // Try exact match, then case-insensitive
  if (PEPTIDE_EXPLANATIONS[productName]) return PEPTIDE_EXPLANATIONS[productName];
  const lower = productName.trim().toLowerCase();
  for (const [k, v] of Object.entries(PEPTIDE_EXPLANATIONS)) {
    if (k.toLowerCase() === lower) return v;
  }
  return null;
}

// React InfoIcon component that shows a custom tooltip on hover (no native title delay).
// Usage: <InfoIcon text={explainFor(name)} />
import { useState } from 'react';

export function InfoIcon({ text }) {
  const [show, setShow] = useState(false);
  if (!text) return null;
  return (
    <span style={{ position: 'relative', display: 'inline-block', marginLeft: 6, verticalAlign: 'middle' }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}>
      <span style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 14, height: 14, borderRadius: '50%',
        background: '#E8F4FB', color: '#0072B5',
        fontSize: 10, fontWeight: 700, cursor: 'help',
      }}>?</span>
      {show && (
        <span style={{
          position: 'absolute', left: 0, bottom: 'calc(100% + 6px)',
          background: '#0F1928', color: '#fff', padding: '8px 12px', borderRadius: 6,
          fontSize: 12, fontWeight: 400, lineHeight: 1.4, width: 240,
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)', zIndex: 100, pointerEvents: 'none',
          whiteSpace: 'normal', textAlign: 'left',
        }}>{text}</span>
      )}
    </span>
  );
}
