import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ContentSnapshot } from "../src/content.ts";
import { generateWeeklyPlan } from "../src/planner.ts";

describe("weekly study plan", () => {
  it("keeps completed overridden topics visible without counting them as workload", () => {
    const now = new Date("2026-11-09T12:00:00.000Z");
    const content: ContentSnapshot = {
      subjects: [
        {
          id: "subject-1",
          name: "Tecnologia",
          description: "",
          notes: "",
          position: 0,
          archived: false,
          createdAt: now,
          updatedAt: now,
        },
      ],
      topics: [
        {
          id: "completed-topic",
          subjectId: "subject-1",
          name: "Tópico concluído",
          description: "",
          notes: "",
          position: 0,
          status: "studied",
          estimatedMinutes: 45,
          reviewDueAt: null,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: "upcoming-topic",
          subjectId: "subject-1",
          name: "Próximo tópico",
          description: "",
          notes: "",
          position: 1,
          status: "not_started",
          estimatedMinutes: 45,
          reviewDueAt: null,
          createdAt: now,
          updatedAt: now,
        },
      ],
      materials: [],
    };

    const plan = generateWeeklyPlan(
      content,
      { studyDays: [0], minutesPerDay: 60, targetDate: null },
      [],
      [
        {
          topicId: "completed-topic",
          plannedDate: "2026-11-09",
          weekStart: "2026-11-09",
          updatedAt: now,
        },
      ],
      now,
    );

    assert.deepEqual(
      plan.days[0].topics.map(({ topicId, status }) => ({ topicId, status })),
      [
        { topicId: "completed-topic", status: "studied" },
        { topicId: "upcoming-topic", status: "not_started" },
      ],
    );
    assert.equal(plan.days[0].plannedMinutes, 45);
    assert.equal(plan.workloadMinutes, 45);
    assert.deepEqual(plan.unscheduledTopics, []);
  });

  it("schedules oversized topics on free days and flags the exceeded capacity", () => {
    const now = new Date("2026-11-09T12:00:00.000Z");
    const content: ContentSnapshot = {
      subjects: [
        {
          id: "subject-1",
          name: "Tecnologia",
          description: "",
          notes: "",
          position: 0,
          archived: false,
          createdAt: now,
          updatedAt: now,
        },
      ],
      topics: ["topic-1", "topic-2", "topic-3"].map((id, position) => ({
        id,
        subjectId: "subject-1",
        name: `Tópico ${position + 1}`,
        description: "",
        notes: "",
        position,
        status: "not_started",
        estimatedMinutes: 75,
        reviewDueAt: null,
        createdAt: now,
        updatedAt: now,
      })),
      materials: [],
    };

    const plan = generateWeeklyPlan(
      content,
      { studyDays: [0, 1], minutesPerDay: 60, targetDate: null },
      [],
      [],
      now,
    );

    assert.deepEqual(
      plan.days
        .filter((day) => day.topics.length > 0)
        .map((day) => ({
          topicCount: day.topics.length,
          plannedMinutes: day.plannedMinutes,
          overCapacity: day.overCapacity,
        })),
      [
        { topicCount: 1, plannedMinutes: 75, overCapacity: true },
        { topicCount: 1, plannedMinutes: 75, overCapacity: true },
      ],
    );
    assert.deepEqual(
      plan.unscheduledTopics.map((topic) => topic.topicId),
      ["topic-3"],
    );
  });
});
