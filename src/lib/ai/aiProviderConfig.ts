export type AiProvider = 'ollama' | 'openai';

const AI_PROVIDERS: AiProvider[] = ['ollama', 'openai'];

function resolveProvider(provider?: string): AiProvider {
  const value = (provider ?? process.env.AI_PROVIDER ?? 'ollama').toLowerCase();

  if (!AI_PROVIDERS.includes(value as AiProvider)) {
    throw new Error(
      `Invalid AI_PROVIDER "${value}". Must be one of: ${AI_PROVIDERS.join(', ')}`,
    );
  }

  return value as AiProvider;
}

function validateOllamaConfig(): void {
  if (!process.env.OLLAMA_MODEL) {
    throw new Error('OLLAMA_MODEL is not set');
  }
}

function validateOpenAiConfig(): void {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set');
  }
}

export function validateAiProviderConfig(provider?: string): void {
  const resolved = resolveProvider(provider);

  switch (resolved) {
    case 'ollama':
      validateOllamaConfig();
      break;
    case 'openai':
      validateOpenAiConfig();
      break;
    default: {
      const _exhaustive: never = resolved;
      return _exhaustive;
    }
  }
}

export function getResolvedAiProvider(provider?: string): AiProvider {
  return resolveProvider(provider);
}
