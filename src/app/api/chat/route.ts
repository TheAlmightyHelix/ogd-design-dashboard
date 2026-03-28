import { convertToModelMessages, streamText, UIMessage } from 'ai';
import { ollama } from 'ai-sdk-ollama';

// import { createOllama } from 'ai-sdk-ollama';

// export const ollama = createOllama({
//   baseURL: process.env.OLLAMA_BASE_URL,
// });

export async function POST(request: Request) {
  const { messages }: { messages: UIMessage[] } = await request.json();

  if (!process.env.OLLAMA_MODEL) {
    return new Response('OLLAMA_MODEL is not set', { status: 500 });
  }

  const result = streamText({
    model: ollama(process.env.OLLAMA_MODEL),
    system:
      'You are a helpful assistant that can help with questions about the data',
    messages: await convertToModelMessages(messages),
  });
  return result.toUIMessageStreamResponse();
}
