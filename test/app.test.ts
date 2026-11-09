import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { buildApp } from "../src/app.ts";
import { MemoryContentStore } from "./memory-content-store.ts";
import { MemoryPlanningStore } from "./memory-planning-store.ts";
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
const app = await buildApp({
  webOrigin,
  jwtSecret: "a-test-secret-that-is-long-enough-for-hs256",
  inviteCode,
  authRateLimitMax: 20,
  userStore: users,
  contentStore: content,
  planningStore: planning,
});
const contentApp = await buildApp({
  webOrigin,
  jwtSecret: "a-test-secret-that-is-long-enough-for-hs256",
  inviteCode,
  authRateLimitMax: 20,
  userStore: users,
  contentStore: content,
  planningStore: planning,
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
  });
});
