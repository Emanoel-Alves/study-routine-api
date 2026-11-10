import type { ContentSnapshot, StudyStatus } from "./content.ts";
import type {
  PlanOverride,
  StudyPreferences,
  StudySession,
} from "./planning.ts";

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_TOPIC_MINUTES = 45;
const STATUS_PRIORITY: Record<StudyStatus, number> = {
  review_pending: 0,
  in_progress: 1,
  not_started: 2,
  studied: 3,
};

export interface PlannedTopic {
  topicId: string;
  subjectId: string;
  subjectName: string;
  topicName: string;
  status: StudyStatus;
  estimatedMinutes: number;
  usesDefaultEstimate: boolean;
  manuallyScheduled: boolean;
}

export interface PlannedDay {
  date: string;
  weekday: number;
  available: boolean;
  capacityMinutes: number;
  plannedMinutes: number;
  topics: PlannedTopic[];
  overCapacity: boolean;
  studiedMinutes: number;
}

export interface WeeklyPlan {
  weekStart: string;
  weekEnd: string;
  days: PlannedDay[];
  unscheduledTopics: PlannedTopic[];
  totalAvailableMinutes: number;
  plannedMinutes: number;
  workloadMinutes: number;
  weeklyStudiedMinutes: number;
  weeklySessionCount: number;
  deadline: {
    date: string;
    availableMinutes: number;
    workloadMinutes: number;
    feasible: boolean;
  } | null;
}

export function startOfWeek(date: Date): string {
  const day = date.getUTCDay();
  const daysSinceMonday = (day + 6) % 7;
  const monday = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) -
      daysSinceMonday * DAY_MS,
  );
  return toDateString(monday);
}

export function generateWeeklyPlan(
  content: ContentSnapshot,
  preferences: StudyPreferences,
  sessions: StudySession[],
  overrides: PlanOverride[],
  now = new Date(),
): WeeklyPlan {
  const weekStart = startOfWeek(now);
  const weekStartDate = parseDate(weekStart);
  const weekEnd = toDateString(new Date(weekStartDate.getTime() + 6 * DAY_MS));
  const activeSubjectIds = new Set(
    content.subjects
      .filter((subject) => !subject.archived)
      .map((subject) => subject.id),
  );
  const subjectsById = new Map(
    content.subjects.map((subject) => [subject.id, subject]),
  );
  const topics = content.topics
    .filter((topic) => activeSubjectIds.has(topic.subjectId))
    .map((topic) => {
      const estimate =
        "estimatedMinutes" in topic &&
        typeof topic.estimatedMinutes === "number" &&
        Number.isInteger(topic.estimatedMinutes) &&
        topic.estimatedMinutes > 0
          ? topic.estimatedMinutes
          : DEFAULT_TOPIC_MINUTES;
      return {
        topicId: topic.id,
        subjectId: topic.subjectId,
        subjectName: subjectsById.get(topic.subjectId)?.name ?? "",
        topicName: topic.name,
        status: topic.status,
        estimatedMinutes: estimate,
        usesDefaultEstimate: !(
          "estimatedMinutes" in topic &&
          typeof topic.estimatedMinutes === "number" &&
          topic.estimatedMinutes > 0
        ),
        manuallyScheduled: false,
      };
    });
  const topicById = new Map(topics.map((topic) => [topic.topicId, topic]));
  const remaining = topics
    .filter((topic) => topic.status !== "studied")
    .sort((first, second) => {
      const statusDifference =
        STATUS_PRIORITY[first.status] - STATUS_PRIORITY[second.status];
      if (statusDifference !== 0) return statusDifference;
      return (
        first.subjectName.localeCompare(second.subjectName, "pt-BR") ||
        first.topicName.localeCompare(second.topicName, "pt-BR")
      );
    });

  const days = Array.from({ length: 7 }, (_, weekday) => {
    const date = toDateString(
      new Date(weekStartDate.getTime() + weekday * DAY_MS),
    );
    const daySessions = sessions.filter((session) => session.date === date);
    const available = preferences.studyDays.includes(weekday);
    return {
      date,
      weekday,
      available,
      capacityMinutes:
        available && date >= toDateString(now) ? preferences.minutesPerDay : 0,
      plannedMinutes: 0,
      topics: [] as PlannedTopic[],
      overCapacity: false,
      studiedMinutes: Math.floor(
        daySessions.reduce(
          (total, session) =>
            total + (session.durationSeconds ?? session.durationMinutes * 60),
          0,
        ) / 60,
      ),
    };
  });
  const overriddenTopicIds = new Set<string>();

  for (const override of overrides) {
    const topic = topicById.get(override.topicId);
    const day = days.find((item) => item.date === override.plannedDate);
    if (!topic || !day) continue;
    day.topics.push({ ...topic, manuallyScheduled: true });
    if (topic.status !== "studied") {
      day.plannedMinutes += topic.estimatedMinutes;
    }
    day.overCapacity = day.plannedMinutes > day.capacityMinutes;
    overriddenTopicIds.add(topic.topicId);
  }

  const availableDays = days.filter(
    (day) => day.available && day.date >= toDateString(now),
  );
  for (const topic of remaining) {
    if (overriddenTopicIds.has(topic.topicId)) continue;
    let day = availableDays.find(
      (candidate) =>
        candidate.capacityMinutes - candidate.plannedMinutes >=
        topic.estimatedMinutes,
    );
    if (!day) {
      day = availableDays.find((candidate) => candidate.plannedMinutes === 0);
    }
    if (!day) continue;
    day.topics.push(topic);
    day.plannedMinutes += topic.estimatedMinutes;
    day.overCapacity = day.plannedMinutes > day.capacityMinutes;
  }

  const plannedTopicIds = new Set(
    days.flatMap((day) => day.topics.map((topic) => topic.topicId)),
  );
  const unscheduledTopics = remaining.filter(
    (topic) => !plannedTopicIds.has(topic.topicId),
  );
  const workloadMinutes = remaining.reduce(
    (total, topic) => total + topic.estimatedMinutes,
    0,
  );
  const totalAvailableMinutes = days.reduce(
    (total, day) => total + day.capacityMinutes,
    0,
  );
  const weeklyStudiedMinutes = Math.floor(
    sessions.reduce(
      (total, session) =>
        total + (session.durationSeconds ?? session.durationMinutes * 60),
      0,
    ) / 60,
  );

  return {
    weekStart,
    weekEnd,
    days,
    unscheduledTopics,
    totalAvailableMinutes,
    plannedMinutes: days.reduce((total, day) => total + day.plannedMinutes, 0),
    workloadMinutes,
    weeklyStudiedMinutes,
    weeklySessionCount: sessions.length,
    deadline:
      preferences.targetDate === null
        ? null
        : deadlineCapacity(
            preferences.targetDate,
            preferences,
            workloadMinutes,
            now,
          ),
  };
}

function deadlineCapacity(
  targetDate: string,
  preferences: StudyPreferences,
  workloadMinutes: number,
  now: Date,
): WeeklyPlan["deadline"] {
  const target = parseDate(targetDate);
  const today = parseDate(toDateString(now));
  let availableMinutes = 0;
  for (
    let date = today;
    date.getTime() <= target.getTime();
    date = new Date(date.getTime() + DAY_MS)
  ) {
    const weekday = (date.getUTCDay() + 6) % 7;
    if (preferences.studyDays.includes(weekday)) {
      availableMinutes += preferences.minutesPerDay;
    }
  }
  return {
    date: targetDate,
    availableMinutes,
    workloadMinutes,
    feasible: workloadMinutes <= availableMinutes,
  };
}

function parseDate(date: string): Date {
  return new Date(`${date}T00:00:00.000Z`);
}

function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}
