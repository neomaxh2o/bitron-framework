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

function ensureDir(dirPath: string) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function getRepoRoot() {
  return findRepoRoot(process.cwd());
}

function getLogsDir() {
  const repoRoot = getRepoRoot();
  return path.join(repoRoot, ".bitron", "logs");
}

function getLogFilePath(jobId: string) {
  return path.join(getLogsDir(), `${jobId}.log`);
}

function getEventsFilePath(jobId: string) {
  return path.join(getLogsDir(), `${jobId}.json`);
}

export interface LogEvent {
  timestamp: string;
  level: "info" | "error";
  jobId: string;
  event: string;
  data?: unknown;
}

export function appendLog(jobId: string, message: string) {
  const logsDir = getLogsDir();
  ensureDir(logsDir);

  const line = `[${new Date().toISOString()}] [${jobId}] ${message}\n`;
  fs.appendFileSync(getLogFilePath(jobId), line, "utf8");
}

export function appendEvent(jobId: string, event: Omit<LogEvent, "timestamp" | "jobId">) {
  const logsDir = getLogsDir();
  ensureDir(logsDir);

  const eventPath = getEventsFilePath(jobId);
  const nextEvent: LogEvent = {
    timestamp: new Date().toISOString(),
    jobId,
    level: event.level,
    event: event.event,
    data: event.data
  };

  let events: LogEvent[] = [];
  if (fs.existsSync(eventPath)) {
    const raw = fs.readFileSync(eventPath, "utf8");
    events = JSON.parse(raw);
  }

  events.push(nextEvent);
  fs.writeFileSync(eventPath, JSON.stringify(events, null, 2), "utf8");
}

export function getJobLogPaths(jobId: string) {
  return {
    log: getLogFilePath(jobId),
    events: getEventsFilePath(jobId)
  };
}
