import { getRuntimeConfigPath, loadRuntimeConfig, setExecBackend } from "@bitron/runtime";

export async function handleConfigCommand(args: string[]) {
  const action = args[1];

  if (action === "get") {
    console.log(JSON.stringify({
      success: true,
      path: getRuntimeConfigPath(),
      config: loadRuntimeConfig()
    }, null, 2));
    return;
  }

  if (action === "set") {
    const key = args[2];
    const value = args[3];

    if (key !== "exec-backend" || !value) {
      console.error("Uso: bitron config set exec-backend <local|openclaw-node|auto>");
      process.exit(1);
    }

    if (value !== "local" && value !== "openclaw-node" && value !== "auto") {
      console.error("Valor inválido. Usá: local | openclaw-node | auto");
      process.exit(1);
    }

    const config = setExecBackend(value);
    console.log(JSON.stringify({
      success: true,
      path: getRuntimeConfigPath(),
      config
    }, null, 2));
    return;
  }

  console.error("Uso: bitron config get | set exec-backend <local|openclaw-node|auto>");
  process.exit(1);
}
