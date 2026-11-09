import type {
  ContentSnapshot,
  ContentStore,
  Material,
  MaterialInput,
  Subject,
  SubjectInput,
  Topic,
  TopicInput,
} from "../src/content.ts";

type Owned<T> = T & { userId: string };

export class MemoryContentStore implements ContentStore {
  private readonly subjects = new Map<string, Owned<Subject>>();
  private readonly topics = new Map<string, Owned<Topic>>();
  private readonly materials = new Map<string, Owned<Material>>();
  private nextId = 1;

  async listContent(userId: string): Promise<ContentSnapshot> {
    return {
      subjects: [...this.subjects.values()]
        .filter((item) => item.userId === userId)
        .map(stripOwner),
      topics: [...this.topics.values()]
        .filter((item) => item.userId === userId)
        .map(stripOwner),
      materials: [...this.materials.values()]
        .filter((item) => item.userId === userId)
        .map(stripOwner),
    };
  }

  async createSubject(userId: string, input: SubjectInput): Promise<Subject> {
    const subjects = [...this.subjects.values()].filter(
      (item) => item.userId === userId,
    );
    const subject: Owned<Subject> = {
      ...input,
      id: this.id(),
      userId,
      notes: "",
      position: Math.max(-1, ...subjects.map((item) => item.position)) + 1,
      archived: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.subjects.set(subject.id, subject);
    return stripOwner(subject);
  }

  async updateSubject(
    userId: string,
    subjectId: string,
    input: Partial<SubjectInput> & { archived?: boolean; notes?: string },
  ): Promise<Subject | null> {
    const subject = this.subjects.get(subjectId);
    if (!subject || subject.userId !== userId) return null;
    Object.assign(subject, input, { updatedAt: new Date() });
    return stripOwner(subject);
  }

  async deleteSubject(
    userId: string,
    subjectId: string,
  ): Promise<{ topics: number; materials: number } | null> {
    const subject = this.subjects.get(subjectId);
    if (!subject || subject.userId !== userId) return null;
    const relatedTopics = [...this.topics.values()].filter(
      (topic) => topic.userId === userId && topic.subjectId === subjectId,
    );
    const relatedMaterials = [...this.materials.values()].filter(
      (material) =>
        material.userId === userId && material.subjectId === subjectId,
    );
    for (const topic of relatedTopics) this.topics.delete(topic.id);
    for (const material of relatedMaterials) this.materials.delete(material.id);
    this.subjects.delete(subjectId);
    return { topics: relatedTopics.length, materials: relatedMaterials.length };
  }

  async createTopic(
    userId: string,
    subjectId: string,
    input: TopicInput,
  ): Promise<Topic | null> {
    const subject = this.subjects.get(subjectId);
    if (!subject || subject.userId !== userId || subject.archived) return null;
    const topics = [...this.topics.values()].filter(
      (topic) => topic.userId === userId && topic.subjectId === subjectId,
    );
    const topic: Owned<Topic> = {
      id: this.id(),
      userId,
      subjectId,
      name: input.name,
      description: input.description,
      notes: "",
      position:
        input.position ??
        Math.max(-1, ...topics.map((topic) => topic.position)) + 1,
      status: input.status,
      estimatedMinutes: input.estimatedMinutes ?? null,
      reviewDueAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.topics.set(topic.id, topic);
    return stripOwner(topic);
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
    const topic = this.topics.get(topicId);
    if (!topic || topic.userId !== userId) return null;
    Object.assign(topic, input, { updatedAt: new Date() });
    return stripOwner(topic);
  }

  async deleteTopic(
    userId: string,
    topicId: string,
  ): Promise<{ materials: number } | null> {
    const topic = this.topics.get(topicId);
    if (!topic || topic.userId !== userId) return null;
    const related = [...this.materials.values()].filter(
      (material) => material.userId === userId && material.topicId === topicId,
    );
    for (const material of related) this.materials.delete(material.id);
    this.topics.delete(topicId);
    return { materials: related.length };
  }

  async createMaterial(
    userId: string,
    subjectId: string,
    input: MaterialInput,
  ): Promise<Material | null> {
    const subject = this.subjects.get(subjectId);
    if (!subject || subject.userId !== userId) return null;
    if (input.topicId !== null) {
      const topic = this.topics.get(input.topicId);
      if (!topic || topic.userId !== userId || topic.subjectId !== subjectId) {
        return null;
      }
    }
    const material: Owned<Material> = {
      id: this.id(),
      userId,
      subjectId,
      ...input,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.materials.set(material.id, material);
    return stripOwner(material);
  }

  async updateMaterial(
    userId: string,
    materialId: string,
    input: MaterialInput,
  ): Promise<Material | null> {
    const material = this.materials.get(materialId);
    if (!material || material.userId !== userId) return null;
    if (input.topicId !== null) {
      const topic = this.topics.get(input.topicId);
      if (
        !topic ||
        topic.userId !== userId ||
        topic.subjectId !== material.subjectId
      ) {
        return null;
      }
    }
    Object.assign(material, input, { updatedAt: new Date() });
    return stripOwner(material);
  }

  async deleteMaterial(userId: string, materialId: string): Promise<boolean> {
    const material = this.materials.get(materialId);
    if (!material || material.userId !== userId) return false;
    this.materials.delete(materialId);
    return true;
  }

  private id(): string {
    return String(this.nextId++).padStart(24, "0");
  }
}

function stripOwner<T extends { userId: string }>(item: T): Omit<T, "userId"> {
  const { userId, ...publicItem } = item;
  void userId;
  return publicItem;
}
