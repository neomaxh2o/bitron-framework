import { createContext } from "@bitron/core";

export function plannerAgent(task: string) {
  const context = createContext("planner-agent");

  return {
    context,
    plan: `Plan generado para: ${task}`
  };
}
