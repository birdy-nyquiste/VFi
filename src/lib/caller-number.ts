/** The fields of a phone number that choosing one to call from depends on. */
export interface CallerNumber {
  id: string;
  status: string;
  agentId: string | null;
  createdAt: Date;
}

/**
 * The number an outbound call goes from when the user doesn't pick one: the agent's own number (its
 * earliest-bought, if it answers several), otherwise the earliest-bought active number.
 */
export function defaultCallerNumber<T extends CallerNumber>(numbers: T[], agentId: string): T | undefined {
  const active = numbers.filter((n) => n.status === "active").sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  return active.find((n) => n.agentId === agentId) ?? active[0];
}
