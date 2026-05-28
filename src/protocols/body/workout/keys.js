// src/protocols/body/workout/keys.js
export const logKey = (goal, week, dayIdx, exName, setIdx) =>
  `${goal}|${week}|${dayIdx}|${exName}|${setIdx}`;

export const prKey = (goal, exName) => `${goal}|${exName}`;

export const swapKey = (goal, week, dayIdx, exName) =>
  `${goal}|${week}|${dayIdx}|${exName}`;
