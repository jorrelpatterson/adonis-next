// Golden characterization tests for the v1 citizenship engine.
// Source of truth: tests/golden/v1/citizenship.js (verbatim from public/app.html @ 3cf8214).
// scoreCitizenshipPaths is pure/deterministic: no Date, no Math.random, no browser globals.
// Ordering relies on Array.prototype.sort (stable in ES2019+), so tie order is deterministic.
import { goldenTest } from './harness.js';
import { scoreCitizenshipPaths } from './v1/citizenship.js';

const CASES = [
  {
    // Italy descent match (+40, "Ancestry match"), Italian speaker (+5, "Speaks Italian"),
    // budget 'low' (tier 1): investment misses all gates (-20), residency gets 18-branch,
    // timeline 'soon' (descent +15 / caribbean +15 / else +8),
    // relocate 'no' (residency -5, investment +10, descent +10),
    // purpose: eu (visaFree>=188), children (descent bonus).
    label: 'italy ancestry, low budget, soon, no relocation, eu+children, italian',
    input: {
      ancestry: ['italy'],
      budget: 'low',
      timeline: 'soon',
      relocate: 'no',
      purpose: ['eu', 'children'],
      languages: ['italian'],
    },
  },
  {
    // Ireland descent match; budget 'free' (tier 0) hits the residency 10-branch;
    // timeline 'medium' (+15 flat); relocate 'yes' (residency +10, investment +8);
    // purpose eu only; empty languages array.
    label: 'ireland ancestry, free budget, medium timeline, relocate yes, eu only',
    input: {
      ancestry: ['ireland'],
      budget: 'free',
      timeline: 'medium',
      relocate: 'yes',
      purpose: ['eu'],
      languages: [],
    },
  },
  {
    // Poland descent match; budget 'mid' (tier 2, all investment gates fail);
    // timeline 'no_rush' (final else +18); relocate 'part' (residency +10);
    // purpose 'tax' (panama/paraguay/caribbean +8); Spanish (mexico + argentina reasons).
    label: 'poland ancestry, mid budget, no rush, part-time abroad, tax, spanish',
    input: {
      ancestry: ['poland'],
      budget: 'mid',
      timeline: 'no_rush',
      relocate: 'part',
      purpose: ['tax'],
      languages: ['spanish'],
    },
  },
  {
    // Germany descent match; budget 'high' (tier 3: caribbean within budget,
    // portugal_gv/malta still -20); timeline 'soon'; relocate 'minimal'
    // (paraguay special +8 vs other residency +3); purpose planb + business
    // (business is a no-op — characterizes that it adds nothing);
    // German + Portuguese speaker (germany and portugal_gv reasons).
    label: 'germany ancestry, high budget, soon, minimal visits, planb+business, german+portuguese',
    input: {
      ancestry: ['germany'],
      budget: 'high',
      timeline: 'soon',
      relocate: 'minimal',
      purpose: ['planb', 'business'],
      languages: ['german', 'portuguese'],
    },
  },
  {
    // ancestry 'none' (-40 for every descent country); budget 'premium' (tier 4:
    // caribbean +20, portugal_gv +20, malta +15); timeline 'asap' (caribbean +20,
    // residency -10, descent +5); relocate 'no'; purpose travel (visaFree>=170) + planb.
    label: 'no ancestry, premium budget, asap, no relocation, travel+planb',
    input: {
      ancestry: ['none'],
      budget: 'premium',
      timeline: 'asap',
      relocate: 'no',
      purpose: ['travel', 'planb'],
      languages: ['none'],
    },
  },
  {
    // Multi-ancestry (italy + ireland both match); rich purpose list pushes Italy to
    // 40+20+15+10+10(eu)+8(travel)+5(planb)+8(children)+5(italian) = 121 -> exercises
    // the Math.min(100, ...) upper clamp.
    label: 'multi-ancestry italy+ireland, premium, soon, upper clamp at 100',
    input: {
      ancestry: ['italy', 'ireland'],
      budget: 'premium',
      timeline: 'soon',
      relocate: 'no',
      purpose: ['eu', 'travel', 'planb', 'children'],
      languages: ['italian'],
    },
  },
  {
    // ancestry 'none' + asap + no purposes: descent lands at -40+20+5+10 = -5 ->
    // exercises the Math.max(0, ...) lower clamp (all four descent countries at 0).
    label: 'no ancestry, free budget, asap, relocate yes, empty purpose — lower clamp at 0',
    input: {
      ancestry: ['none'],
      budget: 'free',
      timeline: 'asap',
      relocate: 'yes',
      purpose: [],
      languages: [],
    },
  },
  {
    // Fully empty answers object: ancestry undefined (optional-chaining branch: descent
    // gets -30, not -40); budget undefined -> `?? 1` default tier; timeline undefined ->
    // final else +18; relocate undefined -> residency -5 / investment +8;
    // purpose/languages default to [].
    label: 'empty answers object — all defaults and optional-chaining fallbacks',
    input: {},
  },
];

goldenTest('citizenship', CASES, (input) => scoreCitizenshipPaths(input));
