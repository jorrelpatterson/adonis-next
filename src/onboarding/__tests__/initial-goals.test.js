import { describe, it, expect } from 'vitest';
import { buildInitialGoals } from '../initial-goals.js';

describe('buildInitialGoals', () => {
  it('body domain with Fat Loss primary → lose-weight goal with deadline from nutrition targetDate', () => {
    const profile = { domains: ['body'], weight: 200 };
    const protocolStates = {
      workout: { primary: 'Fat Loss' },
      nutrition: { goalWeight: 180, targetDate: '2026-12-01' },
    };

    const goals = buildInitialGoals(profile, protocolStates);

    expect(goals).toHaveLength(1);
    expect(goals[0].templateId).toBe('lose-weight');
    expect(goals[0].domain).toBe('body');
    expect(goals[0].deadline).toBe('2026-12-01');
    expect(goals[0].target).toEqual({ metric: 'weight', from: 200, to: 180, unit: 'lbs' });
  });

  it('body domain with Muscle Gain primary → build-muscle goal', () => {
    const profile = { domains: ['body'], weight: 160 };
    const protocolStates = {
      workout: { primary: 'Muscle Gain' },
      nutrition: { goalWeight: 175, targetDate: '2026-11-01' },
    };

    const goals = buildInitialGoals(profile, protocolStates);

    expect(goals).toHaveLength(1);
    expect(goals[0].templateId).toBe('build-muscle');
  });

  it('body domain with Recomposition, Aesthetics, or no primary all fall through to body-recomp', () => {
    const profile = { domains: ['body'], weight: 190 };

    for (const primary of ['Recomposition', 'Aesthetics', 'Wellness', undefined]) {
      const goals = buildInitialGoals(profile, { workout: { primary }, nutrition: {} });
      expect(goals).toHaveLength(1);
      expect(goals[0].templateId).toBe('body-recomp');
    }
  });

  it('body goal falls back to profile.weight for targetWeight when nutrition goalWeight is absent', () => {
    const profile = { domains: ['body'], weight: 200 };
    const goals = buildInitialGoals(profile, { workout: { primary: 'Fat Loss' }, nutrition: {} });

    expect(goals[0].target).toEqual({ metric: 'weight', from: 200, to: 200, unit: 'lbs' });
    expect(goals[0].deadline).toBeNull();
  });

  it('money domain: credit primaryFocus "stack" (exact literal the code checks) → cc-stacking goal', () => {
    // NOTE: the brief describes this case as primaryFocus: 'Card stacking', but the
    // actual extracted code (src/onboarding/initial-goals.js line 59) compares
    // `creditAnswers.primaryFocus === 'stack'` — a bare 'stack' token, not the display
    // string 'Card stacking'. Anything else (including 'Card stacking') falls through
    // to the 'build-credit' default. This test documents the real code path; see the
    // divergence note below for the mismatched-value case.
    const profile = { domains: ['money'] };
    const protocolStates = { credit: { primaryFocus: 'stack' } };

    const goals = buildInitialGoals(profile, protocolStates);

    expect(goals).toHaveLength(1);
    expect(goals[0].templateId).toBe('cc-stacking');
    expect(goals[0].target).toEqual({ metric: 'rewards_value', from: 0, to: null, unit: 'dollars' });
  });

  it('money domain: credit primaryFocus "Card stacking" (brief\'s literal display string) does NOT match and falls back to build-credit', () => {
    const profile = { domains: ['money'] };
    const protocolStates = { credit: { primaryFocus: 'Card stacking' } };

    const goals = buildInitialGoals(profile, protocolStates);

    expect(goals).toHaveLength(1);
    expect(goals[0].templateId).toBe('build-credit');
  });

  it('money domain: credit-repair key takes precedence over credit key', () => {
    const profile = { domains: ['money'] };
    const protocolStates = {
      'credit-repair': { primaryFocus: 'stack' },
      credit: { primaryFocus: 'other' },
    };

    const goals = buildInitialGoals(profile, protocolStates);

    expect(goals[0].templateId).toBe('cc-stacking');
  });

  it('money domain: build-credit maps creditScoreRange to a current score, default target 800', () => {
    const profile = { domains: ['money'] };
    const cases = [
      ['rebuild', 550],
      ['600_700', 650],
      ['700_800', 750],
      ['800_plus', 800],
      [undefined, 650],
    ];

    for (const [creditScoreRange, expectedCurrent] of cases) {
      const goals = buildInitialGoals(profile, { credit: { creditScoreRange } });
      expect(goals[0].templateId).toBe('build-credit');
      expect(goals[0].target).toEqual({ metric: 'credit_score', from: expectedCurrent, to: 800, unit: 'points' });
    }
  });

  it('money domain: income goal only created when incomeTarget is given', () => {
    const profile = { domains: ['money'] };

    const withoutTarget = buildInitialGoals(profile, { credit: {}, income: {} });
    expect(withoutTarget.filter(g => g.templateId === 'grow-income')).toHaveLength(0);

    const withTarget = buildInitialGoals(profile, { credit: {}, income: { incomeTarget: '5000' } });
    const incomeGoal = withTarget.find(g => g.templateId === 'grow-income');
    expect(incomeGoal).toBeDefined();
    expect(incomeGoal.target).toEqual({ metric: 'monthly_income', from: 0, to: 5000, unit: 'dollars' });
  });

  it('travel domain → second-passport goal with Unsure placeholders', () => {
    const goals = buildInitialGoals({ domains: ['travel'] }, {});
    expect(goals).toHaveLength(1);
    expect(goals[0].templateId).toBe('second-passport');
    expect(goals[0].target).toEqual({ metric: 'passport', country: 'Unsure', pathway: 'Unsure' });
  });

  it('image domain → skincare-protocol goal with capitalized skinType, default Combination', () => {
    const withAnswer = buildInitialGoals({ domains: ['image'] }, { skincare: { skinType: 'oily' } });
    expect(withAnswer[0].templateId).toBe('skincare-protocol');
    expect(withAnswer[0].target).toEqual({ metric: 'routine_adherence', skinType: 'Oily' });

    const withoutAnswer = buildInitialGoals({ domains: ['image'] }, {});
    expect(withoutAnswer[0].target).toEqual({ metric: 'routine_adherence', skinType: 'Combination' });
  });

  it('mind domain → optimize-focus goal', () => {
    const goals = buildInitialGoals({ domains: ['mind'] }, {});
    expect(goals).toHaveLength(1);
    expect(goals[0].templateId).toBe('optimize-focus');
  });

  it('purpose domain → bucket-list-item goal, description from lifeAreas (max 3) or a default', () => {
    const withAreas = buildInitialGoals({ domains: ['purpose'] }, {
      purpose: { lifeAreas: ['Career', 'Health', 'Family', 'Faith'] },
    });
    expect(withAreas[0].templateId).toBe('bucket-list-item');
    expect(withAreas[0].target).toEqual({ metric: 'bucket_list', description: 'Strengthen: Career, Health, Family' });

    const withoutAreas = buildInitialGoals({ domains: ['purpose'] }, {});
    expect(withoutAreas[0].target).toEqual({ metric: 'bucket_list', description: 'Define and track my life vision' });
  });

  it('environment domain → ad-hoc structured goal (no template)', () => {
    const goals = buildInitialGoals({ domains: ['environment'] }, {});
    expect(goals).toHaveLength(1);
    expect(goals[0].type).toBe('structured');
    expect(goals[0].templateId).toBeNull();
    expect(goals[0].title).toBe('Daily Environment Protocol');
    expect(goals[0].domain).toBe('environment');
    expect(goals[0].activeProtocols).toEqual([{ protocolId: 'environment', domain: 'environment' }]);
  });

  it('community domain → ad-hoc goal titled by lookingFor, mastermind vs accountability partner', () => {
    const mastermind = buildInitialGoals({ domains: ['community'] }, { community: { lookingFor: 'mastermind' } });
    expect(mastermind).toHaveLength(1);
    expect(mastermind[0].title).toBe('Find Mastermind Group');
    expect(mastermind[0].type).toBe('structured');

    const other = buildInitialGoals({ domains: ['community'] }, { community: { lookingFor: 'partner' } });
    expect(other[0].title).toBe('Find Accountability Partner');
  });

  it('community domain: lookingFor "just_streaks" suppresses the goal entirely', () => {
    const goals = buildInitialGoals({ domains: ['community'] }, { community: { lookingFor: 'just_streaks' } });
    expect(goals).toHaveLength(0);
  });

  it('multi-domain profile produces one goal per selected domain, in domain-block order', () => {
    const profile = { domains: ['body', 'money', 'travel', 'mind'], weight: 200 };
    const protocolStates = {
      workout: { primary: 'Fat Loss' },
      nutrition: { goalWeight: 180, targetDate: '2026-12-01' },
      credit: { primaryFocus: 'stack' },
    };

    const goals = buildInitialGoals(profile, protocolStates);

    expect(goals.map(g => g.domain)).toEqual(['body', 'money', 'travel', 'mind']);
    expect(goals.map(g => g.templateId)).toEqual(['lose-weight', 'cc-stacking', 'second-passport', 'optimize-focus']);
  });

  it('defaults to the body domain and does not throw when protocolStates is empty', () => {
    const profile = { weight: 175 };
    const goals = buildInitialGoals(profile, {});

    expect(goals.length).toBeGreaterThanOrEqual(1);
    expect(goals[0].domain).toBe('body');
    expect(goals[0].templateId).toBe('body-recomp');
  });

  it('empty domains array yields no goals and does not throw', () => {
    const goals = buildInitialGoals({ domains: [] }, {});
    expect(goals).toEqual([]);
  });

  it('every produced goal has the shape emitted by the goal engine (id, status, progress, revenue, createdAt)', () => {
    const goals = buildInitialGoals({ domains: ['body', 'environment'] }, { workout: { primary: 'Fat Loss' } });

    for (const goal of goals) {
      expect(goal.id).toMatch(/^goal_/);
      expect(goal.status).toBe('active');
      expect(goal.progress).toBe(0);
      expect(goal.revenue).toBe(0);
      expect(typeof goal.createdAt).toBe('string');
    }
  });
});
