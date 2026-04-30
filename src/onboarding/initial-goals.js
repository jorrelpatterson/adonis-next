// Maps onboarding answers → initial goals to auto-create.
// Without this, users finish onboarding and land on an empty routine.
//
// For each selected domain, picks a sensible default goal template (or
// builds an ad-hoc structured goal for domains without templates) and
// populates its setup answers from what the wizard collected.

import { GOAL_TEMPLATES } from '../goals/goal-templates.js';
import { createGoalFromTemplate, createGoalFromInput } from '../goals/goal-engine.js';
import { DOMAINS } from '../design/constants.js';

function findTemplate(id) {
  return GOAL_TEMPLATES.find(t => t.id === id);
}

/**
 * Build initial goals from onboarding answers. Returns an array of
 * goal objects ready to be passed to addGoal().
 *
 * @param {object} profile - Final profile after onboarding (weight, age, etc.)
 * @param {object} protocolStates - Map of protocolId → answer object
 */
export function buildInitialGoals(profile, protocolStates) {
  const goals = [];
  const domains = profile?.domains || ['body'];

  // ─── BODY ───────────────────────────────────────────────────────────
  if (domains.includes('body')) {
    const workoutAnswers = protocolStates.workout || {};
    const nutritionAnswers = protocolStates.nutrition || {};
    const primary = workoutAnswers.primary;

    // Map fitness goal → template
    const templateId =
      primary === 'Fat Loss' ? 'lose-weight' :
      primary === 'Muscle Gain' ? 'build-muscle' :
      primary === 'Recomposition' ? 'body-recomp' :
      primary === 'Aesthetics' ? 'body-recomp' :  // closest match
      'body-recomp';                              // default for Wellness etc.

    const template = findTemplate(templateId);
    if (template) {
      const answers = {
        currentWeight: profile.weight,
        targetWeight: nutritionAnswers.goalWeight || profile.weight,
        deadline: nutritionAnswers.targetDate || null,
      };
      goals.push(createGoalFromTemplate(template, answers));
    }
  }

  // ─── MONEY ──────────────────────────────────────────────────────────
  if (domains.includes('money')) {
    const creditAnswers = protocolStates['credit-repair'] || protocolStates.credit || {};
    const incomeAnswers = protocolStates.income || {};

    // Credit goal — based on primary focus
    const creditTemplateId =
      creditAnswers.primaryFocus === 'stack' ? 'cc-stacking' :
      'build-credit';  // default for repair/build

    const creditTemplate = findTemplate(creditTemplateId);
    if (creditTemplate) {
      const answers = creditTemplateId === 'cc-stacking'
        ? { monthlySpend: 3000, deadline: null }
        : {
            currentScore: creditAnswers.creditScoreRange === 'rebuild' ? 550 :
                         creditAnswers.creditScoreRange === '600_700' ? 650 :
                         creditAnswers.creditScoreRange === '700_800' ? 750 :
                         creditAnswers.creditScoreRange === '800_plus' ? 800 : 650,
            targetScore: 800,
            deadline: null,
          };
      goals.push(createGoalFromTemplate(creditTemplate, answers));
    }

    // Income goal (only if user gave a target)
    if (incomeAnswers.incomeTarget) {
      const incomeTemplate = findTemplate('grow-income');
      if (incomeTemplate) {
        goals.push(createGoalFromTemplate(incomeTemplate, {
          targetMonthly: Number(incomeAnswers.incomeTarget),
          deadline: null,
        }));
      }
    }
  }

  // ─── TRAVEL ─────────────────────────────────────────────────────────
  if (domains.includes('travel')) {
    const passport = findTemplate('second-passport');
    if (passport) {
      goals.push(createGoalFromTemplate(passport, {
        country: 'Unsure',  // user picks country in citizenship app later
        pathway: 'Unsure',
        deadline: null,
      }));
    }
  }

  // ─── IMAGE ──────────────────────────────────────────────────────────
  if (domains.includes('image')) {
    const skincareTemplate = findTemplate('skincare-protocol');
    const skincareAnswers = protocolStates.skincare || {};
    if (skincareTemplate) {
      goals.push(createGoalFromTemplate(skincareTemplate, {
        skinType: skincareAnswers.skinType
          ? skincareAnswers.skinType.charAt(0).toUpperCase() + skincareAnswers.skinType.slice(1)
          : 'Combination',
      }));
    }
  }

  // ─── MIND ───────────────────────────────────────────────────────────
  if (domains.includes('mind')) {
    const mindTemplate = findTemplate('optimize-focus');
    if (mindTemplate) {
      goals.push(createGoalFromTemplate(mindTemplate, { deadline: null }));
    }
  }

  // ─── PURPOSE ────────────────────────────────────────────────────────
  if (domains.includes('purpose')) {
    const purposeTemplate = findTemplate('bucket-list-item');
    if (purposeTemplate) {
      const purposeAnswers = protocolStates.purpose || {};
      const focusAreas = purposeAnswers.lifeAreas || [];
      const description = focusAreas.length
        ? `Strengthen: ${focusAreas.slice(0, 3).join(', ')}`
        : 'Define and track my life vision';
      goals.push(createGoalFromTemplate(purposeTemplate, { description, deadline: null }));
    }
  }

  // ─── ENVIRONMENT (no template — ad-hoc goal) ───────────────────────
  if (domains.includes('environment')) {
    goals.push(createGoalFromInput({
      title: 'Daily Environment Protocol',
      domain: 'environment',
      activeProtocols: [{ protocolId: 'environment', domain: 'environment' }],
    }));
  }

  // ─── COMMUNITY (no template — ad-hoc goal) ─────────────────────────
  if (domains.includes('community')) {
    const communityAnswers = protocolStates.community || {};
    if (communityAnswers.lookingFor !== 'just_streaks') {
      goals.push(createGoalFromInput({
        title: communityAnswers.lookingFor === 'mastermind'
          ? 'Find Mastermind Group'
          : 'Find Accountability Partner',
        domain: 'community',
        activeProtocols: [{ protocolId: 'community', domain: 'community' }],
      }));
    }
  }

  return goals;
}
