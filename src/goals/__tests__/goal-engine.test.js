import { describe, it, expect } from "vitest";
import { GOAL_TEMPLATES } from "../goal-templates";
import {
  createGoalFromTemplate,
  createGoalFromInput,
  updateGoalProgress,
  activateProtocolsForGoal,
  decomposeGoal,
} from "../goal-engine";

const loseWeightTemplate = GOAL_TEMPLATES.find((t) => t.id === "lose-weight");
const planTripTemplate = GOAL_TEMPLATES.find((t) => t.id === "plan-trip");

describe("createGoalFromTemplate", () => {
  it("creates a goal with all required fields from template + answers", () => {
    const answers = {
      currentWeight: "210",
      targetWeight: "180",
      deadline: "2026-12-31",
    };
    const goal = createGoalFromTemplate(loseWeightTemplate, answers);

    expect(goal.id).toBeDefined();
    expect(typeof goal.id).toBe("string");
    expect(goal.title).toBe("Lose Weight");
    expect(goal.domain).toBe("body");
    expect(goal.type).toBe("template");
    expect(goal.templateId).toBe("lose-weight");
    expect(goal.status).toBe("active");
    expect(goal.target).toBeDefined();
    expect(goal.target.metric).toBe("weight");
    expect(goal.target.from).toBe(210);
    expect(goal.target.to).toBe(180);
    expect(goal.deadline).toBe("2026-12-31");
    expect(Array.isArray(goal.activeProtocols)).toBe(true);
    expect(goal.activeProtocols.length).toBe(3);
    expect(goal.progress).toBe(0);
    expect(goal.revenue).toBe(0);
    expect(goal.createdAt).toBeDefined();
    expect(typeof goal.createdAt).toBe("string");
  });

  it("generates unique IDs for each goal", () => {
    const answers = { currentWeight: "210", targetWeight: "180", deadline: "2026-12-31" };
    const g1 = createGoalFromTemplate(loseWeightTemplate, answers);
    const g2 = createGoalFromTemplate(loseWeightTemplate, answers);
    expect(g1.id).not.toBe(g2.id);
  });

  it("creates a goal from plan-trip template", () => {
    const answers = {
      destination: "Tokyo",
      departureDate: "2026-06-01",
      returnDate: "2026-06-14",
      budget: "5000",
    };
    const goal = createGoalFromTemplate(planTripTemplate, answers);

    expect(goal.id).toBeDefined();
    expect(goal.title).toBe("Plan a Trip");
    expect(goal.domain).toBe("travel");
    expect(goal.templateId).toBe("plan-trip");
    expect(goal.activeProtocols.length).toBe(3);
    expect(goal.target.destination).toBe("Tokyo");
  });
});

describe("createGoalFromInput", () => {
  it("creates a structured goal from raw input object", () => {
    const input = {
      title: "Read 12 books this year",
      domain: "mind",
      target: { metric: "booksRead", start: 0, end: 12 },
      deadline: "2026-12-31",
    };
    const goal = createGoalFromInput(input);

    expect(goal.id).toBeDefined();
    expect(goal.title).toBe("Read 12 books this year");
    expect(goal.domain).toBe("mind");
    expect(goal.type).toBe("structured");
    expect(goal.status).toBe("active");
    expect(goal.target).toEqual(input.target);
    expect(goal.deadline).toBe("2026-12-31");
    expect(goal.activeProtocols).toEqual([]);
    expect(goal.progress).toBe(0);
    expect(goal.revenue).toBe(0);
    expect(goal.createdAt).toBeDefined();
  });
});

describe("updateGoalProgress", () => {
  const weightGoal = {
    target: { metric: "weight", start: 210, end: 180 },
    createdAt: "2026-01-01",
    deadline: "2026-12-31",
  };

  it("calculates 33% progress for weight goal (210->180, current 200)", () => {
    // abs(210 - 200) / abs(210 - 180) * 100 = 10/30 * 100 = 33.33 -> round = 33
    const result = updateGoalProgress(weightGoal, 200, "2026-04-06");
    expect(result.percent).toBe(33);
  });

  it("returns 0 when no progress made", () => {
    const result = updateGoalProgress(weightGoal, 210, "2026-04-06");
    expect(result.percent).toBe(0);
  });

  it("caps progress at 100%", () => {
    const result = updateGoalProgress(weightGoal, 175, "2026-04-06");
    expect(result.percent).toBe(100);
  });

  it("works for credit_score goals (upward direction)", () => {
    const creditGoal = {
      target: { metric: "creditScore", start: 600, end: 750 },
      createdAt: "2026-01-01",
      deadline: "2026-12-31",
    };
    // abs(600 - 660) / abs(600 - 750) * 100 = 60/150 * 100 = 40
    const result = updateGoalProgress(creditGoal, 660, "2026-04-06");
    expect(result.percent).toBe(40);
  });

  it("determines trend: ahead when progress > timePercent + 10", () => {
    // createdAt: 2026-01-01, deadline: 2026-12-31 (364 days total)
    // today: 2026-04-06 — ~95 days elapsed -> ~26% time elapsed
    // progress: 33% -> 33 > 26 + 10 = 36? No, 33 < 36, so on_track
    // Let's use a case where we are clearly ahead
    const aheadGoal = {
      target: { metric: "weight", start: 210, end: 180 },
      createdAt: "2026-01-01",
      deadline: "2026-12-31",
    };
    // Set current to 165 (past goal): 100% progress, time~26% -> ahead
    const result = updateGoalProgress(aheadGoal, 165, "2026-04-06");
    expect(result.trend).toBe("ahead");
  });

  it("determines trend: behind when progress < timePercent - 10", () => {
    // createdAt: 2026-01-01, deadline: 2026-12-31
    // today: 2026-12-01 — ~334 days -> ~92% time elapsed
    // progress: 10% (current 207 of 210->180) -> 10 < 92 - 10 = 82 -> behind
    const behindGoal = {
      target: { metric: "weight", start: 210, end: 180 },
      createdAt: "2026-01-01",
      deadline: "2026-12-31",
    };
    const result = updateGoalProgress(behindGoal, 207, "2026-12-01");
    expect(result.trend).toBe("behind");
  });

  it("returns on_track when no deadline", () => {
    const noDeadlineGoal = {
      target: { metric: "weight", start: 210, end: 180 },
      createdAt: "2026-01-01",
    };
    const result = updateGoalProgress(noDeadlineGoal, 200, "2026-04-06");
    expect(result.trend).toBe("on_track");
  });
});

describe("activateProtocolsForGoal", () => {
  it("returns protocol list from template", () => {
    const result = activateProtocolsForGoal(loseWeightTemplate);
    expect(result.length).toBe(loseWeightTemplate.protocols.length);
    expect(result[0].protocolId).toBe(loseWeightTemplate.protocols[0].protocolId);
  });
});

describe("decomposeGoal", () => {
  it("returns activeProtocols for template-based goal", () => {
    const answers = { currentWeight: "210", targetWeight: "180", deadline: "2026-12-31" };
    const goal = createGoalFromTemplate(loseWeightTemplate, answers);
    const result = decomposeGoal(goal);
    expect(result).toEqual(goal.activeProtocols);
    expect(result.length).toBe(3);
  });

  it("returns activeProtocols for structured goal", () => {
    const input = {
      title: "Meditate daily",
      domain: "mind",
      target: { metric: "meditationDays", start: 0, end: 30 },
    };
    const goal = createGoalFromInput(input);
    const result = decomposeGoal(goal);
    expect(result).toEqual([]);
  });
});
