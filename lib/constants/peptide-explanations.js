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

  // Tablets/oral products from Eve 2026-04-21 sheet
  'Clenbuterol': 'Strong fat-loss + cardio stimulant (asthma drug repurposed). Rapid HR, jittery, very effective for short cutting cycles.',
  'Clomiphene (Clomid)': 'PCT staple — restarts natural testosterone after a cycle. Also used for low-T men to boost natural production.',
  'Letrozole': 'Strong aromatase inhibitor. Blocks estrogen conversion, controls gyno/water on heavy cycles.',
  'Fluoxymesterone (Halotestin)': 'Aggressive strength + dry-look steroid. Used by powerlifters/fighters for short pre-event blasts. Hard on liver.',
  'Dianabol (Methandrostenolone)': 'Classic mass-builder steroid. Fast strength + size gains with water retention. Hard on liver.',
  'Mesterolone (Proviron)': 'Mild DHT derivative. Boosts libido, hardens physique, supports cutting cycles.',
  'Methenolone Acetate (Primobolan)': '"Aesthetic" steroid. Mild lean gains, dry/hard look, gentler side effects than most. Often counterfeited.',
  'Superdrol (Methyldrostanolone)': 'Brutal dry strength gains. Very harsh on liver/lipids — short cycles only.',
  'T3 (Liothyronine sodium)': 'Active thyroid hormone. Boosts metabolism for fat loss; needs careful taper to avoid rebound.',
  'T4 (Levothyroxine)': 'Standard thyroid replacement. Energy + metabolism support, converts to T3 in body.',
  'Anavar (Oxandrolone)': 'Mild lean strength + fat loss. Popular with women due to low side effects. The "cutting steroid."',
  'Anadrol (Oxymetholone)': 'Heavy mass + strength. Fast bulker, water retention, liver toll.',
  'Winstrol (Stanozolol)': 'Dry hard look + strength. Popular cutting steroid; joint dryness common.',
  'Turinabol (Chlordehydromethyltestosterone)': 'East German lean-mass steroid. Mild gains, dry, low water retention.',
  'Tamoxifen (Nolvadex)': 'PCT classic — estrogen receptor blocker. Restores natural test post-cycle, used for gyno reversal.',
  'Aromasin (Exemestane)': 'Aromatase inhibitor for cycle support. Reduces estrogen, used during heavy cycles.',
  'Anastrozole (Arimidex)': 'Standard AI for TRT or cycle support. Mild estrogen control.',
  'Sildenafil (Viagra)': 'ED treatment. Blood-flow erection support, ~4-hour window.',
  'Tadalafil (Cialis)': 'Long-acting ED treatment (24-36hr). Often daily low-dose for blood flow + prostate.',
  'Cock Bombs': 'Pre-mixed sex enhancement combo. Erection support + libido stack.',
  'DHB (1-Testosterone cypionate)': 'Strong dry strength steroid. Lean gains, no water retention, harsh on system.',
  'Salbutamol': 'Mild asthma drug with fat-burning side effect. Less harsh than clenbuterol.',
  'Methylstenbolone': 'Strong oral mass-builder. Significant strength + size, heavy on liver.',
  'Tesofensine': 'Appetite suppressant + fat loss. Originally an Alzheimer\'s research drug, repurposed for weight loss.',
  'LGD-4033 (Ligandrol)': 'Lean muscle SARM. Steady strength gains with mild side effects vs steroids.',
  'MK-677 (Ibutamoren)': 'Oral GH releaser. Better sleep, recovery, increased hunger. 24/7 use, not cycled.',
  'SR9009': '"Stamina mimetic." Improves cardiovascular endurance and fat oxidation.',
  'RAD140 (Testolone)': 'Strongest SARM for muscle/strength. Closest SARM to actual steroid effect.',
  'Ostarine (MK-2866)': 'Mildest SARM. Body recomp, joint healing, low side effects. Beginner-friendly.',
  'AICAR (oral)': 'Oral endurance + fat-loss compound. "Exercise mimetic" — boosts cardio without training.',
  'Andarine S4': 'Cutting SARM. Vision side-effects (yellow tint) at high doses; otherwise solid lean strength.',
  'GW-501516 (Cardarine)': 'Massive endurance boost + fat loss. PPAR-delta activator. Has cancer rumors from old rat studies.',
  'YK11': 'Myostatin inhibitor SARM. Theoretical breakthrough for muscle past natural limits; harsh on hormones.',
  'Cabergoline': 'Lowers prolactin. Boosts libido, fights nipple sensitivity from heavy cycles.',
  'Finasteride': 'Hair loss + prostate treatment. Blocks DHT conversion. Sexual side effects in some users.',
  'Flibanserin (Addyi)': 'Female libido drug. Treats low desire in women specifically.',
  'M1T (17a-Methyl-1-testosterone)': 'Brutal strength + size. Very harsh on liver, short cycles only.',
  'Prednisone': 'Corticosteroid. Powerful anti-inflammatory for autoimmune/allergic conditions.',
  'DNP': 'Extreme fat loss. DANGEROUS — raises body temperature, can be fatal at high doses. Very high risk.',
  'BPC-157 (oral tablet)': 'Oral form of BPC-157 — better for gut-specific issues. Lower bioavailability than injection.',
  'BPC-157 (oral capsule)': 'Capsule form of BPC-157 for gut healing. Convenient but lower bioavailability than injection.',
  'Semaglutide (oral)': 'Pill form of Ozempic/Wegovy (Rybelsus). Strong fat loss + appetite control without injection.',
  'Tirzepatide (oral)': 'Pill form of Mounjaro/Zepbound. Strong fat loss + GLP-1/GIP dual action without injection.',
  '5-Amino-1MQ (oral)': 'Oral form of muscle-preserving fat-loss compound. Stacks with GLP-1s.',
  'Androxal (Enclomiphene)': 'Selective Clomid isomer. Restarts test without the anti-estrogen mood effects.',
  'Telmisartan': 'Blood pressure med with metabolic benefits. PPAR-gamma activation, often paired with cycles.',
  'Dutasteride': 'Stronger Finasteride. Better for hair loss but more side effects.',
  'Ivermectin': 'Antiparasitic with broader off-label uses. Generally well-tolerated.',
  'SLU-PP-332': 'First-gen exercise mimetic. Boosts mitochondrial energy + fat oxidation. Different molecule from SLU-PP-322.',
  'SLU-PP-332 (capsule)': 'Capsule form of SLU-PP-332 exercise mimetic. Same effects as tablets.',
  'Minoxidil': 'Hair growth treatment. Topical standard; oral form for severe hair loss.',
  'KPV (oral)': 'Oral form of KPV peptide. Calms gut + skin inflammation.',
  'BPC + TB-500 Blend (oral)': 'Oral version of the recovery blend. Lower bioavailability vs injection but convenient.',
  'BAM15 (capsule)': 'Mitochondrial uncoupler for fat loss. Safer DNP alternative — raises metabolism without dangerous heat.',
  'SLU-PP-332 + BAM15 Combo': 'Stack of exercise mimetic + uncoupler. Fat loss + endurance combo.',
  'Orforglipron': 'Oral GLP-1 (Eli Lilly\'s upcoming oral). Pill alternative to injectable semaglutide/tirzepatide.',
  'Isotretinoin (Accutane)': 'Severe acne treatment. Powerful, requires monitoring; can produce permanent acne reduction.',
  'Dapoxetine (Priligy)': 'Premature ejaculation treatment. Short-acting SSRI taken ~1 hour before sex.',
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

// Higher-level product type (for top-level filtering on order sheets).
// Groups the fine-grained `cat` field into 6 buckets:
//   Peptide  — research peptides (incl. GLP-1 weight-loss compounds; everything in vials + oral peptides)
//   Steroid  — anabolic steroids + cycle-adjacent (Stimulant, PCT, Thyroid all consumed in steroid context)
//   SARM     — Selective Androgen Receptor Modulators (LGD, RAD, Ostarine, etc.)
//   Pharma   — Rx drugs unrelated to cycles (Sildenafil, Finasteride, Minoxidil, Ivermectin, etc.)
//   Supply   — Bac water, acetic acid
//   Cosmetic — Botox / Botulinum
export const PRODUCT_TYPES = ['Peptide', 'Steroid', 'SARM', 'Pharma', 'Supply', 'Cosmetic'];

export function typeFor(cat) {
  if (!cat) return 'Peptide';
  const c = String(cat).trim();
  if (c === 'Anabolic' || c === 'Stimulant' || c === 'PCT' || c === 'Thyroid') return 'Steroid';
  if (c === 'SARM') return 'SARM';
  if (c === 'Pharma') return 'Pharma';
  if (c === 'Supplies') return 'Supply';
  if (c === 'Cosmetic') return 'Cosmetic';
  // Everything else (Recovery, GH, Longevity, Immune, Hormonal, Cognitive, Skin, Sleep, Metabolic, Weight Loss) → Peptide
  return 'Peptide';
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
