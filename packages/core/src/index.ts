export interface ExecutionContext {
  jobId: string;
  agent: string;
  node: string;
}

export function createJobId(): string {
  return `job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createContext(jobId: string, agent: string, node = "default-node"): ExecutionContext {
  return {
    jobId,
    agent,
    node
  };
}
