import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ICON_NAMES, Icon, SegmentedControl, Toggle } from '@nebula-clock/ui';

/** Nebula Clock's own glyphs, drawn in the family style (packages/ui/src/nebula/Icon.tsx). */
const CLOCK_ICONS = [
  'timer',
  'tasks',
  'chart',
  'start',
  'skipNext',
  'reset',
  'expand',
  'collapse',
  'miniWindow',
  'rain',
  'forest',
  'coffee',
  'waves',
  'flame',
  'target',
  'award',
  'percent',
  'clock',
  'edit',
] as const;

describe('Icon', () => {
  it.each(ICON_NAMES)(
    'renders %s on the 24 px grid in currentColor, hidden from assistive tech',
    (name) => {
      const { container } = render(<Icon name={name} />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('viewBox', '0 0 24 24');
      expect(svg).toHaveAttribute('stroke', 'currentColor');
      expect(svg).toHaveAttribute('stroke-width', '1.8');
      expect(svg).toHaveAttribute('aria-hidden', 'true');
      expect(svg?.children.length).toBeGreaterThan(0);
    },
  );

  it.each(CLOCK_ICONS)('draws the Nebula Clock icon %s with one duotone shape', (name) => {
    const { container } = render(<Icon name={name} />);
    expect(container.querySelectorAll('.icon-duo').length).toBeGreaterThanOrEqual(1);
  });
});

describe('Toggle', () => {
  it('is a switch button that announces and flips its state', () => {
    const onChange = vi.fn();
    render(
      <Toggle checked={false} onChange={onChange} label="Sounds" description="Short clicks" />,
    );
    const toggle = screen.getByRole('switch', { name: 'Sounds' });
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    expect(toggle).toHaveAccessibleDescription('Short clicks');
    fireEvent.click(toggle);
    expect(onChange).toHaveBeenCalledWith(true);
  });
});

describe('SegmentedControl', () => {
  it('keeps one tab stop and moves the selection with the arrow keys', () => {
    const onChange = vi.fn();
    render(
      <SegmentedControl
        label="Motion"
        value="full"
        onChange={onChange}
        options={[
          { value: 'full', label: 'Full' },
          { value: 'reduced', label: 'Reduced' },
          { value: 'off', label: 'Off' },
        ]}
      />,
    );
    const radios = screen.getAllByRole('radio');
    expect(radios.map((radio) => radio.tabIndex)).toEqual([0, -1, -1]);
    fireEvent.keyDown(radios[0]!, { key: 'ArrowLeft' });
    expect(onChange).toHaveBeenCalledWith('off');
  });
});
