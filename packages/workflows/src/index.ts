import { createJobId, createContext } from "@bitron/core";
import { plannerAgent, builderAgent, validatorAgent } from "@bitron/agents";
import { writeArtifact } from "@bitron/artifacts";
import { appendLog, appendEvent, getJobLogPaths } from "@bitron/logger";

export interface WorkflowResult {
  workflow: string;
  jobId: string;
  status: "ok" | "failed";
  artifacts: {
    planner: string;
    builder: string;
    validator: string;
    summary: string;
  };
  logs: {
    log: string;
    events: string;
  };
  steps: Array<{
    step: string;
    status: "ok" | "failed";
    output: unknown;
  }>;
}

export async function runStandardDelivery(task: string): Promise<WorkflowResult> {
  const jobId = createJobId();
  const steps: WorkflowResult["steps"] = [];

  appendLog(jobId, `Workflow standard-delivery started for task: ${task}`);
  appendEvent(jobId, {
    level: "info",
    event: "workflow_started",
    data: { workflow: "standard-delivery", task }
  });

  const plannerContext = createContext(jobId, "planner-agent");
  const plan = plannerAgent(plannerContext, task);
  steps.push({
    step: "planner",
    status: "ok",
    output: plan
  });
  const plannerPath = writeArtifact(jobId, "planner.json", plan);
  appendLog(jobId, "Planner step completed");
  appendEvent(jobId, {
    level: "info",
    event: "planner_completed",
    data: plan
  });

  const builderContext = createContext(jobId, "builder-agent");
  const build = builderAgent(builderContext, task, plan.plan);
  steps.push({
    step: "builder",
    status: "ok",
    output: build
  });
  const builderPath = writeArtifact(jobId, "builder.json", build);
  appendLog(jobId, "Builder step completed");
  appendEvent(jobId, {
    level: "info",
    event: "builder_completed",
    data: build
  });

  const validatorContext = createContext(jobId, "validator-agent");
  const validation = validatorAgent(validatorContext, task, build.build);
  steps.push({
    step: "validator",
    status: validation.valid ? "ok" : "failed",
    output: validation
  });
  const validatorPath = writeArtifact(jobId, "validator.json", validation);
  appendLog(jobId, `Validator step completed with status: ${validation.valid ? "ok" : "failed"}`);
  appendEvent(jobId, {
    level: validation.valid ? "info" : "error",
    event: "validator_completed",
    data: validation
  });

  const result: WorkflowResult = {
    workflow: "standard-delivery",
    jobId,
    status: validation.valid ? "ok" : "failed",
    artifacts: {
      planner: plannerPath,
      builder: builderPath,
      validator: validatorPath,
      summary: ""
    },
    logs: getJobLogPaths(jobId),
    steps
  };

  const summaryPath = writeArtifact(jobId, "summary.json", result);
  result.artifacts.summary = summaryPath;

  appendLog(jobId, `Workflow finished with status: ${result.status}`);
  appendEvent(jobId, {
    level: result.status === "ok" ? "info" : "error",
    event: "workflow_finished",
    data: { status: result.status, summaryPath }
  });

  return result;
}
