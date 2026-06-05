import type { UIMessage } from 'ai';
import {
  getActiveToolLabelFromMessages,
  getChatActivityLabel,
  isChatBusy,
} from './chatActivity';

function assistantMessage(
  parts: UIMessage['parts'],
): UIMessage {
  return {
    id: 'a1',
    role: 'assistant',
    parts,
  };
}

describe('chatActivity', () => {
  it('detects pending server tool from message parts', () => {
    const messages = [
      assistantMessage([
        {
          type: 'tool-recommendFeatures',
          toolCallId: '1',
          state: 'input-available',
          input: {},
        },
      ]),
    ];

    expect(getActiveToolLabelFromMessages(messages)).toBe(
      'Recommending features for your question…',
    );
    expect(isChatBusy({ status: 'streaming', messages, clientToolName: null })).toBe(
      true,
    );
  });

  it('prefers client tool label over message parts', () => {
    const messages = [
      assistantMessage([
        {
          type: 'tool-addDataset',
          toolCallId: '1',
          state: 'input-available',
          input: {},
        },
      ]),
    ];

    expect(
      getChatActivityLabel({
        status: 'ready',
        messages,
        clientToolName: 'addDataset',
      }),
    ).toBe('Fetching dataset…');
  });

  it('is not busy when ready with no pending tools', () => {
    const messages = [
      assistantMessage([
        {
          type: 'tool-recommendFeatures',
          toolCallId: '1',
          state: 'output-available',
          input: {},
          output: [],
        },
        { type: 'text', text: 'Done.' },
      ]),
    ];

    expect(isChatBusy({ status: 'ready', messages, clientToolName: null })).toBe(
      false,
    );
  });
});
