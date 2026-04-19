export async function runOnNode(command: string) {
  console.log("[OpenClaw Adapter] Ejecutando:", command);

  return {
    success: true,
    output: "Simulated execution OK"
  };
}
