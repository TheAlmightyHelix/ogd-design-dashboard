import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import Input from '../layout/Input';
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
} from 'ai';
import { useChat } from '@ai-sdk/react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import useDataStore from '../../store/useDataStore';
import apiService from '../../services/apiService';
import { normalizeApiResponse } from '../../adapters/apiAdapter';
import { Loader2 } from 'lucide-react';
import { markdownTypographyComponents } from '../markdown/markdownTypography';

const AppChatPanel = () => {
  const [userInput, setUserInput] = useState('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { addDataset } = useDataStore();
  const { messages, sendMessage, addToolOutput, status } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
    }),
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    async onToolCall({ toolCall }) {
      if (toolCall.dynamic) {
        return;
      }

      if (toolCall.toolName === 'addDataset') {
        const { game, month, year, level } = toolCall.input as {
          game: string;
          month: string;
          year: string;
          level: 'population' | 'player' | 'session';
        };

        apiService
          .getDataset(game, month, year, level)
          .then((response) => {
            if (response) {
              addDataset(
                normalizeApiResponse(response, game, `${year}/${month}`, level),
              );
              addToolOutput({
                tool: 'addDataset',
                toolCallId: toolCall.toolCallId,
                output: {
                  type: 'text',
                  text: `Dataset ${game} ${month} ${year} ${level} added to local storage.`,
                },
              });
            } else throw new Error('No response from API');
          })
          .catch((error) => {
            addToolOutput({
              tool: 'addDataset',
              toolCallId: toolCall.toolCallId,
              output: {
                type: 'text',
                text: `Server error: ${error.message}`,
              },
            });
          });
      }
    },
  });

  const transcriptSignature = useMemo(
    () =>
      messages
        .flatMap((m) =>
          m.parts.flatMap((p) => (p.type === 'text' ? [p.text] : [])),
        )
        .join('\u0001'),
    [messages],
  );

  useLayoutEffect(() => {
    const el = scrollAreaRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [transcriptSignature, status]);

  const handleUserInput = async () => {
    sendMessage({
      text: userInput,
    });
    setUserInput('');
  };

  return (
    <div className="flex h-full max-h-full min-h-0 flex-col overflow-hidden">
      <div className="sticky top-0 z-10 shrink-0 border-b border-gray-200 bg-white pb-3">
        <Input
          value={userInput}
          onChange={(value) => setUserInput(value)}
          onEnter={handleUserInput}
          placeholder="Enter a prompt"
        />
      </div>
      <div
        ref={scrollAreaRef}
        className="flex min-h-0 min-w-0 flex-1 flex-col gap-2 overflow-y-auto pt-3"
      >
        {messages.map((message) => (
          <div
            key={message.id}
            className={
              message.role === 'user'
                ? 'self-end rounded-md bg-gray-100 px-3 py-2.5'
                : 'rounded-md bg-white px-3 py-2.5'
            }
          >
            {message.parts.map((part, index) =>
              part.type === 'text' ? (
                <div
                  key={index}
                  className="max-w-none text-sm leading-[1.65] text-gray-900 [&>*:first-child]:mt-0"
                >
                  <Markdown
                    remarkPlugins={[remarkGfm]}
                    components={markdownTypographyComponents}
                  >
                    {part.text}
                  </Markdown>
                </div>
              ) : null,
            )}
          </div>
        ))}
        {status === 'submitted' && (
          <div className="flex items-center justify-start">
            <Loader2 className="w-4 h-4 text-gray-500 animate-spin" />
            <span className="text-sm text-gray-500">Thinking...</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default AppChatPanel;
