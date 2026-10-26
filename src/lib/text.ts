/**
 * Forms send a textarea's line breaks as CRLF, but its maxLength counts each one as a single
 * character. Normalize before checking a length so the server counts what the text box counted.
 */
export function normalizeLineBreaks(s: string): string {
  return s.replace(/\r\n?/g, "\n");
}
