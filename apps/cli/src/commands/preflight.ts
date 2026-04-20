import { preflightBasic, preflightProfile, listPreflightProfiles } from "@bitron/openclaw-adapter";

export async function handlePreflightCommand(args: string[], node?: string) {
  const profile = args[1];

  if (!profile) {
    console.error(`Debes indicar un perfil. Disponibles: ${listPreflightProfiles().join(", ")}`);
    process.exit(1);
  }

  if (profile === "basic") {
    const result = await preflightBasic(node);
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (listPreflightProfiles().includes(profile)) {
    const result = await preflightProfile(profile, node);
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.error(`Perfil no reconocido. Disponibles: ${listPreflightProfiles().join(", ")}`);
  process.exit(1);
}
