/**
 * DBGp Protocol Adapter
 *
 * The DBGp protocol itself is stable across Xdebug 2 and 3, but the XML
 * response shapes differ in a handful of places (attribute names, nested
 * element structure, some encoding defaults). An adapter isolates those
 * version-specific differences so the connection/session/tool layers stay
 * protocol-agnostic.
 *
 * Init packet parsing is intentionally NOT on the adapter: it has to run
 * before we know which version we're talking to, and its shape is stable.
 */

import type { DbgpResponse, StackFrame, Context, Property, Breakpoint } from './types.js';

export interface DbgpResponseAdapter {
  readonly name: string;
  parseStackFrames(response: DbgpResponse): StackFrame[];
  parseContexts(response: DbgpResponse): Context[];
  parseProperties(response: DbgpResponse): Property[];
  parseProperty(response: DbgpResponse): Property | null;
  parseBreakpoints(response: DbgpResponse): Breakpoint[];
  parseBreakpointSet(response: DbgpResponse): { id: string; resolved: boolean };
}

/**
 * Pick the right adapter from the init packet's engine info.
 * Falls back to V3 for unknown engines — v3 is the current standard.
 */
export async function selectAdapter(
  engineName: string | undefined,
  engineVersion: string | undefined
): Promise<DbgpResponseAdapter> {
  const major = parseInt((engineVersion ?? '').split('.')[0] ?? '', 10);
  const isXdebug = (engineName ?? '').toLowerCase().includes('xdebug');

  if (isXdebug && major === 2) {
    const { V2Adapter } = await import('./adapters/v2-adapter.js');
    return new V2Adapter();
  }

  const { V3Adapter } = await import('./adapters/v3-adapter.js');
  return new V3Adapter();
}
