import { createJobId, createContext } from "@bitron/core";
import { plannerAgent, builderAgent, validatorAgent } from "@bitron/agents";
import { writeArtifact } from "@bitron/artifacts";
import { appendLog, appendEvent, getJobLogPaths } from "@bitron/logger";
import { preflightProfile, builderProbeOnNode } from "@bitron/openclaw-adapter";

export interface WorkflowResult {
  workflow: string;
  jobId: string;
  node: string;
  preflightProfile: string;
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

async function runWorkflowBase(
  workflowName: string,
  workflowPreflightProfile: string,
  task: string,
  requestedNode?: string
): Promise<WorkflowResult> {
  const jobId = createJobId();
  const steps: WorkflowResult["steps"] = [];

  appendLog(jobId, `Workflow ${workflowName} started for task: ${task}`);
  appendEvent(jobId, {
    level: "info",
    event: "workflow_started",
    data: {
      workflow: workflowName,
      task,
      requestedNode: requestedNode || null,
      preflightProfile: workflowPreflightProfile
    }
  });

  const preflight = await preflightProfile(workflowPreflightProfile, requestedNode);
  const node = preflight.node || requestedNode || "unknown-node";

  steps.push({
    step: "preflight",
    status: preflight.success ? "ok" : "failed",
    output: preflight
  });

  const preflightPath = writeArtifact(jobId, "preflight.json", preflight);

  appendLog(jobId, `Preflight(${workflowPreflightProfile}) completed on node ${node} with status: ${preflight.success ? "ok" : "failed"}`);
  appendEvent(jobId, {
    level: preflight.success ? "info" : "error",
    event: "preflight_completed",
    data: preflight
  });

  if (!preflight.success) {
    const failedResult: WorkflowResult = {
      workflow: workflowName,
      jobId,
      node,
      preflightProfile: workflowPreflightProfile,
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

    appendLog(jobId, `Workflow aborted due to failed preflight on node ${node}`);
    appendEvent(jobId, {
      level: "error",
      event: "workflow_aborted",
      data: {
        reason: "preflight_failed",
        node,
        preflightProfile: workflowPreflightProfile,
        summaryPath
      }
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
  const probe = await builderProbeOnNode(node);
  const build = builderAgent(builderContext, task, plan.plan, probe);

  steps.push({
    step: "builder",
    status: probe.success ? "ok" : "failed",
    output: build
  });

  const builderPath = writeArtifact(jobId, "builder.json", build);

  appendLog(jobId, `Builder completed on node ${node} with probe status: ${probe.success ? "ok" : "failed"}`);
  appendEvent(jobId, {
    level: probe.success ? "info" : "error",
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
    workflow: workflowName,
    jobId,
    node,
    preflightProfile: workflowPreflightProfile,
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
    data: {
      status: result.status,
      node,
      preflightProfile: workflowPreflightProfile,
      summaryPath
    }
  });

  writeArtifact(jobId, "summary.json", result);

  return result;
}

export async function runStandardDelivery(task: string, requestedNode?: string): Promise<WorkflowResult> {
  return runWorkflowBase("standard-delivery", "basic", task, requestedNode);
}

export async function runNodeBuild(task: string, requestedNode?: string): Promise<WorkflowResult> {
  return runWorkflowBase("node-build", "nodejs", task, requestedNode);
}
