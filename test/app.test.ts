import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { buildApp } from "../src/app.ts";
import { MemoryContentStore } from "./memory-content-store.ts";
import { MemoryPlanningStore } from "./memory-planning-store.ts";
import { MemoryQuestionStore } from "./memory-question-store.ts";
import type { User, UserStore } from "../src/users.ts";

const webOrigin = "http://localhost:5173";
const inviteCode = "invite-code-for-tests-is-long-enough";

class MemoryUserStore implements UserStore {
  private readonly users = new Map<string, User>();

  async findByEmail(email: string): Promise<User | null> {
    return (
      [...this.users.values()].find((user) => user.email === email) ?? null
    );
  }

  async findById(id: string): Promise<User | null> {
    return this.users.get(id) ?? null;
  }

  async create(email: string, passwordHash: string): Promise<User> {
    if (await this.findByEmail(email)) {
      throw Object.assign(new Error("Duplicate email"), { code: 11000 });
    }
    const user = {
      id: `user-${this.users.size + 1}`,
      email,
      passwordHash,
      createdAt: new Date(),
    };
    this.users.set(user.id, user);
    return user;
  }
}

const users = new MemoryUserStore();
const content = new MemoryContentStore();
const planning = new MemoryPlanningStore();
const questionStore = new MemoryQuestionStore();
const app = await buildApp({
  webOrigin,
  jwtSecret: "a-test-secret-that-is-long-enough-for-hs256",
  inviteCode,
  authRateLimitMax: 20,
  userStore: users,
  contentStore: content,
  planningStore: planning,
  questionStore,
});
const contentApp = await buildApp({
  webOrigin,
  jwtSecret: "a-test-secret-that-is-long-enough-for-hs256",
  inviteCode,
  authRateLimitMax: 20,
  userStore: users,
  contentStore: content,
  planningStore: planning,
  questionStore,
});

describe("API fundamentals", () => {
  before(async () => {
    await app.ready();
  });

  after(async () => {
    await app.close();
  });

  it("returns the API health status", async () => {
    const response = await app.inject({ method: "GET", url: "/api/health" });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), { status: "ok" });
  });

  it("allows requests from the configured frontend origin", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/health",
      headers: { origin: webOrigin },
    });

    assert.equal(response.headers["access-control-allow-origin"], webOrigin);
    assert.equal(response.headers["access-control-allow-credentials"], "true");
  });

  it("allows authenticated PATCH requests from the configured frontend", async () => {
    const response = await app.inject({
      method: "OPTIONS",
      url: "/api/planning/preferences",
      headers: {
        origin: webOrigin,
        "access-control-request-method": "PATCH",
        "access-control-request-headers": "authorization,content-type",
      },
    });

    assert.equal(response.statusCode, 204);
    assert.equal(response.headers["access-control-allow-origin"], webOrigin);
    assert.equal(response.headers["access-control-allow-credentials"], "true");
    assert.match(
      response.headers["access-control-allow-methods"] ?? "",
      /\bPATCH\b/,
    );
    assert.match(
      response.headers["access-control-allow-headers"] ?? "",
      /authorization/i,
    );
  });

  it("does not allow requests from an unconfigured origin", async () => {
    const untrustedOrigin = "https://untrusted.example";
    const response = await app.inject({
      method: "GET",
      url: "/api/health",
      headers: { origin: untrustedOrigin },
    });

    assert.equal(response.headers["access-control-allow-origin"], undefined);

    const forgedLogout = await app.inject({
      method: "POST",
      url: "/api/auth/logout",
      headers: { origin: untrustedOrigin },
    });
    assert.equal(forgedLogout.statusCode, 403);
  });

  it("requires authentication to access the current user", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/auth/me",
    });

    assert.equal(response.statusCode, 401);
  });

  it("rejects account creation without the private invite code", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/auth/register",
      payload: {
        email: "student@example.com",
        password: "a-very-long-password",
        inviteCode: "incorrect-invite-code-is-long-enough",
      },
    });

    assert.equal(response.statusCode, 403);
  });

  it("registers an invited user and returns an authenticated identity", async () => {
    const registration = await app.inject({
      method: "POST",
      url: "/api/auth/register",
      payload: {
        email: " Student@Example.com ",
        password: "a-very-long-password",
        inviteCode,
      },
    });

    assert.equal(registration.statusCode, 201);
    const registrationBody = registration.json<{
      accessToken: string;
      user: { id: string; email: string };
    }>();
    assert.equal(registrationBody.user.email, "student@example.com");
    assert.equal("passwordHash" in registrationBody.user, false);
    const setCookie = registration.headers["set-cookie"];
    assert.ok(setCookie);
    const cookieHeader = (
      Array.isArray(setCookie) ? setCookie[0] : setCookie
    )?.split(";")[0];
    assert.ok(cookieHeader);
    assert.match(setCookie.toString(), /HttpOnly/i);
    assert.match(setCookie.toString(), /SameSite=Lax/i);
    assert.match(setCookie.toString(), /Max-Age=2592000/i);

    const identity = await app.inject({
      method: "GET",
      url: "/api/auth/me",
      headers: { authorization: `Bearer ${registrationBody.accessToken}` },
    });
    assert.equal(identity.statusCode, 200);
    assert.deepEqual(identity.json(), { user: registrationBody.user });

    const restored = await app.inject({
      method: "POST",
      url: "/api/auth/session",
      headers: { cookie: cookieHeader },
    });
    assert.equal(restored.statusCode, 200);
    assert.deepEqual(
      restored.json<{ user: unknown }>().user,
      registrationBody.user,
    );
    assert.ok(restored.json<{ accessToken: string }>().accessToken);

    const logout = await app.inject({
      method: "POST",
      url: "/api/auth/logout",
      headers: { cookie: cookieHeader },
    });
    assert.equal(logout.statusCode, 204);
    assert.match(logout.headers["set-cookie"]?.toString() ?? "", /Max-Age=0/i);
  });

  it("uses secure cross-site cookies for an HTTPS frontend", async () => {
    const secureApp = await buildApp({
      webOrigin: "https://study.example",
      jwtSecret: "a-test-secret-that-is-long-enough-for-hs256",
      inviteCode,
      userStore: new MemoryUserStore(),
      contentStore: new MemoryContentStore(),
      planningStore: new MemoryPlanningStore(),
      questionStore: new MemoryQuestionStore(),
    });
    await secureApp.ready();
    try {
      const response = await secureApp.inject({
        method: "POST",
        url: "/api/auth/register",
        payload: {
          email: "secure@example.com",
          password: "a-very-long-password",
          inviteCode,
        },
      });

      assert.equal(response.statusCode, 201);
      assert.match(response.headers["set-cookie"]?.toString() ?? "", /Secure/i);
      assert.match(
        response.headers["set-cookie"]?.toString() ?? "",
        /SameSite=None/i,
      );
      assert.match(
        response.headers["set-cookie"]?.toString() ?? "",
        /Partitioned/i,
      );
    } finally {
      await secureApp.close();
    }
  });

  it("authenticates with the password and rejects incorrect passwords", async () => {
    const validLogin = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: {
        email: "student@example.com",
        password: "a-very-long-password",
      },
    });

    assert.equal(validLogin.statusCode, 200);
    assert.ok(validLogin.json<{ accessToken: string }>().accessToken);
    assert.match(
      validLogin.headers["set-cookie"]?.toString() ?? "",
      /HttpOnly/i,
    );

    const invalidLogin = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: {
        email: "student@example.com",
        password: "a-different-long-password",
      },
    });
    assert.equal(invalidLogin.statusCode, 401);
    assert.deepEqual(invalidLogin.json(), {
      error: "E-mail ou senha incorretos.",
    });
  });

  it("rejects passwords that are shorter than the minimum", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/auth/register",
      payload: {
        email: "other@example.com",
        password: "short",
        inviteCode,
      },
    });
    assert.equal(response.statusCode, 400);
  });

  it("does not create another account for an existing email", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/auth/register",
      payload: {
        email: "student@example.com",
        password: "a-different-long-password",
        inviteCode,
      },
    });

    assert.equal(response.statusCode, 409);
    assert.deepEqual(response.json(), {
      error: "Não foi possível criar essa conta.",
    });
  });

  it("limits repeated login attempts despite a forged forwarded IP", async () => {
    const limitedApp = await buildApp({
      webOrigin,
      jwtSecret: "a-test-secret-that-is-long-enough-for-hs256",
      inviteCode,
      authRateLimitMax: 1,
      userStore: new MemoryUserStore(),
      contentStore: new MemoryContentStore(),
      questionStore: new MemoryQuestionStore(),
    });
    await limitedApp.ready();

    try {
      const payload = {
        email: "student@example.com",
        password: "a-very-long-password",
      };
      const first = await limitedApp.inject({
        method: "POST",
        url: "/api/auth/login",
        payload,
      });
      const second = await limitedApp.inject({
        method: "POST",
        url: "/api/auth/login",
        payload,
        headers: { "x-forwarded-for": "203.0.113.42" },
      });

      assert.equal(first.statusCode, 401);
      assert.equal(second.statusCode, 429);
    } finally {
      await limitedApp.close();
    }
  });

  it("rejects malformed bearer tokens", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/auth/me",
      headers: { authorization: "Bearer not-a-valid-token" },
    });

    assert.equal(response.statusCode, 401);
  });
});

describe("study content API", () => {
  before(async () => {
    await contentApp.ready();
  });

  after(async () => {
    await contentApp.close();
  });

  async function register(email: string): Promise<string> {
    const response = await contentApp.inject({
      method: "POST",
      url: "/api/auth/register",
      payload: {
        email,
        password: "a-very-long-password",
        inviteCode,
      },
    });
    assert.equal(response.statusCode, 201);
    return response.json<{ accessToken: string }>().accessToken;
  }

  it("validates access, persists content, filters by owner, and cascades confirmed deletes", async () => {
    const unauthenticated = await contentApp.inject({
      method: "GET",
      url: "/api/content",
    });
    assert.equal(unauthenticated.statusCode, 401);

    const ownerToken = await register("content-owner@example.com");
    const ownerHeaders = { authorization: `Bearer ${ownerToken}` };
    const createdSubject = await contentApp.inject({
      method: "POST",
      url: "/api/subjects",
      headers: ownerHeaders,
      payload: { name: "Direito Constitucional", description: "Base legal" },
    });
    assert.equal(createdSubject.statusCode, 201);
    const subject = createdSubject.json<{ id: string; archived: boolean }>();
    assert.equal(subject.archived, false);

    const createdTopic = await contentApp.inject({
      method: "POST",
      url: `/api/subjects/${subject.id}/topics`,
      headers: ownerHeaders,
      payload: { name: "Princípios", status: "in_progress" },
    });
    assert.equal(createdTopic.statusCode, 201);
    const topic = createdTopic.json<{ id: string; status: string }>();
    assert.equal(topic.status, "in_progress");

    const savedNote = await contentApp.inject({
      method: "PATCH",
      url: `/api/topics/${topic.id}`,
      headers: ownerHeaders,
      payload: { notes: "Revisar o princípio da legalidade." },
    });
    assert.equal(
      savedNote.json<{ notes: string }>().notes,
      "Revisar o princípio da legalidade.",
    );

    const createdMaterial = await contentApp.inject({
      method: "POST",
      url: `/api/subjects/${subject.id}/materials`,
      headers: ownerHeaders,
      payload: {
        topicId: topic.id,
        title: "Aula de princípios",
        type: "video",
        url: "https://example.com/aula",
      },
    });
    assert.equal(createdMaterial.statusCode, 201);

    const createdQuestion = await contentApp.inject({
      method: "POST",
      url: "/api/questions",
      headers: ownerHeaders,
      payload: {
        topicId: topic.id,
        statement: "Qual princípio exige atuação conforme a lei?",
        options: ["Legalidade", "Publicidade"],
        correctOption: 0,
        explanation:
          "A Administração Pública se submete ao princípio da legalidade.",
        source: {
          name: "QConcursos",
          url: "https://www.qconcursos.com/questoes-de-concursos/questoes/1",
          exam: "Concurso de teste",
          board: "Banca de teste",
          role: "Técnico de TI",
          year: 2024,
          number: "1",
        },
      },
    });
    assert.equal(createdQuestion.statusCode, 201);
    const question = createdQuestion.json<{
      id: string;
      correctOption: number;
      source: { name: string };
    }>();
    assert.equal(question.correctOption, 0);
    assert.equal(question.source.name, "QConcursos");

    const invalidQuestion = await contentApp.inject({
      method: "POST",
      url: "/api/questions",
      headers: ownerHeaders,
      payload: {
        topicId: topic.id,
        statement: "Questão sem fonte segura",
        options: ["A", "B"],
        correctOption: 1,
        source: { name: "Fonte inválida", url: "javascript:alert(1)" },
      },
    });
    assert.equal(invalidQuestion.statusCode, 400);

    const updatedQuestion = await contentApp.inject({
      method: "PATCH",
      url: `/api/questions/${question.id}`,
      headers: ownerHeaders,
      payload: {
        topicId: topic.id,
        statement: "Qual princípio exige atuação conforme a lei?",
        options: ["Legalidade", "Publicidade"],
        correctOption: 0,
        explanation: "Explicação revisada.",
        source: {
          name: "QConcursos",
          url: "https://www.qconcursos.com/questoes-de-concursos/questoes/1",
          exam: "Concurso de teste",
          board: "Banca de teste",
          role: "Técnico de TI",
          year: 2024,
          number: "1",
        },
        status: "outdated",
        statusNote: "Referência legal precisa de revisão.",
      },
    });
    assert.equal(updatedQuestion.statusCode, 200);
    assert.equal(updatedQuestion.json<{ status: string }>().status, "outdated");

    const unsafeMaterial = await contentApp.inject({
      method: "POST",
      url: `/api/subjects/${subject.id}/materials`,
      headers: ownerHeaders,
      payload: {
        title: "Link inseguro",
        type: "other",
        url: "javascript:alert(1)",
      },
    });
    assert.equal(unsafeMaterial.statusCode, 400);

    const otherToken = await register("another-owner@example.com");
    const otherHeaders = { authorization: `Bearer ${otherToken}` };
    const otherContent = await contentApp.inject({
      method: "GET",
      url: "/api/content",
      headers: otherHeaders,
    });
    assert.deepEqual(otherContent.json(), {
      subjects: [],
      topics: [],
      materials: [],
    });
    const otherQuestions = await contentApp.inject({
      method: "GET",
      url: "/api/questions",
      headers: otherHeaders,
    });
    assert.deepEqual(otherQuestions.json(), []);
    const crossAccountUpdate = await contentApp.inject({
      method: "PATCH",
      url: `/api/subjects/${subject.id}`,
      headers: otherHeaders,
      payload: { name: "Acesso indevido" },
    });
    assert.equal(crossAccountUpdate.statusCode, 404);

    const archived = await contentApp.inject({
      method: "PATCH",
      url: `/api/subjects/${subject.id}`,
      headers: ownerHeaders,
      payload: { archived: true },
    });
    assert.equal(archived.json<{ archived: boolean }>().archived, true);
    const reactivated = await contentApp.inject({
      method: "PATCH",
      url: `/api/subjects/${subject.id}`,
      headers: ownerHeaders,
      payload: { archived: false },
    });
    assert.equal(reactivated.json<{ archived: boolean }>().archived, false);

    const snapshot = await contentApp.inject({
      method: "GET",
      url: "/api/content",
      headers: ownerHeaders,
    });
    const snapshotBody = snapshot.json<{
      subjects: unknown[];
      topics: { notes: string }[];
      materials: unknown[];
    }>();
    assert.equal(snapshotBody.subjects.length, 1);
    assert.equal(
      snapshotBody.topics[0]?.notes,
      "Revisar o princípio da legalidade.",
    );
    assert.equal(snapshotBody.materials.length, 1);

    const deleted = await contentApp.inject({
      method: "DELETE",
      url: `/api/subjects/${subject.id}`,
      headers: ownerHeaders,
    });
    assert.deepEqual(deleted.json(), {
      deleted: true,
      topics: 1,
      materials: 1,
    });
    const remainingQuestions = await contentApp.inject({
      method: "GET",
      url: "/api/questions",
      headers: ownerHeaders,
    });
    assert.deepEqual(remainingQuestions.json(), []);
  });

  it("imports the traceable study matrix idempotently for the authenticated account", async () => {
    const token = await register("matrix-owner@example.com");
    const headers = { authorization: `Bearer ${token}` };
    const first = await contentApp.inject({
      method: "POST",
      url: "/api/content/import-matrix",
      headers,
    });
    assert.equal(first.statusCode, 200);
    const firstResult = first.json<{
      subjectsCreated: number;
      topicsCreated: number;
      materialsCreated: number;
      subjectsInMatrix: number;
      topicsInMatrix: number;
    }>();
    assert.equal(firstResult.subjectsCreated, firstResult.subjectsInMatrix);
    assert.equal(firstResult.topicsCreated, firstResult.topicsInMatrix);
    assert.ok(firstResult.materialsCreated >= firstResult.subjectsInMatrix);

    const second = await contentApp.inject({
      method: "POST",
      url: "/api/content/import-matrix",
      headers,
    });
    assert.deepEqual(second.json(), {
      subjectsCreated: 0,
      topicsCreated: 0,
      materialsCreated: 0,
      subjectsInMatrix: firstResult.subjectsInMatrix,
      topicsInMatrix: firstResult.topicsInMatrix,
    });
  });

  it("validates study preferences, schedules topics, preserves sessions, and flags an infeasible deadline", async () => {
    const token = await register("planning-owner@example.com");
    const headers = { authorization: `Bearer ${token}` };
    const imported = await contentApp.inject({
      method: "POST",
      url: "/api/content/import-matrix",
      headers,
    });
    assert.equal(imported.statusCode, 200);
    const snapshot = await contentApp.inject({
      method: "GET",
      url: "/api/content",
      headers,
    });
    const { topics } = snapshot.json<{
      topics: { id: string; estimatedMinutes: number | null }[];
    }>();
    assert.ok(topics.length > 1);
    const today = new Date().toISOString().slice(0, 10);
    const todayWeekday =
      (new Date(`${today}T00:00:00.000Z`).getUTCDay() + 6) % 7;

    const invalidPreferences = await contentApp.inject({
      method: "PATCH",
      url: "/api/planning/preferences",
      headers,
      payload: {
        studyDays: [0, 0],
        minutesPerDay: 15,
        targetDate: null,
      },
    });
    assert.equal(invalidPreferences.statusCode, 400);

    const savedPreferences = await contentApp.inject({
      method: "PATCH",
      url: "/api/planning/preferences",
      headers,
      payload: {
        studyDays: [todayWeekday, (todayWeekday + 1) % 7],
        minutesPerDay: 120,
        targetDate: null,
      },
    });
    assert.equal(savedPreferences.statusCode, 200);

    const planningResponse = await contentApp.inject({
      method: "GET",
      url: "/api/planning",
      headers,
    });
    const result = planningResponse.json<{
      plan: {
        days: { plannedMinutes: number; capacityMinutes: number }[];
        unscheduledTopics: { topicId: string }[];
        weeklyStudiedMinutes: number;
        deadline: { feasible: boolean } | null;
      };
    }>();
    assert.ok(
      result.plan.days.every(
        (day) => day.plannedMinutes <= day.capacityMinutes,
      ),
    );
    assert.ok(result.plan.unscheduledTopics.length > 0);

    const plannedTopic = result.plan.days
      .flatMap((day) => day.topics)
      .find((topic) => topic.topicId !== topics[0]?.id);
    assert.ok(plannedTopic);
    const study = await contentApp.inject({
      method: "POST",
      url: `/api/topics/${plannedTopic.topicId}/sessions`,
      headers,
      payload: {
        kind: "study",
        date: today,
        durationMinutes: 35,
        notes: "Estudei os conceitos principais.",
      },
    });
    assert.equal(study.statusCode, 201);
    assert.equal(
      study.json<{ topic: { status: string } }>().topic.status,
      "in_progress",
    );

    const adjusted = await contentApp.inject({
      method: "PATCH",
      url: `/api/planning/items/${plannedTopic.topicId}`,
      headers,
      payload: { plannedDate: today },
    });
    assert.equal(adjusted.statusCode, 200);

    const createdPlan = await contentApp.inject({
      method: "POST",
      url: "/api/planning/plans",
      headers,
      payload: { name: "Concurso UFC 2027" },
    });
    assert.equal(createdPlan.statusCode, 201);
    const newPlan = createdPlan.json<{
      id: string;
      name: string;
      active: boolean;
      preferences: {
        studyDays: number[];
        minutesPerDay: number;
        targetDate: string | null;
      };
    }>();
    assert.equal(newPlan.name, "Concurso UFC 2027");
    assert.equal(newPlan.active, true);
    assert.equal(newPlan.preferences.minutesPerDay, 60);
    assert.deepEqual(newPlan.preferences.studyDays, [0, 1, 2, 3, 4]);

    const alternatePlanResponse = await contentApp.inject({
      method: "GET",
      url: "/api/planning",
      headers,
    });
    const alternatePlan = alternatePlanResponse.json<{
      plan: {
        days: { topics: { topicId: string; manuallyScheduled: boolean }[] }[];
        unscheduledTopics: { topicId: string; manuallyScheduled: boolean }[];
      };
    }>();
    const alternateTopic = [
      ...alternatePlan.plan.days.flatMap((day) => day.topics),
      ...alternatePlan.plan.unscheduledTopics,
    ].find((topic) => topic.topicId === plannedTopic.topicId);
    assert.ok(alternateTopic);
    assert.equal(alternateTopic.manuallyScheduled, false);

    const reactivatedOldPlan = await contentApp.inject({
      method: "PATCH",
      url: "/api/planning/plans/default/activate",
      headers,
    });
    assert.equal(reactivatedOldPlan.statusCode, 200);
    const originalPlanResponse = await contentApp.inject({
      method: "GET",
      url: "/api/planning",
      headers,
    });
    const originalPlan = originalPlanResponse.json<{
      plan: {
        days: { topics: { topicId: string; manuallyScheduled: boolean }[] }[];
      };
    }>();
    const originalTopic = originalPlan.plan.days
      .flatMap((day) => day.topics)
      .find((topic) => topic.topicId === plannedTopic.topicId);
    assert.equal(originalTopic?.manuallyScheduled, true);

    const completedReview = await contentApp.inject({
      method: "POST",
      url: `/api/topics/${plannedTopic.topicId}/sessions`,
      headers,
      payload: {
        kind: "review",
        date: today,
        durationMinutes: 15,
      },
    });
    assert.equal(completedReview.statusCode, 201);
    assert.equal(
      completedReview.json<{ topic: { status: string } }>().topic.status,
      "studied",
    );

    const targetPreferences = await contentApp.inject({
      method: "PATCH",
      url: "/api/planning/preferences",
      headers,
      payload: {
        studyDays: [todayWeekday],
        minutesPerDay: 15,
        targetDate: today,
      },
    });
    assert.equal(targetPreferences.statusCode, 200);
    const updatedPlan = await contentApp.inject({
      method: "GET",
      url: "/api/planning",
      headers,
    });
    const finalPlan = updatedPlan.json<{
      plan: {
        weeklyStudiedMinutes: number;
        weeklySessionCount: number;
        deadline: { feasible: boolean } | null;
      };
    }>().plan;
    assert.equal(finalPlan.weeklyStudiedMinutes, 50);
    assert.equal(finalPlan.weeklySessionCount, 2);
    assert.equal(finalPlan.deadline?.feasible, false);

    const shortTimedSession = await contentApp.inject({
      method: "POST",
      url: `/api/topics/${plannedTopic.topicId}/sessions`,
      headers,
      payload: {
        kind: "study",
        date: today,
        durationSeconds: 5,
      },
    });
    assert.equal(shortTimedSession.statusCode, 201);
    assert.equal(
      shortTimedSession.json<{ session: { durationMinutes: number } }>().session
        .durationMinutes,
      0,
    );
    assert.equal(
      shortTimedSession.json<{ session: { durationSeconds: number } }>().session
        .durationSeconds,
      5,
    );

    const planAfterShortSession = await contentApp.inject({
      method: "GET",
      url: "/api/planning",
      headers,
    });
    const shortSessionPlan = planAfterShortSession.json<{
      plan: { weeklyStudiedMinutes: number; weeklySessionCount: number };
    }>().plan;
    assert.equal(shortSessionPlan.weeklyStudiedMinutes, 50);
    assert.equal(shortSessionPlan.weeklySessionCount, 3);

    const anotherShortSession = await contentApp.inject({
      method: "POST",
      url: `/api/topics/${plannedTopic.topicId}/sessions`,
      headers,
      payload: {
        kind: "study",
        date: today,
        durationSeconds: 55,
      },
    });
    assert.equal(anotherShortSession.statusCode, 201);

    const planAfterAccumulatedSeconds = await contentApp.inject({
      method: "GET",
      url: "/api/planning",
      headers,
    });
    const accumulatedPlan = planAfterAccumulatedSeconds.json<{
      plan: { weeklyStudiedMinutes: number; weeklySessionCount: number };
    }>().plan;
    assert.equal(accumulatedPlan.weeklyStudiedMinutes, 51);
    assert.equal(accumulatedPlan.weeklySessionCount, 4);

    const previousPlanning = await contentApp.inject({
      method: "GET",
      url: "/api/planning",
      headers,
    });
    const previousPlan = previousPlanning.json<{
      activePlan: { id: string; name: string };
      preferences: {
        studyDays: number[];
        minutesPerDay: number;
        targetDate: string | null;
      };
    }>();
    assert.equal(previousPlan.activePlan.id, "default");

    const activatedNewPlan = await contentApp.inject({
      method: "PATCH",
      url: `/api/planning/plans/${newPlan.id}/activate`,
      headers,
    });
    assert.equal(activatedNewPlan.statusCode, 200);

    const newPlanPreferences = await contentApp.inject({
      method: "PATCH",
      url: "/api/planning/preferences",
      headers,
      payload: {
        studyDays: [todayWeekday],
        minutesPerDay: 30,
        targetDate: null,
      },
    });
    assert.equal(newPlanPreferences.statusCode, 200);

    const restoredOldPlan = await contentApp.inject({
      method: "PATCH",
      url: "/api/planning/plans/default/activate",
      headers,
    });
    assert.equal(restoredOldPlan.statusCode, 200);
    const restoredPlanning = await contentApp.inject({
      method: "GET",
      url: "/api/planning",
      headers,
    });
    const restored = restoredPlanning.json<{
      plans: { id: string; active: boolean }[];
      activePlan: { id: string };
      preferences: {
        studyDays: number[];
        minutesPerDay: number;
        targetDate: string | null;
      };
      sessions: { id: string }[];
    }>();
    assert.equal(restored.activePlan.id, "default");
    assert.equal(
      restored.preferences.minutesPerDay,
      previousPlan.preferences.minutesPerDay,
    );
    assert.deepEqual(
      restored.preferences.studyDays,
      previousPlan.preferences.studyDays,
    );
    assert.equal(restored.plans.length, 2);
    assert.equal(
      restored.plans.find((plan) => plan.id === "default")?.active,
      true,
    );
    assert.equal(restored.sessions.length, 4);

    const otherUserToken = await register("other-planning-owner@example.com");
    const inaccessiblePlan = await contentApp.inject({
      method: "PATCH",
      url: `/api/planning/plans/${newPlan.id}/activate`,
      headers: { authorization: `Bearer ${otherUserToken}` },
    });
    assert.equal(inaccessiblePlan.statusCode, 404);
  });
});
