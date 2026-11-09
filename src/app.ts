import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import rateLimit from "@fastify/rate-limit";
import Fastify from "fastify";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { hashPassword, verifyPassword } from "./password.ts";
import type { UserStore } from "./users.ts";

interface AppOptions {
  webOrigin?: string;
  jwtSecret?: string;
  inviteCode?: string;
  logger?: boolean;
  userStore: UserStore;
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

const credentialsSchema = {
  type: "object",
  additionalProperties: false,
  required: ["email", "password"],
  properties: {
    email: { type: "string", minLength: 3, maxLength: 254 },
    password: { type: "string", minLength: 12, maxLength: 128 },
  },
} as const;

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

  await app.register(cors, {
    origin: (origin, callback) => callback(null, origin === webOrigin),
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

  app.get("/api/health", async () => ({ status: "ok" }));

  app.post<{ Body: RegisterBody }>(
    "/api/auth/register",
    {
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
        const token = app.jwt.sign({ email: user.email }, { sub: user.id });

        return reply.code(201).send({
          accessToken: token,
          user: { id: user.id, email: user.email },
        });
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

      const accessToken = app.jwt.sign({ email: user.email }, { sub: user.id });
      return { accessToken, user: { id: user.id, email: user.email } };
    },
  );

  app.get(
    "/api/auth/me",
    {
      preHandler: async (request, reply) => {
        try {
          await request.jwtVerify();
        } catch {
          return reply.code(401).send({ error: "Autenticação necessária." });
        }
      },
    },
    async (request, reply) => {
      const user = await options.userStore.findById(request.user.sub);
      if (!user || user.email !== request.user.email) {
        return reply.code(401).send({ error: "Sessão inválida." });
      }
      return { user: { id: user.id, email: user.email } };
    },
  );

  return app;
}
