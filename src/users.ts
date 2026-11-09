import { ObjectId, type Collection, type MongoClient } from "mongodb";

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
}

export interface UserStore {
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  create(email: string, passwordHash: string): Promise<User>;
}

interface UserDocument {
  _id: ObjectId;
  email: string;
  passwordHash: string;
  createdAt: Date;
}

export class MongoUserStore implements UserStore {
  private readonly users: Collection<UserDocument>;

  constructor(client: MongoClient, databaseName?: string) {
    const database =
      databaseName === undefined ? client.db() : client.db(databaseName);
    this.users = database.collection<UserDocument>("users");
  }

  async ensureIndexes(): Promise<void> {
    await this.users.createIndex({ email: 1 }, { unique: true });
  }

  async findByEmail(email: string): Promise<User | null> {
    const document = await this.users.findOne({ email });
    return document === null ? null : toUser(document);
  }

  async findById(id: string): Promise<User | null> {
    if (!ObjectId.isValid(id)) return null;

    const document = await this.users.findOne({ _id: new ObjectId(id) });
    return document === null ? null : toUser(document);
  }

  async create(email: string, passwordHash: string): Promise<User> {
    const document: UserDocument = {
      _id: new ObjectId(),
      email,
      passwordHash,
      createdAt: new Date(),
    };
    await this.users.insertOne(document);
    return toUser(document);
  }
}

function toUser(document: UserDocument): User {
  return {
    id: document._id.toHexString(),
    email: document.email,
    passwordHash: document.passwordHash,
    createdAt: document.createdAt,
  };
}
