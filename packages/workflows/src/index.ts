import { createJobId, createContext } from "@bitron/core";
import { plannerAgent, builderAgent, validatorAgent } from "@bitron/agents";
import { writeArtifact } from "@bitron/artifacts";
import { appendLog, appendEvent, getJobLogPaths } from "@bitron/logger";
import { preflightBasic } from "@bitron/openclaw-adapter";

export interface WorkflowResult {
  workflow: string;
  jobId: string;
  status: "ok" | "failed";
  artifacts: {
    preflight: string;
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

export async function runStandardDelivery(task: string, requestedNode?: string): Promise<WorkflowResult> {
  const jobId = createJobId();
  const steps: WorkflowResult["steps"] = [];

  appendLog(jobId, `Workflow standard-delivery started for task: ${task}`);
  appendEvent(jobId, {
    level: "info",
    event: "workflow_started",
    data: { workflow: "standard-delivery", task, requestedNode: requestedNode || null }
  });

  const preflight = await preflightBasic(requestedNode);
  const node = preflight.node || requestedNode || "unknown-node";

  steps.push({
    step: "preflight",
    status: preflight.success ? "ok" : "failed",
    output: preflight
  });

  const preflightPath = writeArtifact(jobId, "preflight.json", preflight);

  appendLog(jobId, `Preflight completed on node ${node} with status: ${preflight.success ? "ok" : "failed"}`);
  appendEvent(jobId, {
    level: preflight.success ? "info" : "error",
    event: "preflight_completed",
    data: preflight
  });

  if (!preflight.success) {
    const failedResult: WorkflowResult = {
      workflow: "standard-delivery",
      jobId,
      status: "failed",
      artifacts: {
        preflight: preflightPath,
        planner: "",
        builder: "",
        validator: "",
        summary: ""
      },
      logs: getJobLogPaths(jobId),
      steps
    };

    const summaryPath = writeArtifact(jobId, "summary.json", failedResult);
    failedResult.artifacts.summary = summaryPath;

    appendLog(jobId, "Workflow aborted due to failed preflight");
    appendEvent(jobId, {
      level: "error",
      event: "workflow_aborted",
      data: { reason: "preflight_failed", node, summaryPath }
    });

    return failedResult;
  }

  const plannerContext = createContext(jobId, "planner-agent", node);
  const plan = plannerAgent(plannerContext, task);

  steps.push({
    step: "planner",
    status: "ok",
    output: plan
  });

  const plannerPath = writeArtifact(jobId, "planner.json", plan);

  appendLog(jobId, `Planner completed on node ${node}`);
  appendEvent(jobId, {
    level: "info",
    event: "planner_completed",
    data: plan
  });

  const builderContext = createContext(jobId, "builder-agent", node);
  const build = builderAgent(builderContext, task, plan.plan);

  steps.push({
    step: "builder",
    status: "ok",
    output: build
  });

  const builderPath = writeArtifact(jobId, "builder.json", build);

  appendLog(jobId, `Builder completed on node ${node}`);
  appendEvent(jobId, {
    level: "info",
    event: "builder_completed",
    data: build
  });

  const validatorContext = createContext(jobId, "validator-agent", node);
  const validation = validatorAgent(validatorContext, task, build.build);

  steps.push({
    step: "validator",
    status: validation.valid ? "ok" : "failed",
    output: validation
  });

  const validatorPath = writeArtifact(jobId, "validator.json", validation);

  appendLog(jobId, `Validator completed on node ${node} with status: ${validation.valid ? "ok" : "failed"}`);
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
      preflight: preflightPath,
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

  appendLog(jobId, `Workflow finished on node ${node} with status: ${result.status}`);
  appendEvent(jobId, {
    level: result.status === "ok" ? "info" : "error",
    event: "workflow_finished",
    data: { status: result.status, node, summaryPath }
  });

  writeArtifact(jobId, "summary.json", result);

  return result;
}
