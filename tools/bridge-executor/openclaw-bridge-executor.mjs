import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

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

function getJobDir(queueId) {
  const jobDir = path.join(QUEUE_ROOT, queueId);
  return fs.existsSync(jobDir) ? jobDir : null;
}

function safeExec(command) {
  try {
    const stdout = execSync(command, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
    return {
      success: true,
      stdout: stdout.trim(),
      stderr: "",
      code: 0
    };
  } catch (error) {
    return {
      success: false,
      stdout: error?.stdout?.toString?.().trim?.() || "",
      stderr: error?.stderr?.toString?.().trim?.() || error?.message || "command failed",
      code: typeof error?.status === "number" ? error.status : 1
    };
  }
}

function shellEscapeSingle(value) {
  return String(value).replace(/'/g, `'\\''`);
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

function doctor(queueId) {
  const jobDir = getJobDir(queueId);

  if (!jobDir) {
    return {
      success: false,
      queueId,
      message: "queue job not found"
    };
  }

  const handoffPath = path.join(jobDir, "openclaw-handoff.json");
  const handoffExists = fs.existsSync(handoffPath);
  const handoff = handoffExists ? readJson(handoffPath) : null;

  const openclawVersion = safeExec("openclaw --version");

  const node = handoff?.payload?.exec?.node || null;
  const command = handoff?.payload?.exec?.command || null;

  return {
    success: true,
    queueId,
    jobDir,
    checks: {
      openclawBinary: openclawVersion.success,
      handoffExists,
      nodeDetected: Boolean(node),
      commandDetected: Boolean(command)
    },
    openclaw: openclawVersion,
    payload: handoff?.payload || null,
    recommendedChecks: node
      ? [
          `openclaw approvals get --node ${node} --json`,
          `openclaw nodes describe --node ${node}`
        ]
      : [],
    nextStep: handoffExists
      ? "Si approvals y nodo están correctos, este job ya está listo para conectar una ejecución real."
      : "Primero generá openclaw-handoff.json para este job."
  };
}

function exportHandoff(queueId) {
  const job = getJobDir(queueId);

  if (!job) {
    return {
      success: false,
      queueId,
      baseDir: "",
      requestPath: "",
      handoffPath: "",
      payload: null,
      message: "queue job not found"
    };
  }

  const requestPath = path.join(job, "openclaw-request.json");
  const handoffPath = path.join(job, "openclaw-handoff.json");

  if (!fs.existsSync(requestPath)) {
    return {
      success: false,
      queueId,
      baseDir: job,
      requestPath,
      handoffPath,
      payload: null,
      message: "openclaw-request.json not found for this job"
    };
  }

  const payload = readJson(requestPath);

  const handoff = {
    queueId,
    createdAt: new Date().toISOString(),
    type: "openclaw-exec-handoff",
    instructions: {
      note: "Ejecutar este payload desde un runtime/agente con acceso real a la tool exec host=node.",
      requiredChecks: [
        `openclaw approvals get --node ${payload?.exec?.node || "<node>"} --json`,
        `openclaw nodes describe --node ${payload?.exec?.node || "<node>"}`
      ]
    },
    payload
  };

  writeJson(handoffPath, handoff);

  return {
    success: true,
    queueId,
    baseDir: job,
    requestPath,
    handoffPath,
    payload,
    message: "openclaw handoff exported"
  };
}

function attemptReal(queueId) {
  const jobDir = getJobDir(queueId);

  if (!jobDir) {
    return {
      success: false,
      queueId,
      message: "queue job not found"
    };
  }

  const handoffPath = path.join(jobDir, "openclaw-handoff.json");
  const resultPath = path.join(jobDir, "result.json");
  const attemptRealPath = path.join(jobDir, "bridge-executor-attempt-real.json");
  const resultRealPath = path.join(jobDir, "bridge-executor-result-real.json");

  if (!fs.existsSync(handoffPath)) {
    return {
      success: false,
      queueId,
      message: "openclaw-handoff.json not found"
    };
  }

  const handoff = readJson(handoffPath);
  const payload = handoff?.payload?.exec;
  const now = new Date().toISOString();

  if (!payload?.command || !payload?.node) {
    return {
      success: false,
      queueId,
      message: "invalid handoff payload"
    };
  }

  const realCommand = [
    "openclaw",
    "exec",
    "--host",
    "node",
    "--node",
    payload.node,
    "--security",
    payload.security || "off",
    "--ask",
    payload.ask || "off",
    "--",
    payload.command
  ].join(" ");

  const attempt = {
    createdAt: now,
    executor: "openclaw-bridge-executor",
    mode: "attempt-real",
    payload,
    command: realCommand
  };

  writeJson(attemptRealPath, attempt);

  const execResult = safeExec(realCommand);

  const realResult = {
    createdAt: now,
    executor: "openclaw-bridge-executor",
    success: execResult.success,
    mode: execResult.success ? "executed" : "backend-unavailable",
    stdout: execResult.stdout,
    stderr: execResult.stderr,
    code: execResult.code,
    command: realCommand
  };

  writeJson(resultRealPath, realResult);

  const updatedResult = {
    queueId,
    createdAt: now,
    status: "processed",
    success: execResult.success,
    mode: execResult.success ? "executed" : "backend-unavailable",
    stdout: execResult.stdout,
    stderr: execResult.stderr,
    code: execResult.code,
    backend: {
      type: "openclaw-bridge-executor-real",
      available: execResult.success,
      queued: false,
      queuePath: jobDir
    },
    processedAt: now
  };

  writeJson(resultPath, updatedResult);

  return {
    success: true,
    queueId,
    command: realCommand,
    attemptRealPath,
    resultRealPath,
    execResult
  };
}

function runOnce() {
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

function main() {
  const [, , action, arg] = process.argv;

  if (action === "run-once") {
    runOnce();
    return;
  }

  if (action === "export") {
    console.log(JSON.stringify(exportHandoff(arg), null, 2));
    process.exit(0);
  }

  if (action === "doctor") {
    console.log(JSON.stringify(doctor(arg), null, 2));
    process.exit(0);
  }

  if (action === "attempt-real") {
    console.log(JSON.stringify(attemptReal(arg), null, 2));
    process.exit(0);
  }

  console.error("Uso: node tools/bridge-executor/openclaw-bridge-executor.mjs <run-once|export|doctor|attempt-real> [queueId]");
  process.exit(1);
}

main();
