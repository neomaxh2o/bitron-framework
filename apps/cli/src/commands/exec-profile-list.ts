import { listExecProfiles } from "@bitron/execution";

export async function handleExecProfileListCommand() {
  console.log(JSON.stringify(listExecProfiles(), null, 2));
}
