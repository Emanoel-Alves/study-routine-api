import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import jwt from "@fastify/jwt";
import rateLimit from "@fastify/rate-limit";
import Fastify, { type FastifyReply, type FastifyRequest } from "fastify";
import { randomBytes, timingSafeEqual } from "node:crypto";
import type {
  ContentStore,
  MaterialInput,
  MaterialType,
  StudyStatus,
  TopicInput,
} from "./content.ts";
import type { PlanningStore, StudyPreferences } from "./planning.ts";
import { generateWeeklyPlan, startOfWeek } from "./planner.ts";
import { hashPassword, verifyPassword } from "./password.ts";
import { STUDY_MATRIX } from "./study-matrix.ts";
import type { UserStore } from "./users.ts";

interface AppOptions {
  webOrigin?: string;
  jwtSecret?: string;
  inviteCode?: string;
  logger?: boolean;
  userStore: UserStore;
  contentStore: ContentStore;
  planningStore: PlanningStore;
  authRateLimitMax?: number;
  trustProxy?: boolean | string | string[];
}

interface CredentialsBody {
  email: string;
  password: string;
}

interface RegisterBody extends CredentialsBody {
  inviteCode: string;
}

interface SubjectBody {
  name: string;
  description?: string;
}

interface SubjectUpdateBody {
  name?: string;
  description?: string;
  archived?: boolean;
  notes?: string;
}

interface TopicBody {
  name: string;
  description?: string;
  status?: StudyStatus;
  estimatedMinutes?: number | null;
}

interface TopicUpdateBody {
  name?: string;
  description?: string;
  status?: StudyStatus;
  position?: number;
  notes?: string;
  estimatedMinutes?: number | null;
}

interface MaterialBody {
  topicId?: string | null;
  title: string;
  type: MaterialType;
  url?: string;
  text?: string;
}

interface PreferencesBody {
  studyDays: number[];
  minutesPerDay: number;
  targetDate: string | null;
}

interface SessionBody {
  kind: "study" | "review";
  date?: string;
  durationMinutes: number;
  notes?: string;
}

interface PlanItemBody {
  plannedDate: string;
}

interface SessionTokenPayload {
  sub: string;
  email: string;
  tokenUse?: "session";
}

const sessionCookieName = "study_routine_session";
const sessionCookieMaxAgeSeconds = 30 * 24 * 60 * 60;

const credentialsSchema = {
  type: "object",
  additionalProperties: false,
  required: ["email", "password"],
  properties: {
    email: { type: "string", minLength: 3, maxLength: 254 },
    password: { type: "string", minLength: 12, maxLength: 128 },
  },
} as const;

const subjectParamsSchema = {
  type: "object",
  required: ["subjectId"],
  additionalProperties: false,
  properties: { subjectId: { type: "string", minLength: 1, maxLength: 64 } },
} as const;

const topicParamsSchema = {
  type: "object",
  required: ["topicId"],
  additionalProperties: false,
  properties: { topicId: { type: "string", minLength: 1, maxLength: 64 } },
} as const;

const materialParamsSchema = {
  type: "object",
  required: ["materialId"],
  additionalProperties: false,
  properties: { materialId: { type: "string", minLength: 1, maxLength: 64 } },
} as const;

const studyStatuses = [
  "not_started",
  "in_progress",
  "studied",
  "review_pending",
] as const;
const materialTypes = [
  "video",
  "book",
  "article",
  "questions",
  "document",
  "other",
] as const;
const weekdays = [0, 1, 2, 3, 4, 5, 6] as const;

function safeEqual(first: string, second: string): boolean {
  const firstBytes = Buffer.from(first);
  const secondBytes = Buffer.from(second);

  return (
    firstBytes.length === secondBytes.length &&
    timingSafeEqual(firstBytes, secondBytes)
  );
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function validEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      (url.protocol === "https:" || url.protocol === "http:") &&
      url.username.length === 0 &&
      url.password.length === 0
    );
  } catch {
    return false;
  }
}

function validDateString(value: string): boolean {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`)) &&
    new Date(`${value}T00:00:00.000Z`).toISOString().slice(0, 10) === value
  );
}

function nextReviewDate(date = new Date()): Date {
  return new Date(date.getTime() + 7 * 24 * 60 * 60 * 1000);
}

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleLowerCase("pt-BR");
}

async function requireAuthentication(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    await request.jwtVerify();
  } catch {
    return reply.code(401).send({ error: "Autenticação necessária." });
  }
}

function getTrustedProxy(value = process.env.TRUST_PROXY): boolean | string[] {
  if (value === undefined || value === "" || value === "false") return false;
  if (value === "true") return true;

  const proxies = value
    .split(",")
    .map((proxy) => proxy.trim())
    .filter((proxy) => proxy.length > 0);
  if (proxies.length === 0) {
    throw new Error(
      "TRUST_PROXY precisa ser false, true ou uma lista de proxies.",
    );
  }
  return proxies;
}

export async function buildApp(options: AppOptions) {
  const jwtSecret = options.jwtSecret ?? process.env.JWT_SECRET;
  const inviteCode = options.inviteCode ?? process.env.INVITE_CODE;

  if (jwtSecret === undefined || Buffer.byteLength(jwtSecret) < 32) {
    throw new Error("JWT_SECRET precisa ter pelo menos 32 bytes.");
  }
  if (inviteCode === undefined || inviteCode.length < 24) {
    throw new Error("INVITE_CODE precisa ter pelo menos 24 caracteres.");
  }

  const app = Fastify({
    logger: options.logger ?? false,
    trustProxy: options.trustProxy ?? getTrustedProxy(),
  });
  const webOrigin =
    options.webOrigin ?? process.env.WEB_ORIGIN ?? "http://localhost:5173";
  const secureCookies = new URL(webOrigin).protocol === "https:";

  await app.register(cookie);
  await app.register(cors, {
    origin: (origin, callback) => callback(null, origin === webOrigin),
    methods: ["GET", "HEAD", "POST", "PATCH", "DELETE"],
    credentials: true,
  });
  await app.register(jwt, {
    secret: jwtSecret,
    sign: { expiresIn: "1h" },
  });
  await app.register(rateLimit, {
    global: true,
    max: 100,
    timeWindow: "1 minute",
  });

  const dummyPasswordHash = await hashPassword(
    randomBytes(32).toString("base64url"),
  );
  const sessionCookieOptions = {
    httpOnly: true,
    secure: secureCookies,
    sameSite: secureCookies ? ("none" as const) : ("lax" as const),
    partitioned: secureCookies,
    path: "/",
  };

  function setSessionCookie(
    reply: FastifyReply,
    user: { id: string; email: string },
  ) {
    const token = app.jwt.sign(
      { email: user.email, tokenUse: "session" },
      { sub: user.id, expiresIn: "30d" },
    );
    reply.setCookie(sessionCookieName, token, {
      ...sessionCookieOptions,
      maxAge: sessionCookieMaxAgeSeconds,
    });
  }

  function clearSessionCookie(reply: FastifyReply) {
    reply.clearCookie(sessionCookieName, {
      ...sessionCookieOptions,
      maxAge: 0,
    });
  }

  function createAuthResponse(user: { id: string; email: string }) {
    const accessToken = app.jwt.sign({ email: user.email }, { sub: user.id });
    return { accessToken, user: { id: user.id, email: user.email } };
  }

  async function requireTrustedOrigin(
    request: FastifyRequest,
    reply: FastifyReply,
  ) {
    const origin = request.headers.origin;
    if (origin && origin !== webOrigin) {
      return reply.code(403).send({ error: "Origem não autorizada." });
    }
  }

  app.get("/api/health", async () => ({ status: "ok" }));

  app.post<{ Body: RegisterBody }>(
    "/api/auth/register",
    {
      preHandler: requireTrustedOrigin,
      config: { rateLimit: { max: options.authRateLimitMax ?? 5 } },
      schema: {
        body: {
          ...credentialsSchema,
          required: ["email", "password", "inviteCode"],
          properties: {
            ...credentialsSchema.properties,
            inviteCode: { type: "string", minLength: 24, maxLength: 256 },
          },
        },
      },
    },
    async (request, reply) => {
      const email = normalizeEmail(request.body.email);
      if (!validEmail(email)) {
        return reply.code(400).send({ error: "Informe um e-mail válido." });
      }

      if (!safeEqual(request.body.inviteCode, inviteCode)) {
        return reply.code(403).send({ error: "Convite inválido." });
      }

      if (await options.userStore.findByEmail(email)) {
        return reply
          .code(409)
          .send({ error: "Não foi possível criar essa conta." });
      }

      try {
        const passwordHash = await hashPassword(request.body.password);
        const user = await options.userStore.create(email, passwordHash);
        setSessionCookie(reply, user);
        return reply.code(201).send(createAuthResponse(user));
      } catch (error) {
        if (
          typeof error === "object" &&
          error !== null &&
          "code" in error &&
          error.code === 11000
        ) {
          return reply
            .code(409)
            .send({ error: "Não foi possível criar essa conta." });
        }
        throw error;
      }
    },
  );

  app.post<{ Body: CredentialsBody }>(
    "/api/auth/login",
    {
      preHandler: requireTrustedOrigin,
      config: { rateLimit: { max: options.authRateLimitMax ?? 5 } },
      schema: { body: credentialsSchema },
    },
    async (request, reply) => {
      const email = normalizeEmail(request.body.email);
      if (!validEmail(email)) {
        return reply.code(401).send({ error: "E-mail ou senha incorretos." });
      }

      const user = await options.userStore.findByEmail(email);
      const passwordMatches = await verifyPassword(
        request.body.password,
        user?.passwordHash ?? dummyPasswordHash,
      );

      if (!user || !passwordMatches) {
        return reply.code(401).send({ error: "E-mail ou senha incorretos." });
      }

      setSessionCookie(reply, user);
      return createAuthResponse(user);
    },
  );

  app.post(
    "/api/auth/session",
    {
      preHandler: requireTrustedOrigin,
      config: { rateLimit: { max: options.authRateLimitMax ?? 30 } },
    },
    async (request, reply) => {
      const sessionToken = request.cookies[sessionCookieName];
      if (!sessionToken) {
        return reply.code(401).send({ error: "Sessão não encontrada." });
      }

      let payload: SessionTokenPayload;
      try {
        payload = app.jwt.verify<SessionTokenPayload>(sessionToken);
      } catch {
        clearSessionCookie(reply);
        return reply.code(401).send({ error: "Sessão expirada." });
      }

      if (payload.tokenUse !== "session" || !payload.sub || !payload.email) {
        clearSessionCookie(reply);
        return reply.code(401).send({ error: "Sessão inválida." });
      }
      const user = await options.userStore.findById(payload.sub);
      if (!user || user.email !== payload.email) {
        clearSessionCookie(reply);
        return reply.code(401).send({ error: "Sessão inválida." });
      }

      setSessionCookie(reply, user);
      return createAuthResponse(user);
    },
  );

  app.post(
    "/api/auth/logout",
    { preHandler: requireTrustedOrigin },
    async (_request, reply) => {
      clearSessionCookie(reply);
      return reply.code(204).send();
    },
  );

  app.get(
    "/api/auth/me",
    { preHandler: requireAuthentication },
    async (request, reply) => {
      const user = await options.userStore.findById(request.user.sub);
      if (!user || user.email !== request.user.email) {
        return reply.code(401).send({ error: "Sessão inválida." });
      }
      return { user: { id: user.id, email: user.email } };
    },
  );

  app.get(
    "/api/content",
    { preHandler: requireAuthentication },
    async (request) => options.contentStore.listContent(request.user.sub),
  );

  app.post(
    "/api/content/import-matrix",
    { preHandler: requireAuthentication },
    async (request, reply) => {
      const userId = request.user.sub;
      const content = await options.contentStore.listContent(userId);
      let subjectsCreated = 0;
      let topicsCreated = 0;
      let materialsCreated = 0;

      for (const seed of STUDY_MATRIX) {
        let subject = content.subjects.find(
          (item) => normalizeText(item.name) === normalizeText(seed.name),
        );
        if (!subject) {
          subject = await options.contentStore.createSubject(userId, {
            name: seed.name,
            description: seed.description,
          });
          content.subjects.push(subject);
          subjectsCreated++;
        }

        const existingTopics = content.topics.filter(
          (topic) => topic.subjectId === subject.id,
        );
        for (const seedTopic of seed.topics) {
          if (
            existingTopics.some(
              (topic) =>
                normalizeText(topic.name) === normalizeText(seedTopic.name),
            )
          ) {
            continue;
          }
          const topic = await options.contentStore.createTopic(
            userId,
            subject.id,
            {
              name: seedTopic.name,
              description: seedTopic.description,
              status: "not_started",
              estimatedMinutes: seedTopic.estimatedMinutes,
            },
          );
          if (topic) {
            existingTopics.push(topic);
            content.topics.push(topic);
            topicsCreated++;
          }
        }

        const existingMaterials = content.materials.filter(
          (material) => material.subjectId === subject.id,
        );
        for (const source of seed.sources) {
          if (
            existingMaterials.some(
              (material) =>
                material.topicId === null &&
                normalizeText(material.title) === normalizeText(source.title),
            )
          ) {
            continue;
          }
          const material = await options.contentStore.createMaterial(
            userId,
            subject.id,
            {
              topicId: null,
              title: source.title,
              type: source.type,
              url: source.url,
              text: source.text,
            },
          );
          if (material) {
            existingMaterials.push(material);
            content.materials.push(material);
            materialsCreated++;
          }
        }
      }

      return reply.code(200).send({
        subjectsCreated,
        topicsCreated,
        materialsCreated,
        subjectsInMatrix: STUDY_MATRIX.length,
        topicsInMatrix: STUDY_MATRIX.reduce(
          (total, subject) => total + subject.topics.length,
          0,
        ),
      });
    },
  );

  app.get(
    "/api/planning/preferences",
    { preHandler: requireAuthentication },
    async (request) => options.planningStore.getPreferences(request.user.sub),
  );

  app.patch<{ Body: PreferencesBody }>(
    "/api/planning/preferences",
    {
      preHandler: requireAuthentication,
      schema: {
        body: {
          type: "object",
          additionalProperties: false,
          required: ["studyDays", "minutesPerDay", "targetDate"],
          properties: {
            studyDays: {
              type: "array",
              uniqueItems: true,
              items: { type: "integer", enum: weekdays },
            },
            minutesPerDay: { type: "integer", minimum: 15, maximum: 480 },
            targetDate: {
              anyOf: [{ type: "null" }, { type: "string", format: "date" }],
            },
          },
        },
      },
    },
    async (request, reply) => {
      const preferences: StudyPreferences = {
        studyDays: [...request.body.studyDays].sort((a, b) => a - b),
        minutesPerDay: request.body.minutesPerDay,
        targetDate: request.body.targetDate,
      };
      if (
        preferences.targetDate !== null &&
        !validDateString(preferences.targetDate)
      ) {
        return reply.code(400).send({
          error: "Informe uma data-alvo válida no formato AAAA-MM-DD.",
        });
      }
      return options.planningStore.savePreferences(
        request.user.sub,
        preferences,
      );
    },
  );

  app.get(
    "/api/planning",
    { preHandler: requireAuthentication },
    async (request) => {
      const userId = request.user.sub;
      const [content, preferences] = await Promise.all([
        options.contentStore.listContent(userId),
        options.planningStore.getPreferences(userId),
      ]);
      const now = new Date();
      for (const topic of content.topics) {
        if (
          topic.status === "studied" &&
          topic.reviewDueAt !== null &&
          topic.reviewDueAt <= now
        ) {
          const updated = await options.contentStore.updateTopic(
            userId,
            topic.id,
            { status: "review_pending" },
          );
          if (updated) Object.assign(topic, updated);
        }
      }
      const weekStart = startOfWeek(now);
      const weekEnd = new Date(
        Date.parse(`${weekStart}T00:00:00.000Z`) + 6 * 24 * 60 * 60 * 1000,
      )
        .toISOString()
        .slice(0, 10);
      const [sessions, overrides] = await Promise.all([
        options.planningStore.listSessions(userId, weekStart, weekEnd),
        options.planningStore.listPlanOverrides(userId, weekStart),
      ]);
      const plan = generateWeeklyPlan(
        content,
        preferences,
        sessions,
        overrides,
        now,
      );
      return { preferences, plan, sessions };
    },
  );

  app.patch<{ Params: { topicId: string }; Body: PlanItemBody }>(
    "/api/planning/items/:topicId",
    {
      preHandler: requireAuthentication,
      schema: {
        params: topicParamsSchema,
        body: {
          type: "object",
          additionalProperties: false,
          required: ["plannedDate"],
          properties: { plannedDate: { type: "string", format: "date" } },
        },
      },
    },
    async (request, reply) => {
      const userId = request.user.sub;
      const topic = await options.contentStore.updateTopic(
        userId,
        request.params.topicId,
        {},
      );
      if (!topic || topic.status === "studied") {
        return reply.code(404).send({
          error: "Tópico ativo não encontrado para ajustar o plano.",
        });
      }
      const preferences = await options.planningStore.getPreferences(userId);
      const weekStart = startOfWeek(new Date());
      const weekEnd = new Date(
        Date.parse(`${weekStart}T00:00:00.000Z`) + 6 * 24 * 60 * 60 * 1000,
      )
        .toISOString()
        .slice(0, 10);
      const weekday =
        (new Date(`${request.body.plannedDate}T00:00:00.000Z`).getUTCDay() +
          6) %
        7;
      if (
        !validDateString(request.body.plannedDate) ||
        request.body.plannedDate < weekStart ||
        request.body.plannedDate > weekEnd ||
        !preferences.studyDays.includes(weekday) ||
        request.body.plannedDate < new Date().toISOString().slice(0, 10)
      ) {
        return reply.code(400).send({
          error:
            "Escolha um dia disponível, de hoje até o fim da semana atual.",
        });
      }
      return options.planningStore.savePlanOverride(
        userId,
        topic.id,
        weekStart,
        request.body.plannedDate,
      );
    },
  );

  app.delete<{ Params: { topicId: string } }>(
    "/api/planning/items/:topicId",
    {
      preHandler: requireAuthentication,
      schema: { params: topicParamsSchema },
    },
    async (request, reply) => {
      const weekStart = startOfWeek(new Date());
      const deleted = await options.planningStore.deletePlanOverride(
        request.user.sub,
        request.params.topicId,
        weekStart,
      );
      if (!deleted) {
        return reply.code(404).send({ error: "Ajuste manual não encontrado." });
      }
      return { deleted: true };
    },
  );

  app.post<{ Params: { topicId: string }; Body: SessionBody }>(
    "/api/topics/:topicId/sessions",
    {
      preHandler: requireAuthentication,
      schema: {
        params: topicParamsSchema,
        body: {
          type: "object",
          additionalProperties: false,
          required: ["kind", "durationMinutes"],
          properties: {
            kind: { type: "string", enum: ["study", "review"] },
            date: { type: "string", format: "date" },
            durationMinutes: { type: "integer", minimum: 1, maximum: 720 },
            notes: { type: "string", maxLength: 2000 },
          },
        },
      },
    },
    async (request, reply) => {
      const userId = request.user.sub;
      const topic = await options.contentStore.updateTopic(
        userId,
        request.params.topicId,
        {},
      );
      if (!topic) {
        return reply.code(404).send({ error: "Tópico não encontrado." });
      }
      const sessionDate =
        request.body.date ?? new Date().toISOString().slice(0, 10);
      if (
        !validDateString(sessionDate) ||
        sessionDate > new Date().toISOString().slice(0, 10)
      ) {
        return reply.code(400).send({
          error:
            "A data da sessão precisa ser válida e não pode estar no futuro.",
        });
      }
      const session = await options.planningStore.createSession(userId, {
        topicId: topic.id,
        date: sessionDate,
        durationMinutes: request.body.durationMinutes,
        notes: request.body.notes?.trim() ?? "",
        kind: request.body.kind,
      });
      const updatedTopic = await options.contentStore.updateTopic(
        userId,
        topic.id,
        request.body.kind === "review"
          ? {
              status: "studied",
              reviewDueAt: nextReviewDate(),
            }
          : topic.status === "studied"
            ? {}
            : { status: "in_progress" },
      );
      return reply.code(201).send({ session, topic: updatedTopic });
    },
  );

  app.post<{ Body: SubjectBody }>(
    "/api/subjects",
    {
      preHandler: requireAuthentication,
      schema: {
        body: {
          type: "object",
          additionalProperties: false,
          required: ["name"],
          properties: {
            name: { type: "string", minLength: 1, maxLength: 120 },
            description: { type: "string", maxLength: 2000 },
          },
        },
      },
    },
    async (request, reply) => {
      const name = request.body.name.trim();
      if (!name) {
        return reply.code(400).send({ error: "Informe o nome da disciplina." });
      }
      const subject = await options.contentStore.createSubject(
        request.user.sub,
        {
          name,
          description: request.body.description?.trim() ?? "",
        },
      );
      return reply.code(201).send(subject);
    },
  );

  app.patch<{ Params: { subjectId: string }; Body: SubjectUpdateBody }>(
    "/api/subjects/:subjectId",
    {
      preHandler: requireAuthentication,
      schema: {
        params: subjectParamsSchema,
        body: {
          type: "object",
          additionalProperties: false,
          minProperties: 1,
          properties: {
            name: { type: "string", minLength: 1, maxLength: 120 },
            description: { type: "string", maxLength: 2000 },
            archived: { type: "boolean" },
            notes: { type: "string", maxLength: 20_000 },
          },
        },
      },
    },
    async (request, reply) => {
      const input: Parameters<ContentStore["updateSubject"]>[2] = {
        ...request.body,
      };
      if (input.name !== undefined) {
        input.name = input.name.trim();
        if (!input.name) {
          return reply
            .code(400)
            .send({ error: "Informe o nome da disciplina." });
        }
      }
      if (input.description !== undefined) {
        input.description = input.description.trim();
      }
      const subject = await options.contentStore.updateSubject(
        request.user.sub,
        request.params.subjectId,
        input,
      );
      if (!subject) {
        return reply.code(404).send({ error: "Disciplina não encontrada." });
      }
      return subject;
    },
  );

  app.delete<{ Params: { subjectId: string } }>(
    "/api/subjects/:subjectId",
    {
      preHandler: requireAuthentication,
      schema: { params: subjectParamsSchema },
    },
    async (request, reply) => {
      const result = await options.contentStore.deleteSubject(
        request.user.sub,
        request.params.subjectId,
      );
      if (!result) {
        return reply.code(404).send({ error: "Disciplina não encontrada." });
      }
      return { deleted: true, ...result };
    },
  );

  app.post<{ Params: { subjectId: string }; Body: TopicBody }>(
    "/api/subjects/:subjectId/topics",
    {
      preHandler: requireAuthentication,
      schema: {
        params: subjectParamsSchema,
        body: {
          type: "object",
          additionalProperties: false,
          required: ["name"],
          properties: {
            name: { type: "string", minLength: 1, maxLength: 160 },
            description: { type: "string", maxLength: 4000 },
            status: { type: "string", enum: studyStatuses },
            estimatedMinutes: {
              anyOf: [
                { type: "null" },
                { type: "integer", minimum: 1, maximum: 480 },
              ],
            },
          },
        },
      },
    },
    async (request, reply) => {
      const name = request.body.name.trim();
      if (!name) {
        return reply.code(400).send({ error: "Informe o nome do tópico." });
      }
      const input: TopicInput = {
        name,
        description: request.body.description?.trim() ?? "",
        status: request.body.status ?? "not_started",
        estimatedMinutes: request.body.estimatedMinutes ?? null,
      };
      const topic = await options.contentStore.createTopic(
        request.user.sub,
        request.params.subjectId,
        input,
      );
      if (!topic) {
        return reply.code(404).send({
          error: "Disciplina não encontrada ou arquivada.",
        });
      }
      return reply.code(201).send(topic);
    },
  );

  app.patch<{ Params: { topicId: string }; Body: TopicUpdateBody }>(
    "/api/topics/:topicId",
    {
      preHandler: requireAuthentication,
      schema: {
        params: topicParamsSchema,
        body: {
          type: "object",
          additionalProperties: false,
          minProperties: 1,
          properties: {
            name: { type: "string", minLength: 1, maxLength: 160 },
            description: { type: "string", maxLength: 4000 },
            status: { type: "string", enum: studyStatuses },
            position: { type: "integer", minimum: 0, maximum: 999_999 },
            notes: { type: "string", maxLength: 20_000 },
            estimatedMinutes: {
              anyOf: [
                { type: "null" },
                { type: "integer", minimum: 1, maximum: 480 },
              ],
            },
          },
        },
      },
    },
    async (request, reply) => {
      const input: Parameters<ContentStore["updateTopic"]>[2] = {
        ...request.body,
      };
      if (input.name !== undefined) {
        input.name = input.name.trim();
        if (!input.name) {
          return reply.code(400).send({ error: "Informe o nome do tópico." });
        }
      }
      if (input.description !== undefined) {
        input.description = input.description.trim();
      }
      if (input.status === "studied") {
        input.reviewDueAt = nextReviewDate();
      } else if (input.status === "review_pending") {
        input.reviewDueAt = new Date();
      } else if (input.status !== undefined) {
        input.reviewDueAt = null;
      }
      const topic = await options.contentStore.updateTopic(
        request.user.sub,
        request.params.topicId,
        input,
      );
      if (!topic) {
        return reply.code(404).send({ error: "Tópico não encontrado." });
      }
      return topic;
    },
  );

  app.delete<{ Params: { topicId: string } }>(
    "/api/topics/:topicId",
    {
      preHandler: requireAuthentication,
      schema: { params: topicParamsSchema },
    },
    async (request, reply) => {
      const result = await options.contentStore.deleteTopic(
        request.user.sub,
        request.params.topicId,
      );
      if (!result) {
        return reply.code(404).send({ error: "Tópico não encontrado." });
      }
      return { deleted: true, ...result };
    },
  );

  app.post<{ Params: { subjectId: string }; Body: MaterialBody }>(
    "/api/subjects/:subjectId/materials",
    {
      preHandler: requireAuthentication,
      schema: {
        params: subjectParamsSchema,
        body: materialBodySchema(),
      },
    },
    async (request, reply) => {
      const input = materialInput(request.body);
      const validationError = validateMaterial(input);
      if (validationError)
        return reply.code(400).send({ error: validationError });

      const material = await options.contentStore.createMaterial(
        request.user.sub,
        request.params.subjectId,
        input,
      );
      if (!material) {
        return reply.code(404).send({
          error: "Disciplina ou tópico não encontrado.",
        });
      }
      return reply.code(201).send(material);
    },
  );

  app.patch<{ Params: { materialId: string }; Body: MaterialBody }>(
    "/api/materials/:materialId",
    {
      preHandler: requireAuthentication,
      schema: {
        params: materialParamsSchema,
        body: materialBodySchema(),
      },
    },
    async (request, reply) => {
      const input = materialInput(request.body);
      const validationError = validateMaterial(input);
      if (validationError)
        return reply.code(400).send({ error: validationError });

      const material = await options.contentStore.updateMaterial(
        request.user.sub,
        request.params.materialId,
        input,
      );
      if (!material) {
        return reply.code(404).send({
          error: "Material ou tópico associado não encontrado.",
        });
      }
      return material;
    },
  );

  app.delete<{ Params: { materialId: string } }>(
    "/api/materials/:materialId",
    {
      preHandler: requireAuthentication,
      schema: { params: materialParamsSchema },
    },
    async (request, reply) => {
      const deleted = await options.contentStore.deleteMaterial(
        request.user.sub,
        request.params.materialId,
      );
      if (!deleted) {
        return reply.code(404).send({ error: "Material não encontrado." });
      }
      return { deleted: true };
    },
  );

  return app;
}

function materialBodySchema() {
  return {
    type: "object",
    additionalProperties: false,
    required: ["title", "type"],
    properties: {
      topicId: { type: ["string", "null"], maxLength: 64 },
      title: { type: "string", minLength: 1, maxLength: 200 },
      type: { type: "string", enum: materialTypes },
      url: { type: "string", maxLength: 2048 },
      text: { type: "string", maxLength: 20_000 },
    },
  } as const;
}

function materialInput(body: MaterialBody): MaterialInput {
  return {
    topicId: body.topicId ?? null,
    title: body.title.trim(),
    type: body.type,
    url: body.url?.trim() ?? "",
    text: body.text?.trim() ?? "",
  };
}

function validateMaterial(input: MaterialInput): string | null {
  if (!input.title) return "Informe o título do material.";
  if (!input.url && !input.text) {
    return "Informe um link ou um texto para o material.";
  }
  if (input.url && !validHttpUrl(input.url)) {
    return "O link precisa ser um endereço HTTP ou HTTPS válido.";
  }
  return null;
}
