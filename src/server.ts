import { MongoClient } from "mongodb";
import { buildApp } from "./app.ts";
import { MongoUserStore } from "./users.ts";

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? "0.0.0.0";
const mongoUri = process.env.MONGODB_URI;

if (!Number.isInteger(port) || port < 1 || port > 65_535) {
  throw new Error("A variável PORT precisa ser um inteiro entre 1 e 65535.");
}
if (mongoUri === undefined) {
  throw new Error("Defina MONGODB_URI para iniciar a API.");
}
if (
  process.env.JWT_SECRET === undefined ||
  Buffer.byteLength(process.env.JWT_SECRET) < 32
) {
  throw new Error("JWT_SECRET precisa ter pelo menos 32 bytes.");
}
if (
  process.env.INVITE_CODE === undefined ||
  process.env.INVITE_CODE.length < 24
) {
  throw new Error("INVITE_CODE precisa ter pelo menos 24 caracteres.");
}
if (process.env.TRUST_PROXY === undefined) {
  throw new Error(
    "Defina TRUST_PROXY explicitamente como false ou proxy confiável.",
  );
}

const mongo = new MongoClient(mongoUri, { serverSelectionTimeoutMS: 10_000 });

try {
  await mongo.connect();
  await mongo.db().command({ ping: 1 });
  const users = new MongoUserStore(mongo, process.env.MONGODB_DATABASE);
  await users.ensureIndexes();

  const app = await buildApp({ logger: true, userStore: users });
  app.addHook("onClose", async () => mongo.close());
  await app.listen({ port, host });
} catch (error) {
  await mongo.close();
  console.error(
    "Não foi possível iniciar a API. Verifique a configuração e a conexão.",
  );
  console.error(error instanceof Error ? error.name : "Erro desconhecido.");
  process.exitCode = 1;
}
