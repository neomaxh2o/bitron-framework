export type RuntimeExecMode = "executed" | "backend-unavailable";

export interface ExecuteNodeCommandInput {
  command: string;
  node: string;
  security: "off" | "allowlist";
  ask: "off" | "ask";
}

export interface ExecuteNodeCommandResult {
  success: boolean;
  stdout: string;
  stderr: string;
  code: number | null;
  mode: RuntimeExecMode;
  backend: {
    type: string;
    available: boolean;
  };
}

export interface NodeExecRuntime {
  execute(input: ExecuteNodeCommandInput): Promise<ExecuteNodeCommandResult>;
}

export class OpenClawExecRuntime implements NodeExecRuntime {
  async execute(input: ExecuteNodeCommandInput): Promise<ExecuteNodeCommandResult> {
    return {
      success: false,
      stdout: "",
      stderr:
        `Runtime stub: el backend real OpenClaw exec host=node todavía no está conectado. ` +
        `Payload preparado para nodo=${input.node}, command="${input.command}", security=${input.security}, ask=${input.ask}.`,
      code: 1,
      mode: "backend-unavailable",
      backend: {
        type: "openclaw-exec-host-node",
        available: false
      }
    };
  }
}

export function getDefaultNodeExecRuntime(): NodeExecRuntime {
  return new OpenClawExecRuntime();
}
