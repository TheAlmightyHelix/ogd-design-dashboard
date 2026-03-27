import { convertToModelMessages, streamText, UIMessage } from 'ai';
import { ollama } from 'ai-sdk-ollama';

// import { createOllama } from 'ai-sdk-ollama';

// export const ollama = createOllama({
//   baseURL: 'http://localhost:11434',
// });

export async function POST(request: Request) {
  const { messages }: { messages: UIMessage[] } = await request.json();

  const result = streamText({
    model: ollama('lfm2:latest'),
    system:
      'You are a helpful assistant that can help with questions about the data. Do not talk in markdown format.',
    messages: await convertToModelMessages(messages),
  });
  return result.toUIMessageStreamResponse();
}
