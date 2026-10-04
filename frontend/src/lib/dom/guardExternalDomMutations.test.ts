import { describe, expect, it } from 'vitest';

import { installExternalDomMutationGuard } from './guardExternalDomMutations';

describe('installExternalDomMutationGuard', () => {
  it('does not throw when removeChild target was moved by an external script', () => {
    installExternalDomMutationGuard();
    const parent = document.createElement('div');
    const child = document.createElement('span');
    const other = document.createElement('div');
    other.appendChild(child);

    expect(() => parent.removeChild(child)).not.toThrow();
    expect(other.contains(child)).toBe(true);
  });

  it('still removes a node that is actually a child', () => {
    installExternalDomMutationGuard();
    const parent = document.createElement('div');
    const child = document.createElement('span');
    parent.appendChild(child);

    parent.removeChild(child);

    expect(parent.childNodes).toHaveLength(0);
  });

  it('does not throw when insertBefore reference was moved', () => {
    installExternalDomMutationGuard();
    const parent = document.createElement('div');
    const reference = document.createElement('span');
    const incoming = document.createElement('em');
    const other = document.createElement('div');
    other.appendChild(reference);

    expect(() => parent.insertBefore(incoming, reference)).not.toThrow();
    expect(parent.contains(incoming)).toBe(false);
  });
});
