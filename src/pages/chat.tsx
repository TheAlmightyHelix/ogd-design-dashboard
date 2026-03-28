import { useState } from 'react';
import Input from '../components/layout/Input';
import { DefaultChatTransport } from 'ai';
import { useChat } from '@ai-sdk/react';
import Markdown from 'react-markdown';

const ChatPage = () => {
  const [userInput, setUserInput] = useState('');
  // const [messages, setMessages] = useState<{ role: 'user' | 'assistant', content: string }[]>([]);
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
    }),
  });

  const handleUserInput = async () => {
    sendMessage({
      text: userInput,
    });
    setUserInput('');
  };

  return (
    <div className="p-4 flex flex-col h-full max-h-full min-h-0 overflow-hidden">
      <div className="shrink-0">
        <Input
          value={userInput}
          onChange={(value) => setUserInput(value)}
          onEnter={handleUserInput}
          placeholder="Enter a prompt"
        />
      </div>
      <div className="p-2 flex flex-col gap-2 flex-1 min-h-0 overflow-y-auto">
        {messages.map((message) => (
          <div
            key={message.id}
            className={
              message.role === 'user'
                ? 'bg-gray-100 p-2 rounded-md self-end'
                : 'bg-white p-2 rounded-md'
            }
          >
            {/* {message.role === 'user' ? 'User: ' : 'AI: '} */}
            {message.parts.map((part, index) =>
              part.type === 'text' ? (
                <Markdown key={index}>{part.text}</Markdown>
              ) : null,
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ChatPage;
