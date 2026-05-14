import type { SessionMode } from "./auth";

export type AppEnv = {
  Bindings: Env;
  Variables: { sessionMode: SessionMode };
};

export function isAnonymous(c: {
  var: { sessionMode?: SessionMode };
}): boolean {
  return c.var.sessionMode === "anonymous";
}
