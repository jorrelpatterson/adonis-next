// src/protocols/body/peptides/compatibility.js
// Peptide compatibility matrix and lookup function
// Extracted from app.html lines ~205-285

export const PEP_COMPAT = {
  "BPC-157+TB-500": { type: "synergy", note: "Stacks for accelerated tissue repair \u2014 BPC targets gut/tendons, TB-500 is systemic." },
  "BPC-157+GHK-Cu": { type: "synergy", note: "Both promote healing \u2014 BPC internal, GHK-Cu skin/collagen. Excellent combo." },
  "CJC-1295/Ipamorelin+MK-677": { type: "caution", note: "Both raise GH. Monitor for water retention, joint pain. May not need both." },
  "CJC-1295/Ipamorelin+Tesamorelin": { type: "caution", note: "Both are GHRH analogs \u2014 redundant mechanism. Pick one." },
  "Semaglutide+Tirzepatide": { type: "avoid", note: "Both GLP-1 agonists. Never combine \u2014 dangerous hypoglycemia risk." },
  "Semaglutide+AOD-9604": { type: "synergy", note: "Different fat loss pathways. GLP-1 for appetite + AOD for metabolism." },
  "Tirzepatide+AOD-9604": { type: "synergy", note: "Complementary mechanisms \u2014 GIP/GLP-1 plus GH fragment." },
  "Selank+DSIP": { type: "synergy", note: "Selank reduces daytime anxiety, DSIP improves sleep. Covers the full cycle." },
  "Selank+Dihexa": { type: "caution", note: "Both are nootropics. Start one at a time to identify individual effects." },
  "Epithalon+SS-31": { type: "synergy", note: "Both target aging \u2014 Epithalon via telomeres, SS-31 via mitochondria. Different mechanisms." },
  "BPC-157+Semaglutide": { type: "synergy", note: "BPC protects GI lining from GLP-1 side effects (nausea). Smart pairing." },
  "MK-677+DSIP": { type: "synergy", note: "Both taken at night. MK-677 GH release + DSIP deep sleep = recovery powerhouse." },
  "Kisspeptin-10+CJC-1295/Ipamorelin": { type: "synergy", note: "Kisspeptin boosts LH/testosterone while CJC/Ipa handles GH. Separate axes." },
  "Thymosin Alpha-1+BPC-157": { type: "synergy", note: "Immune + repair. Great for post-illness recovery." },
  "Retatrutide+Semaglutide": { type: "avoid", note: "Both are GLP-1 agonists. Retatrutide already includes GLP-1 action \u2014 stacking causes severe nausea, vomiting, pancreatitis risk." },
  "Retatrutide+Tirzepatide": { type: "avoid", note: "Overlapping GLP-1/GIP pathways. Retatrutide is a superset of tirzepatide \u2014 do not combine." },
  "Retatrutide+Survodutide": { type: "avoid", note: "Both hit GLP-1 and Glucagon receptors. Complete overlap \u2014 dangerous to stack." },
  "Retatrutide+Mazdutide": { type: "avoid", note: "Both hit GLP-1 and Glucagon receptors. Never combine GLP-1 agonists." },
  "Retatrutide+Cagri+Sema": { type: "avoid", note: "Cagri+Sema contains semaglutide (GLP-1). Retatrutide already covers GLP-1. Do not stack." },
  "Semaglutide+Survodutide": { type: "avoid", note: "Both GLP-1 agonists. Survodutide adds glucagon but GLP-1 overlap is dangerous." },
  "Semaglutide+Mazdutide": { type: "avoid", note: "Both GLP-1 agonists. Never combine." },
  "Tirzepatide+Survodutide": { type: "avoid", note: "Both hit GLP-1 receptors. Do not combine." },
  "Tirzepatide+Mazdutide": { type: "avoid", note: "Both hit GLP-1 receptors. Do not combine." },
  "Tirzepatide+Retatrutide": { type: "avoid", note: "Overlapping GLP-1/GIP. Reta is a superset of Tirz." },
  "Survodutide+Mazdutide": { type: "avoid", note: "Both dual GLP-1/Glucagon agonists. Identical mechanism \u2014 never combine." },
  "Cagrilintide+Retatrutide": { type: "caution", note: "Different mechanisms (amylin vs GLP-1/GIP/glucagon) but extreme appetite suppression. Monitor caloric intake \u2014 risk of undereating and muscle wasting." },
  "MOTS-C+NAD+": { type: "synergy", note: "Mitochondrial powerhouse stack. MOTS-C mimics exercise, NAD+ fuels cellular energy. Longevity synergy." },
  "MOTS-C+SS-31": { type: "synergy", note: "Both target mitochondria via different mechanisms. MOTS-C (AMPK activation) + SS-31 (cardiolipin stabilization)." },
  "NAD++Epithalon": { type: "synergy", note: "NAD+ fuels sirtuins for DNA repair, Epithalon activates telomerase. Complementary longevity pathways." },
  "Semax+Selank": { type: "synergy", note: "Classic nootropic stack. Semax (focus, BDNF) + Selank (calm, anxiolytic). Both intranasal, can be taken together." },
  "Semax+Dihexa": { type: "synergy", note: "Cognitive powerhouse. Semax (BDNF) + Dihexa (HGF/neuroplasticity). Different mechanisms, additive effects." },
  "KPV+BPC-157": { type: "synergy", note: "Ultimate gut healing stack. KPV (NF-\u03BAB inhibition) + BPC-157 (angiogenesis, tissue repair). Excellent for IBS/IBD." },
  "Ipamorelin+Tesamorelin": { type: "synergy", note: "Ipamorelin pulses GH, Tesamorelin provides sustained GHRH. Potent body composition stack \u2014 better than either alone." },
  "Ipamorelin+CJC-1295/Ipamorelin": { type: "caution", note: "CJC/Ipa combo already contains Ipamorelin. Adding standalone Ipamorelin doubles the dose \u2014 only do this intentionally." },
  "FOXO4-DRI+NAD+": { type: "synergy", note: "Clear senescent cells first (FOXO4-DRI), then fuel cellular repair (NAD+). Run FOXO4 cycle, then start NAD+." },
  "FOXO4-DRI+Epithalon": { type: "synergy", note: "Senolysis + telomerase activation. Two complementary longevity mechanisms. Cycle FOXO4 first." },
  "Glutathione+NAD+": { type: "synergy", note: "The cellular rejuvenation stack. NAD+ powers sirtuins, glutathione protects from oxidative damage. Best run together." },
  "Glutathione+BPC-157": { type: "synergy", note: "Glutathione creates optimal antioxidant environment for BPC-157's tissue repair. Enhanced healing." },
  "Lipo-C+Semaglutide": { type: "synergy", note: "Lipo-C supports liver fat processing while semaglutide reduces appetite. Different mechanisms, same goal." },
  "Lipo-C+Retatrutide": { type: "synergy", note: "Same synergy as with semaglutide \u2014 Lipo-C helps liver process the fat being mobilized by Retatrutide." },
  "Lipo-C+Tirzepatide": { type: "synergy", note: "Lipotropic support for GLP-1 mediated fat loss. Liver support + appetite suppression." },
  "Teduglutide (GLP-2)+BPC-157": { type: "synergy", note: "Both promote gut healing via different mechanisms. GLP-2 grows mucosal lining, BPC-157 repairs tissue. Powerful gut stack." },
  "Teduglutide (GLP-2)+KPV": { type: "synergy", note: "GLP-2 rebuilds gut lining + KPV reduces gut inflammation. Excellent for IBS/IBD protocols." },
  "BPC-157/TB-500 Blend+BPC-157": { type: "avoid", note: "Blend already contains BPC-157. Adding standalone BPC doubles the dose unintentionally." },
  "BPC-157/TB-500 Blend+TB-500": { type: "avoid", note: "Blend already contains TB-500. Adding standalone TB doubles the dose." },
  "KLOW Blend+Retatrutide": { type: "synergy", note: "Optimal fat loss stack. KLOW's BPC-157 protects gut from GLP-1 side effects, KPV reduces inflammation, TB-500 supports training recovery, GHK-Cu prevents loose skin during rapid weight loss." },
  "KLOW Blend+Semaglutide": { type: "synergy", note: "KLOW's BPC-157 protects gut from GLP-1 nausea. KPV adds anti-inflammatory support. Excellent pairing." },
  "KLOW Blend+Tirzepatide": { type: "synergy", note: "Same synergy as with Sema/Reta \u2014 KLOW protects against GLP-1 GI side effects while supporting recovery." },
  "MOTS-C+Retatrutide": { type: "synergy", note: "MOTS-C maintains energy and metabolic rate during GLP-1 mediated caloric deficit. Prevents metabolic slowdown." },
  "MOTS-C+Semaglutide": { type: "synergy", note: "MOTS-C counters the energy drop from GLP-1 appetite suppression. Keeps cellular metabolism running." },
  "KLOW Blend+BPC-157": { type: "avoid", note: "KLOW already contains BPC-157, TB-500, GHK-Cu, and KPV. Don't stack with individual components." },
  "KLOW Blend+KPV": { type: "avoid", note: "KLOW already contains KPV. Doubling up is unnecessary." },
  "KLOW Blend+GHK-Cu": { type: "avoid", note: "KLOW already contains GHK-Cu. Use one or the other." },
  "KLOW Blend+BPC-157/TB-500 Blend": { type: "avoid", note: "Complete overlap \u2014 KLOW contains everything in the BPC/TB blend plus more." },
  "HCG+Kisspeptin-10": { type: "synergy", note: "HCG stimulates Leydig cells directly, Kisspeptin stimulates LH upstream. Complementary testosterone support." },
  "Vitamin B12+Lipo-C": { type: "caution", note: "Lipo-C already contains B12. Adding standalone B12 may be redundant unless your blend has a low B12 dose." },
  "GLOW Blend+GHK-Cu": { type: "avoid", note: "GLOW contains GHK-Cu (50mg). Adding standalone GHK-Cu doubles the dose." },
  "GLOW Blend+BPC-157": { type: "avoid", note: "GLOW contains BPC-157 (10mg). Don't stack with standalone BPC." },
  "GLOW Blend+TB-500": { type: "avoid", note: "GLOW contains TB-500 (10mg). Don't stack with standalone TB." },
  "GLOW Blend+KLOW Blend": { type: "avoid", note: "Major overlap \u2014 both contain GHK-Cu, BPC-157, TB-500. Use one or the other." },
  "Melatonin (Injectable)+DSIP": { type: "synergy", note: "Melatonin for sleep onset + DSIP for deep sleep architecture. Complementary sleep stack \u2014 use low doses of each." },
  "N-Acetyl Semax Amidate+Semax": { type: "avoid", note: "N-Acetyl Semax IS enhanced Semax. Don't stack \u2014 use one or the other. N-Acetyl version is 2-3x more potent." },
  "N-Acetyl Selank Amidate+Selank": { type: "avoid", note: "N-Acetyl Selank IS enhanced Selank. Don't stack \u2014 use one or the other. N-Acetyl version is longer acting." },
  "N-Acetyl Semax Amidate+N-Acetyl Selank Amidate": { type: "synergy", note: "The ultimate nootropic stack. Enhanced Semax (focus, BDNF) + Enhanced Selank (calm, anxiolytic). Both intranasal, can be taken together." },
  "N-Acetyl Semax Amidate+Semax/Selank Blend": { type: "avoid", note: "The blend already contains Semax. Adding N-Acetyl Semax doubles the mechanism." },
  "Tesamorelin/Ipamorelin Blend+Tesamorelin": { type: "avoid", note: "Blend already contains Tesamorelin. Don't stack with standalone Tesamorelin." },
  "Tesamorelin/Ipamorelin Blend+Ipamorelin": { type: "avoid", note: "Blend already contains Ipamorelin. Adding standalone doubles the GHRP dose." },
  "Tesamorelin/Ipamorelin Blend+CJC-1295/Ipamorelin": { type: "avoid", note: "Both contain Ipamorelin. Major dose overlap \u2014 choose one combo or the other." },
  "GHK-Cu Topical+GHK-Cu": { type: "synergy", note: "Topical targets skin directly while injectable works systemically. Can use both for maximum collagen/skin benefit." },
  "GHK-Cu Topical+GLOW Blend": { type: "caution", note: "GLOW contains GHK-Cu injectable. Adding topical is OK but monitor for copper excess if using high doses of both." },
  "NXP-3P Blend+Retatrutide": { type: "avoid", note: "Both target GLP pathways. Don't stack multiple GLP agonists \u2014 excessive GI side effects." },
  "NXP-2P Blend+Semaglutide": { type: "avoid", note: "Both target GLP pathways. Choose one weight management protocol." },
  "PT-141+Kisspeptin-10": { type: "caution", note: "Both affect hormonal pathways. Use on separate days." },
};

/**
 * Check compatibility between two peptides.
 * Strips size suffixes (e.g. "BPC-157 10mg" -> "BPC-157") before lookup.
 * Returns the compatibility object or null if not found.
 */
export function checkCompat(pepNameA, pepNameB) {
  const strip = (n) => n.replace(/\s+\d+[\w/.]*$/, "");
  const a = strip(pepNameA), b = strip(pepNameB);
  return (
    PEP_COMPAT[a + "+" + b] ||
    PEP_COMPAT[b + "+" + a] ||
    PEP_COMPAT[pepNameA + "+" + pepNameB] ||
    PEP_COMPAT[pepNameB + "+" + pepNameA] ||
    null
  );
}
