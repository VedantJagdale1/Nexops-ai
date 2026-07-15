const durationPattern = /^(\d+)([smhd])$/;

const unitMilliseconds = {
  s: 1_000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
} as const;

export function durationToMilliseconds(duration: string): number {
  const match = durationPattern.exec(duration);
  if (!match) throw new Error(`Unsupported duration format: ${duration}`);

  const amount = Number(match[1]);
  const unit = match[2] as keyof typeof unitMilliseconds;
  return amount * unitMilliseconds[unit];
}
