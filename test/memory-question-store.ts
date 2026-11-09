import type {
  QuestionStore,
  StudyQuestion,
  StudyQuestionInput,
} from "../src/questions.ts";

type OwnedQuestion = StudyQuestion & { userId: string };

export class MemoryQuestionStore implements QuestionStore {
  private readonly questions = new Map<string, OwnedQuestion>();
  private nextId = 1;

  async listQuestions(userId: string): Promise<StudyQuestion[]> {
    return [...this.questions.values()]
      .filter((question) => question.userId === userId)
      .map(stripOwner);
  }

  async createQuestion(
    userId: string,
    subjectId: string,
    input: StudyQuestionInput,
  ): Promise<StudyQuestion> {
    const now = new Date();
    const question: OwnedQuestion = {
      ...input,
      source: { ...input.source },
      options: [...input.options],
      id: this.id(),
      userId,
      subjectId,
      createdAt: now,
      updatedAt: now,
    };
    this.questions.set(question.id, question);
    return stripOwner(question);
  }

  async updateQuestion(
    userId: string,
    questionId: string,
    subjectId: string,
    input: StudyQuestionInput,
  ): Promise<StudyQuestion | null> {
    const question = this.questions.get(questionId);
    if (!question || question.userId !== userId) return null;
    Object.assign(question, input, {
      subjectId,
      source: { ...input.source },
      options: [...input.options],
      updatedAt: new Date(),
    });
    return stripOwner(question);
  }

  async deleteQuestion(userId: string, questionId: string): Promise<boolean> {
    const question = this.questions.get(questionId);
    if (!question || question.userId !== userId) return false;
    this.questions.delete(questionId);
    return true;
  }

  async deleteByTopic(userId: string, topicId: string): Promise<void> {
    this.deleteMatching(
      (question) => question.userId === userId && question.topicId === topicId,
    );
  }

  async deleteBySubject(userId: string, subjectId: string): Promise<void> {
    this.deleteMatching(
      (question) =>
        question.userId === userId && question.subjectId === subjectId,
    );
  }

  private deleteMatching(predicate: (question: OwnedQuestion) => boolean) {
    for (const [id, question] of this.questions) {
      if (predicate(question)) this.questions.delete(id);
    }
  }

  private id(): string {
    return String(this.nextId++).padStart(24, "0");
  }
}

function stripOwner(question: OwnedQuestion): StudyQuestion {
  const { userId, ...publicQuestion } = question;
  void userId;
  return publicQuestion;
}
