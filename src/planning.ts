import { ObjectId, type Collection, type MongoClient } from "mongodb";

export interface StudyPreferences {
  studyDays: number[];
  minutesPerDay: number;
  targetDate: string | null;
}

export interface StudySession {
  id: string;
  topicId: string;
  date: string;
  durationMinutes: number;
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
  getPreferences(userId: string): Promise<StudyPreferences>;
  savePreferences(
    userId: string,
    preferences: StudyPreferences,
  ): Promise<StudyPreferences>;
  createSession(
    userId: string,
    input: Omit<StudySession, "id" | "createdAt">,
  ): Promise<StudySession>;
  listSessions(
    userId: string,
    startDate: string,
    endDate: string,
  ): Promise<StudySession[]>;
  listPlanOverrides(userId: string, weekStart: string): Promise<PlanOverride[]>;
  savePlanOverride(
    userId: string,
    topicId: string,
    weekStart: string,
    plannedDate: string,
  ): Promise<PlanOverride>;
  deletePlanOverride(
    userId: string,
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

interface StudySessionDocument {
  _id: ObjectId;
  userId: string;
  topicId: string;
  date: string;
  durationMinutes: number;
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

export const DEFAULT_PREFERENCES: StudyPreferences = {
  studyDays: [0, 1, 2, 3, 4],
  minutesPerDay: 60,
  targetDate: null,
};

export class MongoPlanningStore implements PlanningStore {
  private readonly preferences: Collection<PreferenceDocument>;
  private readonly sessions: Collection<StudySessionDocument>;
  private readonly planOverrides: Collection<PlanOverrideDocument>;

  constructor(client: MongoClient, databaseName?: string) {
    const database =
      databaseName === undefined ? client.db() : client.db(databaseName);
    this.preferences =
      database.collection<PreferenceDocument>("study_preferences");
    this.sessions = database.collection<StudySessionDocument>("study_sessions");
    this.planOverrides =
      database.collection<PlanOverrideDocument>("plan_overrides");
  }

  async ensureIndexes(): Promise<void> {
    await Promise.all([
      this.sessions.createIndex({ userId: 1, date: -1 }),
      this.sessions.createIndex({ userId: 1, topicId: 1, date: -1 }),
      this.planOverrides.createIndex(
        { userId: 1, topicId: 1, weekStart: 1 },
        { unique: true },
      ),
    ]);
  }

  async getPreferences(userId: string): Promise<StudyPreferences> {
    const document = await this.preferences.findOne({ _id: userId });
    if (!document) return { ...DEFAULT_PREFERENCES };
    return {
      studyDays: document.studyDays,
      minutesPerDay: document.minutesPerDay,
      targetDate: document.targetDate,
    };
  }

  async savePreferences(
    userId: string,
    preferences: StudyPreferences,
  ): Promise<StudyPreferences> {
    await this.preferences.updateOne(
      { _id: userId },
      { $set: { ...preferences, updatedAt: new Date() } },
      { upsert: true },
    );
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
      createdAt: new Date(),
    };
    await this.sessions.insertOne(document);
    return toSession(document);
  }

  async listSessions(
    userId: string,
    startDate: string,
    endDate: string,
  ): Promise<StudySession[]> {
    const documents = await this.sessions
      .find({ userId, date: { $gte: startDate, $lte: endDate } })
      .sort({ date: 1, createdAt: 1 })
      .toArray();
    return documents.map(toSession);
  }

  async listPlanOverrides(
    userId: string,
    weekStart: string,
  ): Promise<PlanOverride[]> {
    const documents = await this.planOverrides
      .find({ userId, weekStart })
      .toArray();
    return documents.map(toPlanOverride);
  }

  async savePlanOverride(
    userId: string,
    topicId: string,
    weekStart: string,
    plannedDate: string,
  ): Promise<PlanOverride> {
    const document = await this.planOverrides.findOneAndUpdate(
      { userId, topicId, weekStart },
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
    topicId: string,
    weekStart: string,
  ): Promise<boolean> {
    const result = await this.planOverrides.deleteOne({
      userId,
      topicId,
      weekStart,
    });
    return result.deletedCount > 0;
  }
}

function toSession(document: StudySessionDocument): StudySession {
  return {
    id: document._id.toHexString(),
    topicId: document.topicId,
    date: document.date,
    durationMinutes: document.durationMinutes,
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
