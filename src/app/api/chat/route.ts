import {
  convertToModelMessages,
  streamText,
  UIMessage,
  tool,
  stepCountIs,
} from 'ai';
import { ollama } from 'ai-sdk-ollama';
import apiService from '../../../services/apiService';
import { z } from 'zod';

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
    tools: {
      lookupGames: tool({
        description: 'Lookup games from the Open Game Data dataset repository.',
        inputSchema: z.object({}),
        execute: async () => {
          return apiService.getGames();
        },
      }),
      fetchDataset: tool({
        description:
          'Fetch a dataset from the Open Game Data dataset repository. Use your best judgement to convert user input into valid input for this tool.',
        inputSchema: z.object({
          game: z.string(),
          month: z.string().regex(/^(0[1-9]|1[0-2])$/, 'Month must be 01-12'),
          year: z.string().regex(/^\d{4}$/, 'Year must be 4 digits'),
          level: z.enum(['population', 'player', 'session']),
        }),
        execute: async ({ game, month, year, level }) => {
          const dataset = await apiService.getDataset(game, month, year, level);

          return dataset;
        },
      }),
    },
    onAbort: () => {
      console.log('Aborting...');
    },
    onFinish: () => {
      console.log('Finished...');
    },
    onError: (error) => {
      console.log('Error...', error);
    },
    system:
      'You are a helpful assistant that can help with questions and tasks related to Open Game Data Dashboard (a visualization tool for game data).',
    messages: await convertToModelMessages(messages),
    stopWhen: stepCountIs(3),
  });
  return result.toUIMessageStreamResponse();
}
