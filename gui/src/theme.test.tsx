import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { ThemeProvider, useTheme } from './theme';

function ThemeProbe(): JSX.Element {
  const { resolvedTheme, toggleTheme } = useTheme();
  return (
    <button type="button" onClick={toggleTheme} aria-label="Toggle theme">
      Current theme: {resolvedTheme}
    </button>
  );
}

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe('ThemeProvider', () => {
  it('toggles the data-theme attribute and state', async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>
    );

    const trigger = screen.getByLabelText('Toggle theme');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');

    await user.click(trigger);

    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(trigger.textContent).toContain('dark');
  });
});
