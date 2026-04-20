import {
  getDefaultNodeExecBridge,
  type NodeExecBridge,
  type BridgeExecuteInput,
  type BridgeExecuteResult
} from "./bridge";

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
  constructor(private readonly bridge: NodeExecBridge = getDefaultNodeExecBridge()) {}

  async execute(input: ExecuteNodeCommandInput): Promise<ExecuteNodeCommandResult> {
    const result: BridgeExecuteResult = await this.bridge.execute(input as BridgeExecuteInput);

    return {
      success: result.success,
      stdout: result.stdout,
      stderr: result.stderr,
      code: result.code,
      mode: result.mode,
      backend: result.backend
    };
  }
}

export function getDefaultNodeExecRuntime(): NodeExecRuntime {
  return new OpenClawExecRuntime();
}

export type {
  NodeExecBridge,
  BridgeExecuteInput,
  BridgeExecuteResult
} from "./bridge";
