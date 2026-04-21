import fs from "node:fs";
import path from "node:path";

const QUEUE_ROOT = "/root/bitron-framework/.bitron/execution-queue";

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function listJobDirs() {
  if (!fs.existsSync(QUEUE_ROOT)) return [];
  return fs
    .readdirSync(QUEUE_ROOT, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => path.join(QUEUE_ROOT, d.name));
}

function processJob(jobDir) {
  const handoffPath = path.join(jobDir, "openclaw-handoff.json");
  const resultPath = path.join(jobDir, "result.json");
  const attemptPath = path.join(jobDir, "bridge-executor-attempt.json");
  const bridgeResultPath = path.join(jobDir, "bridge-executor-result.json");

  if (!fs.existsSync(handoffPath)) {
    return {
      jobDir,
      status: "skipped",
      reason: "no_openclaw_handoff"
    };
  }

  const handoff = readJson(handoffPath);
  const existingResult = fs.existsSync(resultPath) ? readJson(resultPath) : null;
  const now = new Date().toISOString();

  const attempt = {
    createdAt: now,
    executor: "openclaw-bridge-executor",
    mode: "stub",
    handoff
  };

  writeJson(attemptPath, attempt);

  const bridgeResult = {
    createdAt: now,
    executor: "openclaw-bridge-executor",
    success: false,
    mode: "backend-unavailable",
    stdout: "",
    stderr:
      "Bridge executor stub: el handoff fue consumido correctamente, pero todavía no existe un proceso con acceso real a exec host=node.",
    code: 1
  };

  writeJson(bridgeResultPath, bridgeResult);

  const updatedResult = {
    queueId: existingResult?.queueId || path.basename(jobDir),
    createdAt: existingResult?.createdAt || now,
    status: "processed",
    success: false,
    mode: "backend-unavailable",
    stdout: "",
    stderr:
      "Bridge executor stub consumió openclaw-handoff.json y escribió artifacts de bridge. Pendiente conexión a exec host=node real.",
    code: 1,
    backend: {
      type: "openclaw-bridge-executor",
      available: false,
      queued: false,
      queuePath: jobDir
    },
    processedAt: now
  };

  writeJson(resultPath, updatedResult);

  return {
    jobDir,
    status: "processed",
    reason: "handoff_consumed",
    attemptPath,
    bridgeResultPath
  };
}

function main() {
  const jobs = listJobDirs();
  const results = jobs.map(processJob);

  const summary = {
    success: true,
    queueRoot: QUEUE_ROOT,
    processed: results.filter((r) => r.status === "processed").length,
    skipped: results.filter((r) => r.status === "skipped").length,
    jobs: results
  };

  console.log(JSON.stringify(summary, null, 2));
}

main();
