export function getOption(args: string[], name: string): string | undefined {
  const idx = args.indexOf(name);
  if (idx === -1) return undefined;
  return args[idx + 1];
}

export function stripOption(args: string[], name: string): string[] {
  const idx = args.indexOf(name);
  if (idx === -1) return [...args];
  const copy = [...args];
  copy.splice(idx, 2);
  return copy;
}

export function normalizeArgs(rawArgs: string[]): string[] {
  return rawArgs[0] === "--" ? rawArgs.slice(1) : rawArgs;
}
