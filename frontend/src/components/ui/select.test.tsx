import { render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it } from 'vitest';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';

describe('Select browser translation guard', () => {
  beforeAll(() => {
    Element.prototype.scrollIntoView = () => undefined;
  });

  it('marks the trigger and menu so Chrome does not rewrite their text nodes', () => {
    render(
      <Select open value="morning" onValueChange={() => undefined}>
        <SelectTrigger>
          <SelectValue placeholder="Round" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="morning">Morning</SelectItem>
        </SelectContent>
      </Select>
    );

    expect(screen.getByRole('combobox', { hidden: true }).getAttribute('translate')).toBe('no');
    expect(screen.getByRole('listbox').getAttribute('translate')).toBe('no');
    expect(screen.getByRole('option', { name: 'Morning' }).getAttribute('translate')).toBe('no');
  });
});
