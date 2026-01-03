// @ts-nocheck
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

import { Button } from '../components/ui/button';

describe('Button', () => {
  it('renders and handles click', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    const btn = screen.getByRole('button', { name: /click me/i });
    await user.click(btn);
    expect(handleClick).toHaveBeenCalled();
  });
});
