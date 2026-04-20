import fs from "node:fs";
import path from "node:path";

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
    queued?: boolean;
    queuePath?: string;
  };
}

export interface NodeExecBridge {
  execute(input: BridgeExecuteInput): Promise<BridgeExecuteResult>;
}

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

function writeJson(filePath: string, data: unknown): void {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function createQueueId(): string {
  return `queue-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function buildQueuePaths(queueId: string) {
  const baseDir = path.join("/root/bitron-framework", ".bitron", "execution-queue", queueId);
  return {
    baseDir,
    request: path.join(baseDir, "request.json"),
    result: path.join(baseDir, "result.json")
  };
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

export class PlannedPayloadBridge implements NodeExecBridge {
  async execute(input: BridgeExecuteInput): Promise<BridgeExecuteResult> {
    const queueId = createQueueId();
    const paths = buildQueuePaths(queueId);

    const requestPayload = {
      queueId,
      createdAt: new Date().toISOString(),
      status: "queued",
      node: input.node,
      command: input.command,
      security: input.security,
      ask: input.ask
    };

    const resultPayload = {
      queueId,
      createdAt: new Date().toISOString(),
      status: "queued",
      success: false,
      mode: "backend-unavailable",
      stdout: "",
      stderr:
        `PlannedPayloadBridge: solicitud encolada pero todavía no existe un worker real para ejecutar en nodo.`,
      code: 1,
      backend: {
        type: "planned-payload-bridge",
        available: false,
        queued: true,
        queuePath: paths.baseDir
      }
    };

    writeJson(paths.request, requestPayload);
    writeJson(paths.result, resultPayload);

    return {
      success: false,
      stdout: "",
      stderr:
        `PlannedPayloadBridge: solicitud encolada en ${paths.baseDir} pero todavía no existe un worker real para ejecutar en nodo.`,
      code: 1,
      mode: "backend-unavailable",
      backend: {
        type: "planned-payload-bridge",
        available: false,
        queued: true,
        queuePath: paths.baseDir
      }
    };
  }
}

export function getDefaultNodeExecBridge(): NodeExecBridge {
  return new PlannedPayloadBridge();
}
