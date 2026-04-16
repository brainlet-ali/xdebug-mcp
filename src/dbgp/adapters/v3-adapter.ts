/**
 * Xdebug 3 Response Adapter
 *
 * Parses response XML shapes as emitted by Xdebug 3.x. Also serves as the
 * default/fallback adapter for unknown engines.
 */

import type { DbgpResponse, StackFrame, Context, Property, Breakpoint, BreakpointType, BreakpointState, HitCondition } from '../types.js';
import type { DbgpResponseAdapter } from '../adapter.js';

export class V3Adapter implements DbgpResponseAdapter {
  readonly name: string = 'xdebug-3';

  parseStackFrames(response: DbgpResponse): StackFrame[] {
    const data = response.data as Record<string, unknown>;
    const stackData = data['stack'];

    if (!stackData) return [];

    const frames = Array.isArray(stackData) ? stackData : [stackData];
    return frames.map((frame: Record<string, string>) => ({
      level: parseInt(frame['@_level'] || '0', 10),
      type: (frame['@_type'] || 'file') as 'file' | 'eval',
      filename: frame['@_filename'] || '',
      lineno: parseInt(frame['@_lineno'] || '0', 10),
      where: frame['@_where'],
      cmdbegin: frame['@_cmdbegin'],
      cmdend: frame['@_cmdend'],
    }));
  }

  parseContexts(response: DbgpResponse): Context[] {
    const data = response.data as Record<string, unknown>;
    const contextData = data['context'];

    if (!contextData) return [];

    const contexts = Array.isArray(contextData) ? contextData : [contextData];
    return contexts.map((ctx: Record<string, string>) => ({
      id: parseInt(ctx['@_id'] || '0', 10),
      name: ctx['@_name'] || '',
    }));
  }

  parseProperties(response: DbgpResponse): Property[] {
    const data = response.data as Record<string, unknown>;
    const propertyData = data['property'];

    if (!propertyData) return [];

    const properties = Array.isArray(propertyData) ? propertyData : [propertyData];
    return properties.map((prop) => this.parsePropertyNode(prop as Record<string, unknown>));
  }

  parseProperty(response: DbgpResponse): Property | null {
    const data = response.data as Record<string, unknown>;
    const propertyData = data['property'];

    if (!propertyData) return null;

    return this.parsePropertyNode(propertyData as Record<string, unknown>);
  }

  parseBreakpoints(response: DbgpResponse): Breakpoint[] {
    const data = response.data as Record<string, unknown>;
    const bpData = data['breakpoint'];

    if (!bpData) return [];

    const breakpoints = Array.isArray(bpData) ? bpData : [bpData];
    return breakpoints.map((bp: Record<string, string>) => ({
      id: bp['@_id'] || '',
      type: (bp['@_type'] || 'line') as BreakpointType,
      state: (bp['@_state'] || 'enabled') as BreakpointState,
      resolved: bp['@_resolved'] === '1',
      filename: bp['@_filename'],
      lineno: bp['@_lineno'] ? parseInt(bp['@_lineno'], 10) : undefined,
      function: bp['@_function'],
      exception: bp['@_exception'],
      expression: bp['@_expression'],
      hitCount: bp['@_hit_count'] ? parseInt(bp['@_hit_count'], 10) : undefined,
      hitValue: bp['@_hit_value'] ? parseInt(bp['@_hit_value'], 10) : undefined,
      hitCondition: bp['@_hit_condition'] as HitCondition | undefined,
    }));
  }

  parseBreakpointSet(response: DbgpResponse): { id: string; resolved: boolean } {
    const data = response.data as Record<string, string>;
    return {
      id: data['@_id'] || '',
      resolved: data['@_resolved'] === '1',
    };
  }

  protected parsePropertyNode(prop: Record<string, unknown>): Property {
    const attrs = prop as Record<string, string>;
    const property: Property = {
      name: attrs['@_name'] || '',
      fullname: attrs['@_fullname'] || attrs['@_name'] || '',
      type: attrs['@_type'] || 'unknown',
    };

    if (attrs['@_classname']) property.classname = attrs['@_classname'];
    if (attrs['@_facet']) property.facet = attrs['@_facet'];
    if (attrs['@_constant'] === '1') property.constant = true;
    if (attrs['@_children'] === '1') property.children = true;
    if (attrs['@_numchildren']) property.numchildren = parseInt(attrs['@_numchildren'], 10);
    if (attrs['@_size']) property.size = parseInt(attrs['@_size'], 10);
    if (attrs['@_page']) property.page = parseInt(attrs['@_page'], 10);
    if (attrs['@_pagesize']) property.pagesize = parseInt(attrs['@_pagesize'], 10);
    if (attrs['@_address']) property.address = attrs['@_address'];
    if (attrs['@_key']) property.key = attrs['@_key'];
    if (attrs['@_encoding']) property.encoding = attrs['@_encoding'];

    const textValue = prop['#text'] as string | undefined;
    if (textValue !== undefined) {
      if (attrs['@_encoding'] === 'base64') {
        property.value = Buffer.from(textValue, 'base64').toString('utf8');
      } else {
        property.value = textValue;
      }
    }

    const nestedProps = prop['property'];
    if (nestedProps) {
      const nested = Array.isArray(nestedProps) ? nestedProps : [nestedProps];
      property.properties = nested.map((p) =>
        this.parsePropertyNode(p as Record<string, unknown>)
      );
    }

    return property;
  }
}
