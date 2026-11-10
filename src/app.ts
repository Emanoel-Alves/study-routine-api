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
import {
  UFC_GOVERNANCE_QUESTIONS,
  UFC_GOVERNANCE_QUESTION_SOURCE,
} from "./ufc-governance-questions.ts";
import type {
  QuestionSource,
  QuestionStatus,
  QuestionStore,
  StudyQuestionInput,
} from "./questions.ts";
import { validQuestionStatuses } from "./questions.ts";
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
  questionStore: QuestionStore;
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
  durationMinutes?: number;
  durationSeconds?: number;
  notes?: string;
}

type BulkSessionDeletionBody = { all: true } | { sessionIds: string[] };

interface PlanItemBody {
  plannedDate: string;
}

interface StudyPlanBody {
  name: string;
  topicIds?: string[];
}

interface TopicSelectionBody {
  topicIds: string[];
}

interface QuestionBody {
  topicId: string;
  statement: string;
  options: string[];
  correctOption: number;
  explanation?: string;
  source: QuestionSource;
  status?: QuestionStatus;
  statusNote?: string;
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

const questionParamsSchema = {
  type: "object",
  required: ["questionId"],
  additionalProperties: false,
  properties: { questionId: { type: "string", minLength: 1, maxLength: 64 } },
} as const;

const studyPlanParamsSchema = {
  type: "object",
  required: ["planId"],
  additionalProperties: false,
  properties: { planId: { type: "string", minLength: 1, maxLength: 64 } },
} as const;

const sessionParamsSchema = {
  type: "object",
  required: ["sessionId"],
  additionalProperties: false,
  properties: { sessionId: { type: "string", pattern: "^[a-fA-F0-9]{24}$" } },
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

  app.get(
    "/api/questions",
    { preHandler: requireAuthentication },
    async (request) => options.questionStore.listQuestions(request.user.sub),
  );

  app.post(
    "/api/questions/import-ufc-governance",
    { preHandler: requireAuthentication },
    async (request, reply) => {
      const userId = request.user.sub;
      const [content, existingQuestions] = await Promise.all([
        options.contentStore.listContent(userId),
        options.questionStore.listQuestions(userId),
      ]);
      const activeSubjectIds = new Set(
        content.subjects
          .filter((subject) => !subject.archived)
          .map((subject) => subject.id),
      );
      const activeTopics = content.topics.filter((topic) =>
        activeSubjectIds.has(topic.subjectId),
      );
      const topicByName = new Map(
        activeTopics.map((topic) => [normalizeText(topic.name), topic]),
      );
      const missingTopics = [
        ...new Set(
          UFC_GOVERNANCE_QUESTIONS.filter(
            (question) => !topicByName.has(normalizeText(question.topicName)),
          ).map((question) => question.topicName),
        ),
      ];
      if (missingTopics.length > 0) {
        return reply.code(409).send({
          error:
            "Importe a matriz de estudos antes de adicionar este conjunto de questões.",
          missingTopics,
        });
      }

      const existingKeys = new Set(
        existingQuestions
          .filter(
            (question) =>
              question.source.name === UFC_GOVERNANCE_QUESTION_SOURCE,
          )
          .map((question) => question.source.number),
      );
      let createdCount = 0;
      let existingCount = 0;
      for (const seed of UFC_GOVERNANCE_QUESTIONS) {
        if (existingKeys.has(seed.source.number)) {
          existingCount++;
          continue;
        }
        const topic = topicByName.get(normalizeText(seed.topicName));
        if (!topic) {
          throw new Error(
            `O tópico "${seed.topicName}" desapareceu durante a importação.`,
          );
        }
        await options.questionStore.createQuestion(userId, topic.subjectId, {
          topicId: topic.id,
          statement: seed.statement,
          options: seed.options,
          correctOption: seed.correctOption,
          explanation: seed.explanation,
          source: seed.source,
          status: seed.status,
          statusNote: seed.statusNote,
        });
        createdCount++;
      }
      return {
        createdCount,
        existingCount,
        totalCount: UFC_GOVERNANCE_QUESTIONS.length,
      };
    },
  );

  app.post<{ Body: QuestionBody }>(
    "/api/questions",
    {
      preHandler: requireAuthentication,
      schema: { body: questionBodySchema() },
    },
    async (request, reply) => {
      const input = questionInput(request.body);
      const validationError = validateQuestion(input);
      if (validationError) {
        return reply.code(400).send({ error: validationError });
      }

      const content = await options.contentStore.listContent(request.user.sub);
      const topic = content.topics.find((item) => item.id === input.topicId);
      if (!topic) {
        return reply.code(404).send({
          error: "O tópico informado não pertence à sua conta.",
        });
      }

      const question = await options.questionStore.createQuestion(
        request.user.sub,
        topic.subjectId,
        input,
      );
      return reply.code(201).send(question);
    },
  );

  app.patch<{ Params: { questionId: string }; Body: QuestionBody }>(
    "/api/questions/:questionId",
    {
      preHandler: requireAuthentication,
      schema: {
        params: questionParamsSchema,
        body: questionBodySchema(),
      },
    },
    async (request, reply) => {
      const input = questionInput(request.body);
      const validationError = validateQuestion(input);
      if (validationError) {
        return reply.code(400).send({ error: validationError });
      }

      const content = await options.contentStore.listContent(request.user.sub);
      const topic = content.topics.find((item) => item.id === input.topicId);
      if (!topic) {
        return reply.code(404).send({
          error: "O tópico informado não pertence à sua conta.",
        });
      }

      const question = await options.questionStore.updateQuestion(
        request.user.sub,
        request.params.questionId,
        topic.subjectId,
        input,
      );
      if (!question) {
        return reply.code(404).send({ error: "Questão não encontrada." });
      }
      return question;
    },
  );

  app.delete<{ Params: { questionId: string } }>(
    "/api/questions/:questionId",
    {
      preHandler: requireAuthentication,
      schema: { params: questionParamsSchema },
    },
    async (request, reply) => {
      const deleted = await options.questionStore.deleteQuestion(
        request.user.sub,
        request.params.questionId,
      );
      if (!deleted) {
        return reply.code(404).send({ error: "Questão não encontrada." });
      }
      return { deleted: true };
    },
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
    "/api/planning/plans",
    { preHandler: requireAuthentication },
    async (request) => {
      const plans = await options.planningStore.listPlans(request.user.sub);
      return {
        plans,
        activePlanId:
          plans.find((plan) => plan.active)?.id ?? plans[0]?.id ?? null,
      };
    },
  );

  app.post<{ Body: StudyPlanBody }>(
    "/api/planning/plans",
    {
      preHandler: requireAuthentication,
      schema: {
        body: {
          type: "object",
          additionalProperties: false,
          required: ["name"],
          properties: {
            name: { type: "string", minLength: 1, maxLength: 80 },
            topicIds: {
              type: "array",
              uniqueItems: true,
              maxItems: 1000,
              items: { type: "string", minLength: 1, maxLength: 64 },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const name = request.body.name.trim();
      if (!name) {
        return reply.code(400).send({ error: "Informe um nome para o plano." });
      }
      if (name.length > 80) {
        return reply.code(400).send({
          error: "O nome do planejamento deve ter até 80 caracteres.",
        });
      }
      const topicIds = request.body.topicIds ?? [];
      if (topicIds.length > 0) {
        const content = await options.contentStore.listContent(
          request.user.sub,
        );
        const activeSubjectIds = new Set(
          content.subjects
            .filter((subject) => !subject.archived)
            .map((subject) => subject.id),
        );
        const availableTopicIds = new Set(
          content.topics
            .filter((topic) => activeSubjectIds.has(topic.subjectId))
            .map((topic) => topic.id),
        );
        if (topicIds.some((id) => !availableTopicIds.has(id))) {
          return reply.code(400).send({
            error: "Um ou mais tópicos selecionados não estão disponíveis.",
          });
        }
      }
      const plan = await options.planningStore.createPlan(
        request.user.sub,
        name,
        topicIds,
      );
      return reply.code(201).send(plan);
    },
  );

  app.patch<{ Params: { planId: string } }>(
    "/api/planning/plans/:planId/activate",
    {
      preHandler: requireAuthentication,
      schema: { params: studyPlanParamsSchema },
    },
    async (request, reply) => {
      const plan = await options.planningStore.activatePlan(
        request.user.sub,
        request.params.planId,
      );
      if (!plan) {
        return reply.code(404).send({ error: "Planejamento não encontrado." });
      }
      return plan;
    },
  );

  app.delete<{ Params: { planId: string } }>(
    "/api/planning/plans/:planId",
    {
      preHandler: requireAuthentication,
      schema: { params: studyPlanParamsSchema },
    },
    async (request, reply) => {
      const result = await options.planningStore.deletePlan(
        request.user.sub,
        request.params.planId,
      );
      if (result === "not_found") {
        return reply.code(404).send({ error: "Planejamento não encontrado." });
      }
      if (result === "default_plan") {
        return reply.code(409).send({
          error: "O planejamento padrão não pode ser removido.",
        });
      }
      if (result === "last_plan") {
        return reply.code(409).send({
          error: "Não é possível remover o único planejamento da conta.",
        });
      }
      return { deleted: true };
    },
  );

  app.get(
    "/api/planning/preferences",
    { preHandler: requireAuthentication },
    async (request) => {
      const activePlan = await options.planningStore.getActivePlan(
        request.user.sub,
      );
      return activePlan.preferences;
    },
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
      const activePlan = await options.planningStore.getActivePlan(
        request.user.sub,
      );
      return options.planningStore.savePreferences(
        request.user.sub,
        activePlan.id,
        preferences,
      );
    },
  );

  app.patch<{ Body: TopicSelectionBody }>(
    "/api/planning/topics",
    {
      preHandler: requireAuthentication,
      schema: {
        body: {
          type: "object",
          additionalProperties: false,
          required: ["topicIds"],
          properties: {
            topicIds: {
              type: "array",
              uniqueItems: true,
              maxItems: 1000,
              items: { type: "string", minLength: 1, maxLength: 64 },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const userId = request.user.sub;
      const [activePlan, content] = await Promise.all([
        options.planningStore.getActivePlan(userId),
        options.contentStore.listContent(userId),
      ]);
      const activeSubjectIds = new Set(
        content.subjects
          .filter((subject) => !subject.archived)
          .map((subject) => subject.id),
      );
      const availableTopicIds = new Set(
        content.topics
          .filter((topic) => activeSubjectIds.has(topic.subjectId))
          .map((topic) => topic.id),
      );
      if (request.body.topicIds.some((id) => !availableTopicIds.has(id))) {
        return reply.code(400).send({
          error: "Um ou mais tópicos selecionados não estão disponíveis.",
        });
      }
      const topicIds = [...request.body.topicIds].sort();
      const selectedTopicIds = await options.planningStore.saveSelectedTopics(
        userId,
        activePlan.id,
        topicIds,
      );
      return { selectedTopicIds };
    },
  );

  app.get(
    "/api/planning",
    { preHandler: requireAuthentication },
    async (request) => {
      const userId = request.user.sub;
      const [content, plans] = await Promise.all([
        options.contentStore.listContent(userId),
        options.planningStore.listPlans(userId),
      ]);
      const activePlan = plans.find((plan) => plan.active) ?? plans[0];
      if (!activePlan) {
        throw new Error("Não foi possível carregar o planejamento ativo.");
      }
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
        options.planningStore.listSessions(
          userId,
          activePlan.id,
          weekStart,
          weekEnd,
        ),
        options.planningStore.listPlanOverrides(
          userId,
          activePlan.id,
          weekStart,
        ),
      ]);
      const selectedTopicIds =
        activePlan.selectedTopicIds === null
          ? null
          : new Set(activePlan.selectedTopicIds);
      const planContent =
        selectedTopicIds === null
          ? content
          : {
              ...content,
              topics: content.topics.filter((topic) =>
                selectedTopicIds.has(topic.id),
              ),
            };
      const plan = generateWeeklyPlan(
        planContent,
        activePlan.preferences,
        sessions,
        overrides,
        now,
      );
      return {
        plans: plans.map(({ id, name, active, createdAt }) => ({
          id,
          name,
          active,
          createdAt,
        })),
        activePlan: {
          id: activePlan.id,
          name: activePlan.name,
          selectedTopicIds: activePlan.selectedTopicIds,
        },
        preferences: activePlan.preferences,
        plan,
        sessions,
      };
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
      const activePlan = await options.planningStore.getActivePlan(userId);
      const preferences = activePlan.preferences;
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
        activePlan.id,
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
      const activePlan = await options.planningStore.getActivePlan(
        request.user.sub,
      );
      const deleted = await options.planningStore.deletePlanOverride(
        request.user.sub,
        activePlan.id,
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
          required: ["kind"],
          oneOf: [
            {
              required: ["durationMinutes"],
              not: { required: ["durationSeconds"] },
            },
            {
              required: ["durationSeconds"],
              not: { required: ["durationMinutes"] },
            },
          ],
          properties: {
            kind: { type: "string", enum: ["study", "review"] },
            date: { type: "string", format: "date" },
            durationMinutes: { type: "integer", minimum: 1, maximum: 720 },
            durationSeconds: { type: "integer", minimum: 1, maximum: 43_200 },
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
      const activePlan = await options.planningStore.getActivePlan(userId);
      const session = await options.planningStore.createSession(userId, {
        planId: activePlan.id,
        topicId: topic.id,
        date: sessionDate,
        durationMinutes:
          request.body.durationMinutes ??
          Math.floor((request.body.durationSeconds ?? 0) / 60),
        durationSeconds:
          request.body.durationSeconds ??
          (request.body.durationMinutes ?? 0) * 60,
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

  app.delete<{ Params: { sessionId: string } }>(
    "/api/planning/sessions/:sessionId",
    {
      preHandler: requireAuthentication,
      schema: { params: sessionParamsSchema },
    },
    async (request, reply) => {
      const userId = request.user.sub;
      const activePlan = await options.planningStore.getActivePlan(userId);
      const deleted = await options.planningStore.deleteSession(
        userId,
        activePlan.id,
        request.params.sessionId,
      );
      if (!deleted) {
        return reply.code(404).send({
          error: "Sessão não encontrada neste planejamento.",
        });
      }
      return { deleted: true };
    },
  );

  app.delete<{ Body: BulkSessionDeletionBody }>(
    "/api/planning/sessions",
    {
      preHandler: requireAuthentication,
      schema: {
        body: {
          oneOf: [
            {
              type: "object",
              required: ["all"],
              additionalProperties: false,
              properties: { all: { const: true } },
            },
            {
              type: "object",
              required: ["sessionIds"],
              additionalProperties: false,
              properties: {
                sessionIds: {
                  type: "array",
                  minItems: 1,
                  maxItems: 500,
                  uniqueItems: true,
                  items: {
                    type: "string",
                    pattern: "^[a-fA-F0-9]{24}$",
                  },
                },
              },
            },
          ],
        },
      },
    },
    async (request) => {
      const userId = request.user.sub;
      const activePlan = await options.planningStore.getActivePlan(userId);
      const weekStart = startOfWeek(new Date());
      const weekEnd = new Date(
        Date.parse(`${weekStart}T00:00:00.000Z`) + 6 * 24 * 60 * 60 * 1000,
      )
        .toISOString()
        .slice(0, 10);
      const deletedCount = await options.planningStore.deleteSessions(
        userId,
        activePlan.id,
        weekStart,
        weekEnd,
        "sessionIds" in request.body ? request.body.sessionIds : undefined,
      );
      return { deletedCount };
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
      await options.questionStore.deleteBySubject(
        request.user.sub,
        request.params.subjectId,
      );
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
      await options.questionStore.deleteByTopic(
        request.user.sub,
        request.params.topicId,
      );
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

function questionBodySchema() {
  return {
    type: "object",
    additionalProperties: false,
    required: ["topicId", "statement", "options", "correctOption", "source"],
    properties: {
      topicId: { type: "string", minLength: 1, maxLength: 64 },
      statement: { type: "string", minLength: 1, maxLength: 20_000 },
      options: {
        type: "array",
        minItems: 2,
        maxItems: 6,
        items: { type: "string", minLength: 1, maxLength: 2000 },
      },
      correctOption: { type: "integer", minimum: 0, maximum: 5 },
      explanation: { type: "string", maxLength: 10_000 },
      source: {
        type: "object",
        additionalProperties: false,
        required: ["name", "url"],
        properties: {
          name: { type: "string", minLength: 1, maxLength: 120 },
          url: { type: "string", minLength: 1, maxLength: 2048 },
          exam: { type: "string", maxLength: 200 },
          board: { type: "string", maxLength: 120 },
          role: { type: "string", maxLength: 160 },
          year: {
            anyOf: [
              { type: "null" },
              { type: "integer", minimum: 1900, maximum: 2200 },
            ],
          },
          number: { type: "string", maxLength: 32 },
        },
      },
      status: { type: "string", enum: validQuestionStatuses },
      statusNote: { type: "string", maxLength: 1000 },
    },
  } as const;
}

function questionInput(body: QuestionBody): StudyQuestionInput {
  return {
    topicId: body.topicId.trim(),
    statement: body.statement.trim(),
    options: body.options.map((option) => option.trim()),
    correctOption: body.correctOption,
    explanation: body.explanation?.trim() ?? "",
    source: {
      name: body.source.name.trim(),
      url: body.source.url.trim(),
      exam: body.source.exam?.trim() ?? "",
      board: body.source.board?.trim() ?? "",
      role: body.source.role?.trim() ?? "",
      year: body.source.year ?? null,
      number: body.source.number?.trim() ?? "",
    },
    status: body.status ?? "active",
    statusNote: body.statusNote?.trim() ?? "",
  };
}

function validateQuestion(input: StudyQuestionInput): string | null {
  if (!input.statement) return "Informe o enunciado da questão.";
  if (
    input.options.length < 2 ||
    input.options.some((option) => option.length === 0)
  ) {
    return "Informe pelo menos duas alternativas e preencha todas.";
  }
  if (
    new Set(input.options.map((option) => normalizeText(option))).size !==
    input.options.length
  ) {
    return "As alternativas não podem ser repetidas.";
  }
  if (
    !Number.isInteger(input.correctOption) ||
    input.correctOption < 0 ||
    input.correctOption >= input.options.length
  ) {
    return "Selecione uma alternativa correta válida.";
  }
  if (!input.source.name) return "Informe a fonte da questão.";
  if (!validHttpUrl(input.source.url)) {
    return "A fonte precisa de um endereço HTTP ou HTTPS válido.";
  }
  if (!validQuestionStatuses.includes(input.status)) {
    return "Selecione uma situação válida para a questão.";
  }
  return null;
}
