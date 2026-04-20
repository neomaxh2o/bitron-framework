import { ExecutionContext } from "@bitron/core";

export function plannerAgent(context: ExecutionContext, task: string) {
  return {
    context,
    plan: `Plan generado para: ${task}`
  };
}

export function builderAgent(
  context: ExecutionContext,
  task: string,
  plan: string,
  details?: {
    probe?: unknown;
    execProfile?: unknown;
    execPolicy?: unknown;
    execRequest?: unknown;
    backend?: unknown;
  }
) {
  return {
    context,
    build: `Build ejecutado para "${task}" siguiendo "${plan}"`,
    probe: details?.probe || null,
    execProfile: details?.execProfile || null,
    execPolicy: details?.execPolicy || null,
    execRequest: details?.execRequest || null,
    backend: details?.backend || null
  };
}

export function validatorAgent(context: ExecutionContext, task: string, build: string) {
  const valid = Boolean(task && build);

  return {
    context,
    valid,
    report: valid
      ? `Validación correcta para "${task}"`
      : `Validación fallida para "${task}"`
  };
}
