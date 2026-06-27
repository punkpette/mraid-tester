import { fireEvent, render } from '@testing-library/react-native';

import { KeyValueEditor } from './KeyValueEditor';
import type { KeyValuePair } from '@/types/settings';

function pair(id: string, key: string, value: string): KeyValuePair {
  return { id, key, value };
}

describe('KeyValueEditor', () => {
  it('renders existing pairs as key/value inputs', async () => {
    const { getByDisplayValue } = await render(
      <KeyValueEditor pairs={[pair('kv1', 'env', 'prod')]} onChange={jest.fn()} />,
    );

    expect(getByDisplayValue('env')).toBeTruthy();
    expect(getByDisplayValue('prod')).toBeTruthy();
  });

  it('calls onChange with a new empty pair appended when "+ Add key-value" is pressed', async () => {
    const onChange = jest.fn();
    const { getByText } = await render(
      <KeyValueEditor pairs={[pair('kv1', 'env', 'prod')]} onChange={onChange} />,
    );

    fireEvent.press(getByText('+ Add key-value'));

    expect(onChange).toHaveBeenCalledTimes(1);
    const [newPairs] = onChange.mock.calls[0] as [KeyValuePair[]];
    expect(newPairs).toHaveLength(2);
    expect(newPairs[0]).toEqual(pair('kv1', 'env', 'prod'));
    expect(newPairs[1]).toMatchObject({ key: '', value: '' });
  });

  it('calls onChange with the updated key when a key input changes', async () => {
    const onChange = jest.fn();
    const pairs = [pair('kv1', 'env', 'prod'), pair('kv2', 'region', 'us-east')];
    const { getByDisplayValue } = await render(
      <KeyValueEditor pairs={pairs} onChange={onChange} />,
    );

    fireEvent.changeText(getByDisplayValue('env'), 'environment');

    const [newPairs] = onChange.mock.calls[0] as [KeyValuePair[]];
    expect(newPairs[0]!.key).toBe('environment');
    expect(newPairs[0]!.value).toBe('prod');
    // Second pair is untouched.
    expect(newPairs[1]).toEqual(pair('kv2', 'region', 'us-east'));
  });

  it('calls onChange with the updated value when a value input changes', async () => {
    const onChange = jest.fn();
    const { getByDisplayValue } = await render(
      <KeyValueEditor pairs={[pair('kv1', 'env', 'prod')]} onChange={onChange} />,
    );

    fireEvent.changeText(getByDisplayValue('prod'), 'staging');

    const [newPairs] = onChange.mock.calls[0] as [KeyValuePair[]];
    expect(newPairs[0]!.value).toBe('staging');
    expect(newPairs[0]!.key).toBe('env');
  });

  it('calls onChange with the pair removed when the ✕ button for that pair is pressed', async () => {
    const onChange = jest.fn();
    const pairs = [pair('kv1', 'env', 'prod'), pair('kv2', 'region', 'us-east')];
    const { getAllByText } = await render(<KeyValueEditor pairs={pairs} onChange={onChange} />);

    // Press the first ✕ button (removes kv1).
    fireEvent.press(getAllByText('✕')[0]!);

    const [newPairs] = onChange.mock.calls[0] as [KeyValuePair[]];
    expect(newPairs).toHaveLength(1);
    expect(newPairs[0]).toEqual(pair('kv2', 'region', 'us-east'));
  });

  it('renders the Add button even with an empty pairs array', async () => {
    const { getByText } = await render(<KeyValueEditor pairs={[]} onChange={jest.fn()} />);
    expect(getByText('+ Add key-value')).toBeTruthy();
  });
});
