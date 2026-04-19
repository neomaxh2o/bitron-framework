export interface ExecutionContext {
  jobId: string;
  agent: string;
  node: string;
}

export function createContext(agent: string): ExecutionContext {
  return {
    jobId: `job-${Date.now()}`,
    agent,
    node: "default-node"
  };
}
