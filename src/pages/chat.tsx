import { useState } from 'react';
import type { Components } from 'react-markdown';
import Input from '../components/layout/Input';
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
} from 'ai';
import { useChat } from '@ai-sdk/react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import useLayoutStore from '../store/useLayoutStore';
import useDataStore from '../store/useDataStore';
import apiService from '../services/apiService';
import { normalizeApiResponse } from '../adapters/apiAdapter';

/** Typography-only overrides for readable markdown (size + line height + vertical rhythm). */
const markdownComponents: Components = {
  p: ({ children, ...props }) => (
    <p className="mb-3 last:mb-0" {...props}>
      {children}
    </p>
  ),
  h1: ({ children, ...props }) => (
    <h1
      className="mb-3 mt-5 text-xl font-semibold leading-snug first:mt-0"
      {...props}
    >
      {children}
    </h1>
  ),
  h2: ({ children, ...props }) => (
    <h2
      className="mb-2 mt-4 text-lg font-semibold leading-snug first:mt-0"
      {...props}
    >
      {children}
    </h2>
  ),
  h3: ({ children, ...props }) => (
    <h3
      className="mb-2 mt-3 text-base font-semibold leading-snug first:mt-0"
      {...props}
    >
      {children}
    </h3>
  ),
  ul: ({ children, ...props }) => (
    <ul className="mb-3 ml-5 list-disc space-y-1.5" {...props}>
      {children}
    </ul>
  ),
  ol: ({ children, ...props }) => (
    <ol className="mb-3 ml-5 list-decimal space-y-1.5" {...props}>
      {children}
    </ol>
  ),
  li: ({ children, ...props }) => (
    <li className="leading-[1.65] pl-0.5" {...props}>
      {children}
    </li>
  ),
  hr: ({ ...props }) => <hr className="my-4 border-gray-200" {...props} />,
  table: ({ children, ...props }) => (
    <div className="my-3 overflow-x-auto">
      <table
        className="w-full border-collapse border border-gray-300 text-sm leading-normal"
        {...props}
      >
        {children}
      </table>
    </div>
  ),
  thead: ({ children, ...props }) => (
    <thead className="bg-gray-100" {...props}>
      {children}
    </thead>
  ),
  th: ({ children, ...props }) => (
    <th
      className="border border-gray-300 px-3 py-2 text-left font-semibold"
      {...props}
    >
      {children}
    </th>
  ),
  td: ({ children, ...props }) => (
    <td
      className="border border-gray-300 px-3 py-2 align-top leading-normal"
      {...props}
    >
      {children}
    </td>
  ),
};

const ChatPage = () => {
  const [userInput, setUserInput] = useState('');
  const { createLayout } = useLayoutStore();
  const { addDataset } = useDataStore();
  const { messages, sendMessage, addToolOutput } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
    }),
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    async onToolCall({ toolCall }) {
      if (toolCall.dynamic) {
        return;
      }

      if (toolCall.toolName === 'addDataset') {
        console.log('addDataset', toolCall.input);
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

  const handleUserInput = async () => {
    sendMessage({
      text: userInput,
    });
    setUserInput('');
  };

  return (
    <div className="flex h-full max-h-full min-h-0 flex-col overflow-hidden p-4">
      <div className="sticky top-0 z-10 shrink-0 border-b border-gray-200 bg-white pb-3">
        <Input
          value={userInput}
          onChange={(value) => setUserInput(value)}
          onEnter={handleUserInput}
          placeholder="Enter a prompt"
        />
      </div>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2 overflow-y-auto pt-3">
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
                  className="max-w-none text-base leading-[1.65] text-gray-900 [&>*:first-child]:mt-0"
                >
                  <Markdown
                    remarkPlugins={[remarkGfm]}
                    components={markdownComponents}
                  >
                    {part.text}
                  </Markdown>
                </div>
              ) : null,
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ChatPage;
