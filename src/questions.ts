import { ObjectId, type Collection, type MongoClient } from "mongodb";

export type QuestionStatus = "active" | "annulled" | "outdated";
export const validQuestionStatuses = [
  "active",
  "annulled",
  "outdated",
] as const;

export interface QuestionSource {
  name: string;
  url: string;
  exam: string;
  board: string;
  role: string;
  year: number | null;
  number: string;
}

export interface StudyQuestion {
  id: string;
  subjectId: string;
  topicId: string;
  statement: string;
  options: string[];
  correctOption: number;
  explanation: string;
  source: QuestionSource;
  status: QuestionStatus;
  statusNote: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface StudyQuestionInput {
  topicId: string;
  statement: string;
  options: string[];
  correctOption: number;
  explanation: string;
  source: QuestionSource;
  status: QuestionStatus;
  statusNote: string;
}

export interface QuestionStore {
  listQuestions(userId: string): Promise<StudyQuestion[]>;
  createQuestion(
    userId: string,
    subjectId: string,
    input: StudyQuestionInput,
  ): Promise<StudyQuestion>;
  updateQuestion(
    userId: string,
    questionId: string,
    subjectId: string,
    input: StudyQuestionInput,
  ): Promise<StudyQuestion | null>;
  deleteQuestion(userId: string, questionId: string): Promise<boolean>;
  deleteByTopic(userId: string, topicId: string): Promise<void>;
  deleteBySubject(userId: string, subjectId: string): Promise<void>;
}

interface QuestionDocument extends Omit<
  StudyQuestion,
  "id" | "subjectId" | "topicId"
> {
  _id: ObjectId;
  userId: string;
  subjectId: ObjectId;
  topicId: ObjectId;
}

export class MongoQuestionStore implements QuestionStore {
  private readonly questions: Collection<QuestionDocument>;

  constructor(client: MongoClient, databaseName?: string) {
    const database =
      databaseName === undefined ? client.db() : client.db(databaseName);
    this.questions = database.collection<QuestionDocument>("questions");
  }

  async ensureIndexes(): Promise<void> {
    await Promise.all([
      this.questions.createIndex({ userId: 1, subjectId: 1, createdAt: -1 }),
      this.questions.createIndex({ userId: 1, topicId: 1 }),
    ]);
  }

  async listQuestions(userId: string): Promise<StudyQuestion[]> {
    const questions = await this.questions
      .find({ userId })
      .sort({ createdAt: -1, _id: 1 })
      .toArray();
    return questions.map(toStudyQuestion);
  }

  async createQuestion(
    userId: string,
    subjectId: string,
    input: StudyQuestionInput,
  ): Promise<StudyQuestion> {
    const document: QuestionDocument = {
      _id: new ObjectId(),
      userId,
      subjectId: new ObjectId(subjectId),
      topicId: new ObjectId(input.topicId),
      statement: input.statement,
      options: input.options,
      correctOption: input.correctOption,
      explanation: input.explanation,
      source: input.source,
      status: input.status,
      statusNote: input.statusNote,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await this.questions.insertOne(document);
    return toStudyQuestion(document);
  }

  async updateQuestion(
    userId: string,
    questionId: string,
    subjectId: string,
    input: StudyQuestionInput,
  ): Promise<StudyQuestion | null> {
    const id = toObjectId(questionId);
    if (!id) return null;
    const result = await this.questions.findOneAndUpdate(
      { _id: id, userId },
      {
        $set: {
          subjectId: new ObjectId(subjectId),
          topicId: new ObjectId(input.topicId),
          statement: input.statement,
          options: input.options,
          correctOption: input.correctOption,
          explanation: input.explanation,
          source: input.source,
          status: input.status,
          statusNote: input.statusNote,
          updatedAt: new Date(),
        },
      },
      { returnDocument: "after" },
    );
    return result === null ? null : toStudyQuestion(result);
  }

  async deleteQuestion(userId: string, questionId: string): Promise<boolean> {
    const id = toObjectId(questionId);
    if (!id) return false;
    const result = await this.questions.deleteOne({
      _id: id,
      userId,
    });
    return result.deletedCount === 1;
  }

  async deleteByTopic(userId: string, topicId: string): Promise<void> {
    const id = toObjectId(topicId);
    if (!id) return;
    await this.questions.deleteMany({ userId, topicId: id });
  }

  async deleteBySubject(userId: string, subjectId: string): Promise<void> {
    const id = toObjectId(subjectId);
    if (!id) return;
    await this.questions.deleteMany({
      userId,
      subjectId: id,
    });
  }
}

function toObjectId(value: string): ObjectId | null {
  return ObjectId.isValid(value) ? new ObjectId(value) : null;
}

function toStudyQuestion(document: QuestionDocument): StudyQuestion {
  return {
    id: document._id.toHexString(),
    subjectId: document.subjectId.toHexString(),
    topicId: document.topicId.toHexString(),
    statement: document.statement,
    options: document.options,
    correctOption: document.correctOption,
    explanation: document.explanation,
    source: document.source,
    status: document.status,
    statusNote: document.statusNote,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
}
