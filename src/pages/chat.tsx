import { useState } from 'react';
import Input from '../components/layout/Input';
import { DefaultChatTransport } from 'ai';
import { useChat } from '@ai-sdk/react';

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
  };

  return (
    <div className="p-4">
      <Input
        value={userInput}
        onChange={(value) => setUserInput(value)}
        onEnter={handleUserInput}
        placeholder="Enter a prompt to generate a chart"
      />
      {messages.map((message) => (
        <div key={message.id}>
          {message.role === 'user' ? 'User: ' : 'AI: '}
          {message.parts.map((part, index) =>
            part.type === 'text' ? <span key={index}>{part.text}</span> : null,
          )}
        </div>
      ))}
    </div>
  );
};

export default ChatPage;
