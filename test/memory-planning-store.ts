import {
  DEFAULT_PREFERENCES,
  type PlanOverride,
  type PlanningStore,
  type StudyPlan,
  type StudyPreferences,
  type StudySession,
} from "../src/planning.ts";

export class MemoryPlanningStore implements PlanningStore {
  private readonly preferences = new Map<string, StudyPreferences>();
  private readonly plans = new Map<string, StudyPlan[]>();
  private readonly sessions = new Map<string, StudySession[]>();
  private readonly overrides = new Map<
    string,
    PlanOverride & { userId: string; planId: string }
  >();
  private nextId = 1;

  async listPlans(userId: string): Promise<StudyPlan[]> {
    let plans = this.plans.get(userId);
    if (!plans) {
      plans = [
        {
          id: "default",
          name: "Meu planejamento",
          preferences: this.copyPreferences(
            this.preferences.get(userId) ?? DEFAULT_PREFERENCES,
          ),
          selectedTopicIds: null,
          active: true,
          createdAt: new Date(),
        },
      ];
      this.plans.set(userId, plans);
    }
    return plans.map((plan) => ({
      ...plan,
      preferences: this.copyPreferences(plan.preferences),
    }));
  }

  async createPlan(
    userId: string,
    name: string,
    selectedTopicIds: string[] = [],
  ): Promise<StudyPlan> {
    const plans = await this.listPlans(userId);
    for (const plan of plans) plan.active = false;
    const plan: StudyPlan = {
      id: `plan-${this.nextId++}`,
      name,
      preferences: this.copyPreferences(DEFAULT_PREFERENCES),
      selectedTopicIds: [...selectedTopicIds],
      active: true,
      createdAt: new Date(),
    };
    plans.push(plan);
    this.plans.set(userId, plans);
    return { ...plan, preferences: this.copyPreferences(plan.preferences) };
  }

  async activatePlan(
    userId: string,
    planId: string,
  ): Promise<StudyPlan | null> {
    const plans = await this.listPlans(userId);
    const selected = plans.find((plan) => plan.id === planId);
    if (!selected) return null;
    for (const plan of plans) plan.active = plan.id === planId;
    this.plans.set(userId, plans);
    return {
      ...selected,
      preferences: this.copyPreferences(selected.preferences),
    };
  }

  async deletePlan(
    userId: string,
    planId: string,
  ): Promise<"deleted" | "not_found" | "default_plan" | "last_plan"> {
    if (planId === "default") return "default_plan";
    const plans = await this.listPlans(userId);
    const selectedIndex = plans.findIndex((plan) => plan.id === planId);
    if (selectedIndex < 0) return "not_found";
    if (plans.length <= 1) return "last_plan";
    const [selected] = plans.splice(selectedIndex, 1);
    if (selected?.active) plans[0].active = true;
    for (const [key, override] of this.overrides) {
      if (override.userId === userId && override.planId === planId) {
        this.overrides.delete(key);
      }
    }
    this.plans.set(userId, plans);
    return "deleted";
  }

  async getActivePlan(userId: string): Promise<StudyPlan> {
    const plans = await this.listPlans(userId);
    const active = plans.find((plan) => plan.active);
    if (!active) throw new Error("Planejamento ativo não encontrado.");
    return { ...active, preferences: this.copyPreferences(active.preferences) };
  }

  async saveSelectedTopics(
    userId: string,
    planId: string,
    topicIds: string[],
  ): Promise<string[]> {
    await this.listPlans(userId);
    const plan = this.plans.get(userId)?.find((item) => item.id === planId);
    if (!plan) throw new Error("Planejamento não encontrado.");
    plan.selectedTopicIds = [...topicIds];
    return [...topicIds];
  }

  async getPreferences(
    userId: string,
    planId: string,
  ): Promise<StudyPreferences> {
    const plan = (await this.listPlans(userId)).find(
      (item) => item.id === planId,
    );
    if (!plan) throw new Error("Planejamento não encontrado.");
    return this.copyPreferences(plan.preferences);
  }

  async savePreferences(
    userId: string,
    planId: string,
    preferences: StudyPreferences,
  ): Promise<StudyPreferences> {
    const plans = await this.listPlans(userId);
    const plan = plans.find((item) => item.id === planId);
    if (!plan) throw new Error("Planejamento não encontrado.");
    plan.preferences = this.copyPreferences(preferences);
    this.plans.set(userId, plans);
    return this.copyPreferences(preferences);
  }

  private copyPreferences(preferences: StudyPreferences): StudyPreferences {
    return { ...preferences, studyDays: [...preferences.studyDays] };
  }

  async createSession(
    userId: string,
    input: Omit<StudySession, "id" | "createdAt">,
  ): Promise<StudySession> {
    const session: StudySession = {
      ...input,
      id: String(this.nextId++).padStart(24, "0"),
      createdAt: new Date(),
    };
    this.sessions.set(userId, [...(this.sessions.get(userId) ?? []), session]);
    return session;
  }

  async listSessions(
    userId: string,
    planId: string,
    startDate: string,
    endDate: string,
  ): Promise<StudySession[]> {
    return (this.sessions.get(userId) ?? []).filter(
      (session) =>
        session.planId === planId &&
        session.date >= startDate &&
        session.date <= endDate,
    );
  }

  async deleteSession(
    userId: string,
    planId: string,
    sessionId: string,
  ): Promise<boolean> {
    const sessions = this.sessions.get(userId) ?? [];
    const index = sessions.findIndex(
      (session) => session.planId === planId && session.id === sessionId,
    );
    if (index < 0) return false;
    sessions.splice(index, 1);
    this.sessions.set(userId, sessions);
    return true;
  }

  async deleteSessions(
    userId: string,
    planId: string,
    startDate: string,
    endDate: string,
    sessionIds?: string[],
  ): Promise<number> {
    const sessions = this.sessions.get(userId) ?? [];
    const selectedIds = sessionIds ? new Set(sessionIds) : null;
    const remaining = sessions.filter(
      (session) =>
        session.planId !== planId ||
        session.date < startDate ||
        session.date > endDate ||
        (selectedIds !== null && !selectedIds.has(session.id)),
    );
    const deletedCount = sessions.length - remaining.length;
    this.sessions.set(userId, remaining);
    return deletedCount;
  }

  async listPlanOverrides(
    userId: string,
    planId: string,
    weekStart: string,
  ): Promise<PlanOverride[]> {
    return [...this.overrides.values()].filter(
      (item) =>
        item.userId === userId &&
        item.planId === planId &&
        item.weekStart === weekStart,
    );
  }

  async savePlanOverride(
    userId: string,
    planId: string,
    topicId: string,
    weekStart: string,
    plannedDate: string,
  ): Promise<PlanOverride> {
    const key = `${userId}:${planId}:${weekStart}:${topicId}`;
    const value = {
      userId,
      planId,
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
    planId: string,
    topicId: string,
    weekStart: string,
  ): Promise<boolean> {
    return this.overrides.delete(`${userId}:${planId}:${weekStart}:${topicId}`);
  }
}
