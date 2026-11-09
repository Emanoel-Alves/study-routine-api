import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { buildApp } from "../src/app.ts";
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
const app = await buildApp({
  webOrigin,
  jwtSecret: "a-test-secret-that-is-long-enough-for-hs256",
  inviteCode,
  authRateLimitMax: 20,
  userStore: users,
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
  });

  it("does not allow requests from an unconfigured origin", async () => {
    const untrustedOrigin = "https://untrusted.example";
    const response = await app.inject({
      method: "GET",
      url: "/api/health",
      headers: { origin: untrustedOrigin },
    });

    assert.equal(response.headers["access-control-allow-origin"], undefined);
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

    const identity = await app.inject({
      method: "GET",
      url: "/api/auth/me",
      headers: { authorization: `Bearer ${registrationBody.accessToken}` },
    });
    assert.equal(identity.statusCode, 200);
    assert.deepEqual(identity.json(), { user: registrationBody.user });
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
