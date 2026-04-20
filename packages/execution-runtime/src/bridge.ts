export interface BridgeExecuteInput {
  command: string;
  node: string;
  security: "off" | "allowlist";
  ask: "off" | "ask";
}

export interface BridgeExecuteResult {
  success: boolean;
  stdout: string;
  stderr: string;
  code: number | null;
  mode: "executed" | "backend-unavailable";
  backend: {
    type: string;
    available: boolean;
  };
}

export interface NodeExecBridge {
  execute(input: BridgeExecuteInput): Promise<BridgeExecuteResult>;
}

export class NoopNodeExecBridge implements NodeExecBridge {
  async execute(input: BridgeExecuteInput): Promise<BridgeExecuteResult> {
    return {
      success: false,
      stdout: "",
      stderr:
        `Bridge stub: no existe todavía un bridge real conectado para ejecutar en nodo. ` +
        `Payload recibido: node=${input.node}, command="${input.command}", security=${input.security}, ask=${input.ask}.`,
      code: 1,
      mode: "backend-unavailable",
      backend: {
        type: "noop-node-exec-bridge",
        available: false
      }
    };
  }
}

export function getDefaultNodeExecBridge(): NodeExecBridge {
  return new NoopNodeExecBridge();
}
