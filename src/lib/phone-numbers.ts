/** The fields of a user's phone number that ordering and choosing them depend on. */
export interface OwnedNumber {
  id: string;
  status: string;
  agentId: string | null;
  createdAt: Date;
}

/** The user's active numbers, earliest-bought first: the order every list and picker shows them in. */
export function activeNumbersByAge<T extends OwnedNumber>(numbers: T[]): T[] {
  return numbers.filter((n) => n.status === "active").sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
}

/**
 * The number an outbound call goes from when the user doesn't pick one: the agent's own number (its
 * earliest-bought, if it answers several), otherwise the earliest-bought active number.
 */
export function defaultCallerNumber<T extends OwnedNumber>(numbers: T[], agentId: string): T | undefined {
  const active = activeNumbersByAge(numbers);
  return active.find((n) => n.agentId === agentId) ?? active[0];
}

/** The user's own number on a call: the one called, or the one it was placed from. */
export function ourNumber(call: { direction: string; fromNumber: string; toNumber: string }): string {
  return call.direction === "inbound" ? call.toNumber : call.fromNumber;
}
