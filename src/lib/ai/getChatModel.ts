import { openai } from '@ai-sdk/openai';
import type { LanguageModel } from 'ai';
import { createOllama, ollama as defaultOllama } from 'ai-sdk-ollama';
import {
  getResolvedAiProvider,
  validateAiProviderConfig,
  type AiProvider,
} from './aiProviderConfig';

export type { AiProvider };

function getOllamaModel(): LanguageModel {
  const model = process.env.OLLAMA_MODEL!;

  const client = process.env.OLLAMA_BASE_URL
    ? createOllama({ baseURL: process.env.OLLAMA_BASE_URL })
    : defaultOllama;

  return client(model);
}

function getOpenAiModel(): LanguageModel {
  return openai(process.env.OPENAI_MODEL ?? 'gpt-4o-mini');
}

export { validateAiProviderConfig };

export function getChatModel(provider?: string): LanguageModel {
  validateAiProviderConfig(provider);
  const resolved = getResolvedAiProvider(provider);

  switch (resolved) {
    case 'ollama':
      return getOllamaModel();
    case 'openai':
      return getOpenAiModel();
    default: {
      const _exhaustive: never = resolved;
      return _exhaustive;
    }
  }
}
