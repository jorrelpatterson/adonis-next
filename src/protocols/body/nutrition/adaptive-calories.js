// Adaptive calorie + intensity engine — ports v1's "Off Pace · Pushing
// Harder" logic. Watches actual weight progress vs the deadline-required
// rate and automatically adjusts the daily calorie target + workout
// intensity to keep the user on track.
//
// THE MATH
// 1. Required weekly rate = (lbsToGo) / (weeksRemaining)
// 2. Required daily deficit = requiredWeeklyRate × 500 (1 lb fat ≈ 3500 cal)
// 3. Compare required vs actual (last 14 days of weight log) → pace
// 4. Adjust calorie target + workout mode based on pace
// 5. Safety: never breach minimum safe calories (1500 W / 1800 M)
//          and never breach max sustainable rate (2.5 lbs/wk losing,
//          1.5 lbs/wk gaining)

import { calcBMR, calcTDEE } from './math.js';

const FAT_CAL_PER_LB = 3500;
const MAX_RATE_LOSING = 2.5;   // lbs/week
const MAX_RATE_GAINING = 1.5;
const MIN_CAL_MALE = 1800;
const MIN_CAL_FEMALE = 1500;

/**
 * Compute days between two ISO date strings.
 */
function daysBetween(fromIso, toIso) {
  const from = new Date(fromIso);
  const to = new Date(toIso);
  return Math.max(0, Math.round((to - from) / (1000 * 60 * 60 * 24)));
}

/**
 * Average weekly weight delta over the last N days from logs.weight.
 * Returns null if fewer than 3 entries.
 */
export function actualWeeklyRate(weightLog, days = 14) {
  if (!Array.isArray(weightLog) || weightLog.length < 3) return null;
  const sorted = weightLog.slice().sort((a, b) => a.date.localeCompare(b.date));
  const window = sorted.slice(-days);
  if (window.length < 3) return null;

  const first = Number(window[0].weight);
  const last = Number(window[window.length - 1].weight);
  const dayDelta = Math.max(1, daysBetween(window[0].date, window[window.length - 1].date));
  const dailyRate = (last - first) / dayDelta;
  return dailyRate * 7;  // lbs/week (negative if losing)
}

/**
 * Returns the user's current weight from log (or profile.weight as fallback).
 */
function currentWeight(weightLog, profile) {
  if (Array.isArray(weightLog) && weightLog.length > 0) {
    const sorted = weightLog.slice().sort((a, b) => a.date.localeCompare(b.date));
    const last = sorted[sorted.length - 1];
    return Number(last.weight);
  }
  return Number(profile?.weight || 0);
}

/**
 * Main entry point. Returns:
 *   {
 *     baseTDEE, baseTarget,           — TDEE + non-adaptive target
 *     requiredWeeklyRate,             — lbs/wk needed to hit goal
 *     actualRate,                     — lbs/wk over last 14 days (or null)
 *     pace: 'on_track'|'behind'|'off_pace'|'ahead'|'no_goal'|'unrealistic',
 *     adaptedTarget,                  — adjusted daily calories
 *     adaptedDeficit,                 — daily deficit (negative = surplus)
 *     workoutMode: 'recovery'|'normal'|'high'|'extreme',
 *     paceLabel,                      — human-readable status
 *     weeksRemaining, daysRemaining, lbsToGo,
 *     direction: 'losing'|'gaining'|'maintain'|'unset',
 *   }
 */
export function computeAdaptive(profile, weightLog, today, goal) {
  const bmr = calcBMR(profile?.weight, profile?.hFt, profile?.hIn, profile?.age, profile?.gender);
  const tdee = calcTDEE(bmr, profile?.activity);
  const baseTDEE = tdee;

  // Goal-direction primary key from workout protocol
  const goalLabel = goal || profile?.primary || 'Wellness';
  const baseAdj = {
    'Fat Loss': -500, 'Muscle Gain': 350, 'Recomposition': -200, 'Aesthetics': -300,
  }[goalLabel] || 0;
  const baseTarget = Math.round(tdee + baseAdj);

  const goalW = Number(profile?.goalW);
  const targetDate = profile?.targetDate;
  const current = currentWeight(weightLog, profile);
  if (!goalW || !targetDate || !current) {
    return {
      baseTDEE: Math.round(tdee), baseTarget,
      requiredWeeklyRate: null, actualRate: null,
      pace: 'no_goal', adaptedTarget: baseTarget, adaptedDeficit: baseAdj,
      workoutMode: 'normal', paceLabel: 'Set a goal weight + date to activate adaptive mode',
      weeksRemaining: null, daysRemaining: null, lbsToGo: null, direction: 'unset',
    };
  }

  const daysRemaining = daysBetween(today, targetDate);
  const weeksRemaining = Math.max(1, daysRemaining / 7);
  const lbsToGo = goalW - current;  // negative = need to lose
  const direction = Math.abs(lbsToGo) < 0.5 ? 'maintain' : (lbsToGo < 0 ? 'losing' : 'gaining');
  const requiredWeeklyRate = lbsToGo / weeksRemaining;  // signed lbs/wk
  const absRequired = Math.abs(requiredWeeklyRate);

  // Realism check — even maxing safety, can the user hit it?
  const safeMax = direction === 'losing' ? MAX_RATE_LOSING : MAX_RATE_GAINING;
  const isUnrealistic = absRequired > safeMax;

  // Compute actual rate from log (signed)
  const actualRate = actualWeeklyRate(weightLog);

  // Determine pace
  let pace = 'no_goal';
  if (direction === 'maintain') {
    pace = 'on_track';
  } else if (actualRate == null) {
    pace = 'on_track';  // not enough data yet — assume on track
  } else {
    // Sign-aware comparison: are we moving in the right direction at the right speed?
    const movingRight = (direction === 'losing' && actualRate < 0) || (direction === 'gaining' && actualRate > 0);
    if (!movingRight) {
      pace = 'off_pace';
    } else {
      const ratio = Math.abs(actualRate) / absRequired;  // 1.0 = exactly required, >1 = ahead
      if (ratio < 0.4) pace = 'off_pace';
      else if (ratio < 0.85) pace = 'behind';
      else if (ratio > 1.4) pace = 'ahead';
      else pace = 'on_track';
    }
  }
  if (isUnrealistic && pace !== 'ahead') pace = 'unrealistic';

  // Map pace → workout mode
  const workoutMode = (
    pace === 'off_pace' || pace === 'unrealistic' ? 'extreme' :
    pace === 'behind' ? 'high' :
    pace === 'ahead' ? 'recovery' :
    'normal'
  );

  // Adapt calorie target based on pace
  // Cap required deficit at safeMax × 500 = 1250 cal/day (losing) or 750 (gaining)
  const cappedRequired = Math.sign(requiredWeeklyRate) * Math.min(absRequired, safeMax);
  const requiredDailyDelta = cappedRequired * 500;  // signed cal/day delta

  let adaptedDeficit = baseAdj;
  if (pace === 'off_pace' || pace === 'unrealistic') {
    // Push hard — match the required deficit exactly (clamped by safety floor)
    adaptedDeficit = Math.round(requiredDailyDelta);
  } else if (pace === 'behind') {
    // Tighten 200 cal beyond base, toward required
    adaptedDeficit = Math.round((baseAdj + requiredDailyDelta) / 2);
  } else if (pace === 'ahead') {
    // Loosen — back off 200 cal from base
    adaptedDeficit = baseAdj > 0 ? baseAdj - 100 : baseAdj + 200;
  } else {
    adaptedDeficit = baseAdj;
  }

  let adaptedTarget = Math.round(tdee + adaptedDeficit);
  // Floor at minimum safe calories
  const minCal = profile?.gender === 'female' ? MIN_CAL_FEMALE : MIN_CAL_MALE;
  if (adaptedTarget < minCal) {
    adaptedTarget = minCal;
    adaptedDeficit = adaptedTarget - tdee;
  }

  const paceLabel = (
    pace === 'off_pace'   ? 'Off Pace — Pushing Harder' :
    pace === 'unrealistic'? 'Off Pace — Goal Aggressive' :
    pace === 'behind'     ? 'Slightly Behind — Tightening Up' :
    pace === 'ahead'      ? 'Ahead — Recovery Mode' :
    pace === 'on_track'   ? 'On Track' :
    pace === 'maintain'   ? 'Maintenance' :
    'Set a goal weight + date'
  );

  return {
    baseTDEE: Math.round(tdee), baseTarget,
    requiredWeeklyRate, actualRate,
    pace, adaptedTarget, adaptedDeficit,
    workoutMode, paceLabel,
    weeksRemaining: Math.round(weeksRemaining * 10) / 10,
    daysRemaining, lbsToGo,
    direction,
  };
}
