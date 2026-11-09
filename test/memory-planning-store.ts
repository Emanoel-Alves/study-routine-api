import {
  DEFAULT_PREFERENCES,
  type PlanOverride,
  type PlanningStore,
  type StudyPreferences,
  type StudySession,
} from "../src/planning.ts";

export class MemoryPlanningStore implements PlanningStore {
  private readonly preferences = new Map<string, StudyPreferences>();
  private readonly sessions = new Map<string, StudySession[]>();
  private readonly overrides = new Map<
    string,
    PlanOverride & { userId: string }
  >();
  private nextId = 1;

  async getPreferences(userId: string): Promise<StudyPreferences> {
    const stored = this.preferences.get(userId);
    return stored
      ? { ...stored, studyDays: [...stored.studyDays] }
      : {
          ...DEFAULT_PREFERENCES,
          studyDays: [...DEFAULT_PREFERENCES.studyDays],
        };
  }

  async savePreferences(
    userId: string,
    preferences: StudyPreferences,
  ): Promise<StudyPreferences> {
    const saved = { ...preferences, studyDays: [...preferences.studyDays] };
    this.preferences.set(userId, saved);
    return saved;
  }

  async createSession(
    userId: string,
    input: Omit<StudySession, "id" | "createdAt">,
  ): Promise<StudySession> {
    const session: StudySession = {
      ...input,
      id: String(this.nextId++),
      createdAt: new Date(),
    };
    this.sessions.set(userId, [...(this.sessions.get(userId) ?? []), session]);
    return session;
  }

  async listSessions(
    userId: string,
    startDate: string,
    endDate: string,
  ): Promise<StudySession[]> {
    return (this.sessions.get(userId) ?? []).filter(
      (session) => session.date >= startDate && session.date <= endDate,
    );
  }

  async listPlanOverrides(
    userId: string,
    weekStart: string,
  ): Promise<PlanOverride[]> {
    return [...this.overrides.values()].filter(
      (item) => item.userId === userId && item.weekStart === weekStart,
    );
  }

  async savePlanOverride(
    userId: string,
    topicId: string,
    weekStart: string,
    plannedDate: string,
  ): Promise<PlanOverride> {
    const key = `${userId}:${weekStart}:${topicId}`;
    const value = {
      userId,
      topicId,
      weekStart,
      plannedDate,
      updatedAt: new Date(),
    };
    this.overrides.set(key, value);
    return value;
  }

  async deletePlanOverride(
    userId: string,
    topicId: string,
    weekStart: string,
  ): Promise<boolean> {
    return this.overrides.delete(`${userId}:${weekStart}:${topicId}`);
  }
}
