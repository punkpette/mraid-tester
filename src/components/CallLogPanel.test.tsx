import { render } from '@testing-library/react-native';

import { CallLogPanel } from './CallLogPanel';
import type { MraidLogEntry } from '@/mraid';

function makeEntry(overrides: Partial<MraidLogEntry> = {}): MraidLogEntry {
  return {
    id: String(Math.random()),
    timestamp: Date.now(),
    severity: 'info',
    source: 'expand',
    message: 'Test message',
    ...overrides,
  };
}

describe('CallLogPanel', () => {
  it('shows empty-state text when log has no entries', async () => {
    const { getByText } = await render(<CallLogPanel log={[]} />);
    expect(getByText(/No MRAID calls yet/)).toBeTruthy();
  });

  it('does not show the empty-state text when log has entries', async () => {
    const { queryByText } = await render(<CallLogPanel log={[makeEntry()]} />);
    expect(queryByText(/No MRAID calls yet/)).toBeNull();
  });

  it('renders the source of each log entry', async () => {
    const entries = [
      makeEntry({ source: 'expand', message: 'Expanded.' }),
      makeEntry({ source: 'close', message: 'Closed.' }),
    ];

    const { getByText } = await render(<CallLogPanel log={entries} />);

    // source is displayed with textTransform: 'uppercase' in CSS, but the
    // text node value itself is lowercase — textTransform is a style, not a
    // string transform, so the query matches the raw value.
    expect(getByText('expand')).toBeTruthy();
    expect(getByText('close')).toBeTruthy();
  });

  it('renders the message of each log entry across all severity levels', async () => {
    const entries = [
      makeEntry({ message: 'Info message here.', severity: 'info' }),
      makeEntry({ message: 'Warning message here.', severity: 'warning' }),
      makeEntry({ message: 'Error message here.', severity: 'error' }),
    ];

    const { getByText } = await render(<CallLogPanel log={entries} />);

    expect(getByText('Info message here.')).toBeTruthy();
    expect(getByText('Warning message here.')).toBeTruthy();
    expect(getByText('Error message here.')).toBeTruthy();
  });
});
