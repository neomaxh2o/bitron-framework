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
  probe?: unknown
) {
  return {
    context,
    build: `Build ejecutado para "${task}" siguiendo "${plan}"`,
    probe: probe || null
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
