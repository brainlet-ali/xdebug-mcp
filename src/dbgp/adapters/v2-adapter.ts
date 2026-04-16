/**
 * Xdebug 2 Response Adapter
 *
 * Extends V3Adapter. Xdebug 2's DBGp responses share most of the same shape
 * as v3 — differences are narrow (a handful of attribute names, some newer
 * v3 attributes absent). Overrides land here as we test against real v2
 * engines and find concrete deltas.
 *
 * For now this class is intentionally a thin extension: v3 parsing works on
 * v2 responses for the vast majority of commands. Override methods selectively
 * when empirical testing reveals a mismatch.
 */

import { V3Adapter } from './v3-adapter.js';

export class V2Adapter extends V3Adapter {
  override readonly name = 'xdebug-2';
}
