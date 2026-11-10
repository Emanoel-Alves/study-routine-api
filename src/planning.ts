import { ObjectId, type Collection, type MongoClient } from "mongodb";

export interface StudyPreferences {
  studyDays: number[];
  minutesPerDay: number;
  targetDate: string | null;
}

export interface StudyPlan {
  id: string;
  name: string;
  preferences: StudyPreferences;
  selectedTopicIds: string[] | null;
  active: boolean;
  createdAt: Date;
}

export interface StudySession {
  id: string;
  planId: string;
  topicId: string;
  date: string;
  durationMinutes: number;
  durationSeconds?: number;
  notes: string;
  kind: "study" | "review";
  createdAt: Date;
}

export interface PlanOverride {
  topicId: string;
  plannedDate: string;
  weekStart: string;
  updatedAt: Date;
}

export interface PlanningStore {
  listPlans(userId: string): Promise<StudyPlan[]>;
  createPlan(
    userId: string,
    name: string,
    selectedTopicIds?: string[],
  ): Promise<StudyPlan>;
  activatePlan(userId: string, planId: string): Promise<StudyPlan | null>;
  deletePlan(
    userId: string,
    planId: string,
  ): Promise<"deleted" | "not_found" | "default_plan" | "last_plan">;
  getActivePlan(userId: string): Promise<StudyPlan>;
  saveSelectedTopics(
    userId: string,
    planId: string,
    topicIds: string[],
  ): Promise<string[]>;
  getPreferences(userId: string, planId: string): Promise<StudyPreferences>;
  savePreferences(
    userId: string,
    planId: string,
    preferences: StudyPreferences,
  ): Promise<StudyPreferences>;
  createSession(
    userId: string,
    input: Omit<StudySession, "id" | "createdAt">,
  ): Promise<StudySession>;
  listSessions(
    userId: string,
    planId: string,
    startDate: string,
    endDate: string,
  ): Promise<StudySession[]>;
  deleteSession(
    userId: string,
    planId: string,
    sessionId: string,
  ): Promise<boolean>;
  deleteSessions(
    userId: string,
    planId: string,
    startDate: string,
    endDate: string,
    sessionIds?: string[],
  ): Promise<number>;
  listPlanOverrides(
    userId: string,
    planId: string,
    weekStart: string,
  ): Promise<PlanOverride[]>;
  savePlanOverride(
    userId: string,
    planId: string,
    topicId: string,
    weekStart: string,
    plannedDate: string,
  ): Promise<PlanOverride>;
  deletePlanOverride(
    userId: string,
    planId: string,
    topicId: string,
    weekStart: string,
  ): Promise<boolean>;
}

interface PreferenceDocument {
  _id: string;
  studyDays: number[];
  minutesPerDay: number;
  targetDate: string | null;
  updatedAt: Date;
}

interface StudyPlanDocument {
  _id: string;
  userId: string;
  planId: string;
  name: string;
  studyDays: number[];
  minutesPerDay: number;
  targetDate: string | null;
  selectedTopicIds?: string[] | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface StudyPlanStateDocument {
  _id: string;
  userId: string;
  activePlanId: string;
  updatedAt: Date;
}

interface StudySessionDocument {
  _id: ObjectId;
  userId: string;
  planId?: string;
  topicId: string;
  date: string;
  durationMinutes: number;
  durationSeconds?: number;
  notes: string;
  kind: "study" | "review";
  createdAt: Date;
}

interface PlanOverrideDocument {
  _id: ObjectId;
  userId: string;
  topicId: string;
  weekStart: string;
  plannedDate: string;
  updatedAt: Date;
}

interface StudyPlanOverrideDocument extends PlanOverrideDocument {
  planId: string;
}

export const DEFAULT_PREFERENCES: StudyPreferences = {
  studyDays: [0, 1, 2, 3, 4],
  minutesPerDay: 60,
  targetDate: null,
};

export class MongoPlanningStore implements PlanningStore {
  private readonly preferences: Collection<PreferenceDocument>;
  private readonly plans: Collection<StudyPlanDocument>;
  private readonly planStates: Collection<StudyPlanStateDocument>;
  private readonly sessions: Collection<StudySessionDocument>;
  private readonly planOverrides: Collection<PlanOverrideDocument>;
  private readonly studyPlanOverrides: Collection<StudyPlanOverrideDocument>;

  constructor(client: MongoClient, databaseName?: string) {
    const database =
      databaseName === undefined ? client.db() : client.db(databaseName);
    this.preferences =
      database.collection<PreferenceDocument>("study_preferences");
    this.plans = database.collection<StudyPlanDocument>("study_plans");
    this.planStates =
      database.collection<StudyPlanStateDocument>("study_plan_states");
    this.sessions = database.collection<StudySessionDocument>("study_sessions");
    this.planOverrides =
      database.collection<PlanOverrideDocument>("plan_overrides");
    this.studyPlanOverrides = database.collection<StudyPlanOverrideDocument>(
      "study_plan_overrides",
    );
  }

  async ensureIndexes(): Promise<void> {
    await Promise.all([
      this.sessions.createIndex({ userId: 1, date: -1 }),
      this.sessions.createIndex({ userId: 1, topicId: 1, date: -1 }),
      this.plans.createIndex({ userId: 1, createdAt: 1 }),
      this.studyPlanOverrides.createIndex(
        { userId: 1, planId: 1, topicId: 1, weekStart: 1 },
        { unique: true },
      ),
      this.planOverrides.createIndex(
        { userId: 1, topicId: 1, weekStart: 1 },
        { unique: true },
      ),
    ]);
  }

  async listPlans(userId: string): Promise<StudyPlan[]> {
    let documents = await this.plans
      .find({ userId })
      .sort({ createdAt: 1 })
      .toArray();
    if (documents.length === 0) {
      const legacy = await this.preferences.findOne({ _id: userId });
      const now = new Date();
      const plan: StudyPlanDocument = {
        _id: `${userId}:default`,
        userId,
        planId: "default",
        name: "Meu planejamento",
        ...legacyPreferences(legacy),
        selectedTopicIds: null,
        active: true,
        createdAt: legacy?.updatedAt ?? now,
        updatedAt: legacy?.updatedAt ?? now,
      };
      await this.plans.updateOne(
        { _id: plan._id },
        { $setOnInsert: plan },
        { upsert: true },
      );
      documents = await this.plans
        .find({ userId })
        .sort({ createdAt: 1 })
        .toArray();
    }
    const state = await ensureActivePlanState(
      userId,
      documents,
      this.planStates,
    );
    return documents.map((document) =>
      toStudyPlan({
        ...document,
        active: document.planId === state.activePlanId,
      }),
    );
  }

  async createPlan(
    userId: string,
    name: string,
    selectedTopicIds: string[] = [],
  ): Promise<StudyPlan> {
    const now = new Date();
    const planId = new ObjectId().toHexString();
    const document: StudyPlanDocument = {
      _id: `${userId}:${planId}`,
      userId,
      planId,
      name,
      ...DEFAULT_PREFERENCES,
      selectedTopicIds: [...selectedTopicIds],
      active: true,
      createdAt: now,
      updatedAt: now,
    };
    await this.listPlans(userId);
    document.active = true;
    await this.plans.insertOne(document);
    await this.planStates.updateOne(
      { _id: userId },
      {
        $set: { userId, activePlanId: planId, updatedAt: now },
      },
      { upsert: true },
    );
    return toStudyPlan(document);
  }

  async activatePlan(
    userId: string,
    planId: string,
  ): Promise<StudyPlan | null> {
    const selected = await this.plans.findOne({ userId, planId });
    if (!selected) return null;
    await this.planStates.updateOne(
      { _id: userId },
      {
        $set: {
          userId,
          activePlanId: planId,
          updatedAt: new Date(),
        },
      },
      { upsert: true },
    );
    return toStudyPlan({ ...selected, active: true });
  }

  async deletePlan(
    userId: string,
    planId: string,
  ): Promise<"deleted" | "not_found" | "default_plan" | "last_plan"> {
    if (planId === "default") return "default_plan";
    const documents = await this.plans
      .find({ userId })
      .sort({ createdAt: -1 })
      .toArray();
    const selected = documents.find((document) => document.planId === planId);
    if (!selected) return "not_found";
    if (documents.length <= 1) return "last_plan";

    const result = await this.plans.deleteOne({ userId, planId });
    if (result.deletedCount === 0) return "not_found";

    await this.studyPlanOverrides.deleteMany({ userId, planId });
    const state = await this.planStates.findOne({ _id: userId });
    if (state?.activePlanId === planId) {
      const replacement = documents.find(
        (document) => document.planId !== planId,
      );
      if (!replacement)
        throw new Error("Não foi possível encontrar outro planejamento.");
      await this.planStates.updateOne(
        { _id: userId },
        {
          $set: {
            userId,
            activePlanId: replacement.planId,
            updatedAt: new Date(),
          },
        },
        { upsert: true },
      );
    }
    return "deleted";
  }

  async getActivePlan(userId: string): Promise<StudyPlan> {
    const plans = await this.listPlans(userId);
    const active = plans.find((plan) => plan.active);
    if (active) return active;
    const fallback = plans[0];
    if (!fallback) throw new Error("Não foi possível carregar o planejamento.");
    const activated = await this.activatePlan(userId, fallback.id);
    if (!activated) throw new Error("Não foi possível ativar o planejamento.");
    return activated;
  }

  async saveSelectedTopics(
    userId: string,
    planId: string,
    topicIds: string[],
  ): Promise<string[]> {
    const result = await this.plans.updateOne(
      { userId, planId },
      { $set: { selectedTopicIds: [...topicIds], updatedAt: new Date() } },
    );
    if (result.matchedCount === 0)
      throw new Error("Planejamento não encontrado.");
    return [...topicIds];
  }

  async getPreferences(
    userId: string,
    planId: string,
  ): Promise<StudyPreferences> {
    const document = await this.plans.findOne({ userId, planId });
    if (!document) throw new Error("Planejamento não encontrado.");
    return {
      studyDays: document.studyDays,
      minutesPerDay: document.minutesPerDay,
      targetDate: document.targetDate,
    };
  }

  async savePreferences(
    userId: string,
    planId: string,
    preferences: StudyPreferences,
  ): Promise<StudyPreferences> {
    const result = await this.plans.updateOne(
      { userId, planId },
      { $set: { ...preferences, updatedAt: new Date() } },
    );
    if (result.matchedCount === 0)
      throw new Error("Planejamento não encontrado.");
    return { ...preferences, studyDays: [...preferences.studyDays] };
  }

  async createSession(
    userId: string,
    input: Omit<StudySession, "id" | "createdAt">,
  ): Promise<StudySession> {
    const document: StudySessionDocument = {
      _id: new ObjectId(),
      userId,
      ...input,
      durationSeconds: input.durationSeconds ?? input.durationMinutes * 60,
      createdAt: new Date(),
    };
    await this.sessions.insertOne(document);
    return toSession(document);
  }

  async listSessions(
    userId: string,
    planId: string,
    startDate: string,
    endDate: string,
  ): Promise<StudySession[]> {
    const planFilter =
      planId === "default"
        ? { $or: [{ planId }, { planId: { $exists: false } }] }
        : { planId };
    const documents = await this.sessions
      .find({
        userId,
        date: { $gte: startDate, $lte: endDate },
        ...planFilter,
      })
      .sort({ date: 1, createdAt: 1 })
      .toArray();
    return documents.map(toSession);
  }

  async deleteSession(
    userId: string,
    planId: string,
    sessionId: string,
  ): Promise<boolean> {
    if (!ObjectId.isValid(sessionId)) return false;
    const planFilter =
      planId === "default"
        ? { $or: [{ planId }, { planId: { $exists: false } }] }
        : { planId };
    const result = await this.sessions.deleteOne({
      _id: new ObjectId(sessionId),
      userId,
      ...planFilter,
    });
    return result.deletedCount > 0;
  }

  async deleteSessions(
    userId: string,
    planId: string,
    startDate: string,
    endDate: string,
    sessionIds?: string[],
  ): Promise<number> {
    const validIds = sessionIds?.filter((id) => ObjectId.isValid(id));
    if (sessionIds && validIds?.length !== sessionIds.length) return 0;
    const planFilter =
      planId === "default"
        ? { $or: [{ planId }, { planId: { $exists: false } }] }
        : { planId };
    const result = await this.sessions.deleteMany({
      userId,
      date: { $gte: startDate, $lte: endDate },
      ...planFilter,
      ...(validIds
        ? { _id: { $in: validIds.map((id) => new ObjectId(id)) } }
        : {}),
    });
    return result.deletedCount;
  }

  async listPlanOverrides(
    userId: string,
    planId: string,
    weekStart: string,
  ): Promise<PlanOverride[]> {
    const documents = await this.studyPlanOverrides
      .find({ userId, planId, weekStart })
      .toArray();
    const byTopic = new Map(
      documents.map((document) => [document.topicId, document]),
    );
    if (planId === "default") {
      const legacyDocuments = await this.planOverrides
        .find({ userId, weekStart })
        .toArray();
      for (const document of legacyDocuments) {
        if (!byTopic.has(document.topicId)) {
          byTopic.set(document.topicId, { ...document, planId });
        }
      }
    }
    return [...byTopic.values()].map(toPlanOverride);
  }

  async savePlanOverride(
    userId: string,
    planId: string,
    topicId: string,
    weekStart: string,
    plannedDate: string,
  ): Promise<PlanOverride> {
    const document = await this.studyPlanOverrides.findOneAndUpdate(
      { userId, planId, topicId, weekStart },
      {
        $set: { plannedDate, updatedAt: new Date() },
        $setOnInsert: { _id: new ObjectId() },
      },
      { upsert: true, returnDocument: "after" },
    );
    if (!document)
      throw new Error("Não foi possível salvar o ajuste do plano.");
    return toPlanOverride(document);
  }

  async deletePlanOverride(
    userId: string,
    planId: string,
    topicId: string,
    weekStart: string,
  ): Promise<boolean> {
    const result = await this.studyPlanOverrides.deleteOne({
      userId,
      planId,
      topicId,
      weekStart,
    });
    if (planId !== "default") return false;
    const legacyResult = await this.planOverrides.deleteOne({
      userId,
      topicId,
      weekStart,
    });
    return result.deletedCount > 0 || legacyResult.deletedCount > 0;
  }
}

async function ensureActivePlanState(
  userId: string,
  plans: StudyPlanDocument[],
  stateCollection: Collection<StudyPlanStateDocument>,
): Promise<StudyPlanStateDocument> {
  const existing = await stateCollection.findOne({ _id: userId });
  if (existing) return existing;
  const activePlanId =
    plans.find((plan) => plan.active)?.planId ?? plans[0]?.planId;
  if (!activePlanId) throw new Error("Nenhum planejamento foi encontrado.");
  const now = new Date();
  await stateCollection.updateOne(
    { _id: userId },
    {
      $setOnInsert: {
        _id: userId,
        userId,
        activePlanId,
        updatedAt: now,
      },
    },
    { upsert: true },
  );
  const state = await stateCollection.findOne({ _id: userId });
  if (!state) throw new Error("Não foi possível carregar o plano ativo.");
  return state;
}

function legacyPreferences(
  document: PreferenceDocument | null,
): StudyPreferences {
  if (!document) {
    return {
      ...DEFAULT_PREFERENCES,
      studyDays: [...DEFAULT_PREFERENCES.studyDays],
    };
  }
  return {
    studyDays: [...document.studyDays],
    minutesPerDay: document.minutesPerDay,
    targetDate: document.targetDate,
  };
}

function toStudyPlan(document: StudyPlanDocument): StudyPlan {
  return {
    id: document.planId,
    name: document.name,
    preferences: {
      studyDays: [...document.studyDays],
      minutesPerDay: document.minutesPerDay,
      targetDate: document.targetDate,
    },
    selectedTopicIds: document.selectedTopicIds ?? null,
    active: document.active,
    createdAt: document.createdAt,
  };
}

function toSession(document: StudySessionDocument): StudySession {
  return {
    id: document._id.toHexString(),
    planId: document.planId ?? "default",
    topicId: document.topicId,
    date: document.date,
    durationMinutes: document.durationMinutes,
    durationSeconds: document.durationSeconds ?? document.durationMinutes * 60,
    notes: document.notes,
    kind: document.kind,
    createdAt: document.createdAt,
  };
}

function toPlanOverride(document: PlanOverrideDocument): PlanOverride {
  return {
    topicId: document.topicId,
    plannedDate: document.plannedDate,
    weekStart: document.weekStart,
    updatedAt: document.updatedAt,
  };
}
