import { ObjectId, type Collection, type MongoClient } from "mongodb";

export type StudyStatus =
  "not_started" | "in_progress" | "studied" | "review_pending";

export type MaterialType =
  "video" | "law" | "book" | "article" | "questions" | "document" | "other";

export interface Subject {
  id: string;
  name: string;
  description: string;
  notes: string;
  position: number;
  archived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Topic {
  id: string;
  subjectId: string;
  name: string;
  description: string;
  notes: string;
  position: number;
  status: StudyStatus;
  estimatedMinutes: number | null;
  reviewDueAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Material {
  id: string;
  subjectId: string;
  topicId: string | null;
  title: string;
  type: MaterialType;
  url: string;
  text: string;
  professor: string;
  thumbnailUrl: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ContentSnapshot {
  subjects: Subject[];
  topics: Topic[];
  materials: Material[];
}

export interface SubjectInput {
  name: string;
  description: string;
}

export interface TopicInput {
  name: string;
  description: string;
  status: StudyStatus;
  position?: number;
  estimatedMinutes?: number | null;
}

export interface MaterialInput {
  topicId: string | null;
  title: string;
  type: MaterialType;
  url: string;
  text: string;
  professor: string;
  thumbnailUrl: string;
}

export interface ContentStore {
  listContent(userId: string): Promise<ContentSnapshot>;
  createSubject(userId: string, input: SubjectInput): Promise<Subject>;
  updateSubject(
    userId: string,
    subjectId: string,
    input: Partial<SubjectInput> & { archived?: boolean; notes?: string },
  ): Promise<Subject | null>;
  deleteSubject(
    userId: string,
    subjectId: string,
  ): Promise<{ topics: number; materials: number } | null>;
  createTopic(
    userId: string,
    subjectId: string,
    input: TopicInput,
  ): Promise<Topic | null>;
  updateTopic(
    userId: string,
    topicId: string,
    input: Partial<Omit<TopicInput, "position">> & {
      position?: number;
      notes?: string;
      reviewDueAt?: Date | null;
    },
  ): Promise<Topic | null>;
  deleteTopic(
    userId: string,
    topicId: string,
  ): Promise<{ materials: number } | null>;
  createMaterial(
    userId: string,
    subjectId: string,
    input: MaterialInput,
  ): Promise<Material | null>;
  updateMaterial(
    userId: string,
    materialId: string,
    input: MaterialInput,
  ): Promise<Material | null>;
  deleteMaterial(userId: string, materialId: string): Promise<boolean>;
}

interface SubjectDocument {
  _id: ObjectId;
  userId: string;
  name: string;
  description: string;
  notes: string;
  position: number;
  archived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface TopicDocument {
  _id: ObjectId;
  userId: string;
  subjectId: ObjectId;
  name: string;
  description: string;
  notes: string;
  position: number;
  status: StudyStatus;
  estimatedMinutes?: number | null;
  reviewDueAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface MaterialDocument {
  _id: ObjectId;
  userId: string;
  subjectId: ObjectId;
  topicId: ObjectId | null;
  title: string;
  type: MaterialType;
  url: string;
  text: string;
  professor?: string;
  thumbnailUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class MongoContentStore implements ContentStore {
  private readonly subjects: Collection<SubjectDocument>;
  private readonly topics: Collection<TopicDocument>;
  private readonly materials: Collection<MaterialDocument>;

  constructor(client: MongoClient, databaseName?: string) {
    const database =
      databaseName === undefined ? client.db() : client.db(databaseName);
    this.subjects = database.collection<SubjectDocument>("subjects");
    this.topics = database.collection<TopicDocument>("topics");
    this.materials = database.collection<MaterialDocument>("materials");
  }

  async ensureIndexes(): Promise<void> {
    await Promise.all([
      this.subjects.createIndex({ userId: 1, position: 1 }),
      this.topics.createIndex({ userId: 1, subjectId: 1, position: 1 }),
      this.materials.createIndex({ userId: 1, subjectId: 1, type: 1 }),
      this.materials.createIndex({ userId: 1, topicId: 1 }),
    ]);
  }

  async listContent(userId: string): Promise<ContentSnapshot> {
    const [subjects, topics, materials] = await Promise.all([
      this.subjects.find({ userId }).sort({ position: 1, name: 1 }).toArray(),
      this.topics
        .find({ userId })
        .sort({ subjectId: 1, position: 1, name: 1 })
        .toArray(),
      this.materials.find({ userId }).sort({ createdAt: -1 }).toArray(),
    ]);

    return {
      subjects: subjects.map(toSubject),
      topics: topics.map(toTopic),
      materials: materials.map(toMaterial),
    };
  }

  async createSubject(userId: string, input: SubjectInput): Promise<Subject> {
    const now = new Date();
    const lastSubject = await this.subjects
      .find({ userId })
      .sort({ position: -1 })
      .limit(1)
      .next();
    const document: SubjectDocument = {
      _id: new ObjectId(),
      userId,
      ...input,
      notes: "",
      position: (lastSubject?.position ?? -1) + 1,
      archived: false,
      createdAt: now,
      updatedAt: now,
    };
    await this.subjects.insertOne(document);
    return toSubject(document);
  }

  async updateSubject(
    userId: string,
    subjectId: string,
    input: Partial<SubjectInput> & { archived?: boolean; notes?: string },
  ): Promise<Subject | null> {
    const id = objectId(subjectId);
    if (!id) return null;

    const result = await this.subjects.findOneAndUpdate(
      { _id: id, userId },
      { $set: { ...input, updatedAt: new Date() } },
      { returnDocument: "after" },
    );
    return result === null ? null : toSubject(result);
  }

  async deleteSubject(
    userId: string,
    subjectId: string,
  ): Promise<{ topics: number; materials: number } | null> {
    const id = objectId(subjectId);
    if (!id || !(await this.subjects.findOne({ _id: id, userId }))) return null;

    const [topicResult, materialResult] = await Promise.all([
      this.topics.deleteMany({ userId, subjectId: id }),
      this.materials.deleteMany({ userId, subjectId: id }),
    ]);
    await this.subjects.deleteOne({ _id: id, userId });
    return {
      topics: topicResult.deletedCount,
      materials: materialResult.deletedCount,
    };
  }

  async createTopic(
    userId: string,
    subjectId: string,
    input: TopicInput,
  ): Promise<Topic | null> {
    const parentId = objectId(subjectId);
    if (
      !parentId ||
      !(await this.subjects.findOne({
        _id: parentId,
        userId,
        archived: false,
      }))
    ) {
      return null;
    }

    const now = new Date();
    const lastTopic = await this.topics
      .find({ userId, subjectId: parentId })
      .sort({ position: -1 })
      .limit(1)
      .next();
    const document: TopicDocument = {
      _id: new ObjectId(),
      userId,
      subjectId: parentId,
      name: input.name,
      description: input.description,
      notes: "",
      position: input.position ?? (lastTopic?.position ?? -1) + 1,
      status: input.status,
      estimatedMinutes: input.estimatedMinutes ?? null,
      reviewDueAt: null,
      createdAt: now,
      updatedAt: now,
    };
    await this.topics.insertOne(document);
    return toTopic(document);
  }

  async updateTopic(
    userId: string,
    topicId: string,
    input: Partial<Omit<TopicInput, "position">> & {
      position?: number;
      notes?: string;
      reviewDueAt?: Date | null;
    },
  ): Promise<Topic | null> {
    const id = objectId(topicId);
    if (!id) return null;

    const result = await this.topics.findOneAndUpdate(
      { _id: id, userId },
      { $set: { ...input, updatedAt: new Date() } },
      { returnDocument: "after" },
    );
    return result === null ? null : toTopic(result);
  }

  async deleteTopic(
    userId: string,
    topicId: string,
  ): Promise<{ materials: number } | null> {
    const id = objectId(topicId);
    if (!id || !(await this.topics.findOne({ _id: id, userId }))) return null;

    const materialResult = await this.materials.deleteMany({
      userId,
      topicId: id,
    });
    await this.topics.deleteOne({ _id: id, userId });
    return { materials: materialResult.deletedCount };
  }

  async createMaterial(
    userId: string,
    subjectId: string,
    input: MaterialInput,
  ): Promise<Material | null> {
    const parentId = objectId(subjectId);
    const topicId = input.topicId === null ? null : objectId(input.topicId);
    if (
      !parentId ||
      (input.topicId !== null && topicId === null) ||
      !(await this.subjects.findOne({ _id: parentId, userId }))
    ) {
      return null;
    }
    if (
      topicId !== null &&
      !(await this.topics.findOne({
        _id: topicId,
        subjectId: parentId,
        userId,
      }))
    ) {
      return null;
    }

    const now = new Date();
    const document: MaterialDocument = {
      _id: new ObjectId(),
      userId,
      subjectId: parentId,
      topicId,
      title: input.title,
      type: input.type,
      url: input.url,
      text: input.text,
      professor: input.professor,
      thumbnailUrl: input.thumbnailUrl,
      createdAt: now,
      updatedAt: now,
    };
    await this.materials.insertOne(document);
    return toMaterial(document);
  }

  async updateMaterial(
    userId: string,
    materialId: string,
    input: MaterialInput,
  ): Promise<Material | null> {
    const id = objectId(materialId);
    if (!id) return null;

    const current = await this.materials.findOne({ _id: id, userId });
    if (!current) return null;

    const topicId = input.topicId === null ? null : objectId(input.topicId);
    if (input.topicId !== null && topicId === null) return null;
    if (!(await this.subjects.findOne({ _id: current.subjectId, userId }))) {
      return null;
    }
    if (
      topicId !== null &&
      !(await this.topics.findOne({
        _id: topicId,
        subjectId: current.subjectId,
        userId,
      }))
    ) {
      return null;
    }

    const result = await this.materials.findOneAndUpdate(
      { _id: id, userId },
      {
        $set: {
          topicId,
          title: input.title,
          type: input.type,
          url: input.url,
          text: input.text,
          professor: input.professor,
          thumbnailUrl: input.thumbnailUrl,
          updatedAt: new Date(),
        },
      },
      { returnDocument: "after" },
    );
    return result === null ? null : toMaterial(result);
  }

  async deleteMaterial(userId: string, materialId: string): Promise<boolean> {
    const id = objectId(materialId);
    if (!id) return false;
    const result = await this.materials.deleteOne({ _id: id, userId });
    return result.deletedCount > 0;
  }
}

function objectId(id: string): ObjectId | null {
  return ObjectId.isValid(id) ? new ObjectId(id) : null;
}

function toSubject(document: SubjectDocument): Subject {
  return {
    id: document._id.toHexString(),
    name: document.name,
    description: document.description,
    notes: document.notes,
    position: document.position,
    archived: document.archived,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
}

function toTopic(document: TopicDocument): Topic {
  return {
    id: document._id.toHexString(),
    subjectId: document.subjectId.toHexString(),
    name: document.name,
    description: document.description,
    notes: document.notes,
    position: document.position,
    status: document.status,
    estimatedMinutes: document.estimatedMinutes ?? null,
    reviewDueAt: document.reviewDueAt ?? null,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
}

function toMaterial(document: MaterialDocument): Material {
  return {
    id: document._id.toHexString(),
    subjectId: document.subjectId.toHexString(),
    topicId: document.topicId?.toHexString() ?? null,
    title: document.title,
    type: document.type,
    url: document.url,
    text: document.text,
    professor: document.professor ?? "",
    thumbnailUrl: document.thumbnailUrl ?? "",
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
}
