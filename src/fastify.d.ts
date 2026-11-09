import "@fastify/jwt";

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: {
      email: string;
      tokenUse?: "session";
    };
    user: {
      sub: string;
      email: string;
    };
  }
}
