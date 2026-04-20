import fs from "node:fs";
import path from "node:path";

function findRepoRoot(startDir: string): string {
  let current = path.resolve(startDir);

  while (true) {
    const workspaceFile = path.join(current, "pnpm-workspace.yaml");
    if (fs.existsSync(workspaceFile)) {
      return current;
    }

    const parent = path.dirname(current);
    if (parent === current) {
      return startDir;
    }

    current = parent;
  }
}

export function ensureDir(dirPath: string) {
  fs.mkdirSync(dirPath, { recursive: true });
}

export function getRepoRoot() {
  return findRepoRoot(process.cwd());
}

export function getArtifactsDir(jobId: string) {
  const repoRoot = getRepoRoot();
  return path.join(repoRoot, ".bitron", "artifacts", jobId);
}

export function writeArtifact(jobId: string, fileName: string, data: unknown) {
  const dir = getArtifactsDir(jobId);
  ensureDir(dir);

  const filePath = path.join(dir, fileName);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");

  return filePath;
}
