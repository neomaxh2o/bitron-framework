import fs from "node:fs";
import path from "node:path";

export function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

export function writeJson(filePath: string, data: unknown): string {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  return filePath;
}

export function buildExecReadyArtifactPaths(jobId: string) {
  const baseDir = path.join("/root/bitron-framework", ".bitron", "exec-ready", jobId);
  return {
    baseDir,
    execReady: path.join(baseDir, "exec-ready.json"),
    approvalChecklist: path.join(baseDir, "approval-checklist.json")
  };
}
