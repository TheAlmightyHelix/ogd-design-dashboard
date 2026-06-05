import { validateAiProviderConfig } from './aiProviderConfig';

export type AssistantDisabledReason =
  | 'flag_off'
  | 'invalid_provider'
  | 'missing_config';

export type AssistantAvailability = {
  enabled: boolean;
  reason?: AssistantDisabledReason;
  message?: string;
};

const ENABLED_VALUES = new Set(['true', '1', 'yes']);

function isAssistantFlagEnabled(): boolean {
  const raw = process.env.AI_ASSISTANT_ENABLED?.trim().toLowerCase();
  if (!raw) {
    return false;
  }
  return ENABLED_VALUES.has(raw);
}

function classifyConfigError(message: string): AssistantDisabledReason {
  if (message.startsWith('Invalid AI_PROVIDER')) {
    return 'invalid_provider';
  }
  return 'missing_config';
}

export function getAssistantAvailability(): AssistantAvailability {
  if (!isAssistantFlagEnabled()) {
    return {
      enabled: false,
      reason: 'flag_off',
      message: 'Assistant is disabled in this environment',
    };
  }

  try {
    validateAiProviderConfig();
    return { enabled: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Invalid AI configuration';
    return {
      enabled: false,
      reason: classifyConfigError(message),
      message,
    };
  }
}

export function isAssistantEnabled(): boolean {
  return getAssistantAvailability().enabled;
}
