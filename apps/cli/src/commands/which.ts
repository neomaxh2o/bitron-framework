import { whichOnNode } from "@bitron/openclaw-adapter";

export async function handleWhichCommand(args: string[], node?: string) {
  const bin = args[1];
  if (!bin) {
    console.error("Debes indicar un binario. Ejemplo: bitron which bash --node intradia-vps-2");
    process.exit(1);
  }

  const result = await whichOnNode(bin, node);
  console.log(JSON.stringify(result, null, 2));
}
