import {
  getAssistantAvailability,
  isAssistantEnabled,
} from './assistantFeature';

const ORIGINAL_ENV = { ...process.env };

function setEnv(overrides: Record<string, string | undefined>): void {
  process.env = { ...ORIGINAL_ENV, ...overrides };
}

describe('assistantFeature', () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it('disables assistant when AI_ASSISTANT_ENABLED is unset', () => {
    setEnv({
      AI_ASSISTANT_ENABLED: undefined,
      AI_PROVIDER: 'ollama',
      OLLAMA_MODEL: 'llama3',
    });

    expect(getAssistantAvailability()).toEqual({
      enabled: false,
      reason: 'flag_off',
      message: 'Assistant is disabled in this environment',
    });
    expect(isAssistantEnabled()).toBe(false);
  });

  it('disables assistant when AI_ASSISTANT_ENABLED is false', () => {
    setEnv({
      AI_ASSISTANT_ENABLED: 'false',
      AI_PROVIDER: 'ollama',
      OLLAMA_MODEL: 'llama3',
    });

    expect(getAssistantAvailability()).toMatchObject({
      enabled: false,
      reason: 'flag_off',
    });
  });

  it('disables assistant when AI_PROVIDER is invalid', () => {
    setEnv({
      AI_ASSISTANT_ENABLED: 'true',
      AI_PROVIDER: 'unknown',
      OLLAMA_MODEL: 'llama3',
    });

    expect(getAssistantAvailability()).toMatchObject({
      enabled: false,
      reason: 'invalid_provider',
    });
  });

  it('disables assistant when ollama config is missing OLLAMA_MODEL', () => {
    setEnv({
      AI_ASSISTANT_ENABLED: 'true',
      AI_PROVIDER: 'ollama',
      OLLAMA_MODEL: undefined,
    });

    expect(getAssistantAvailability()).toMatchObject({
      enabled: false,
      reason: 'missing_config',
      message: 'OLLAMA_MODEL is not set',
    });
  });

  it('disables assistant when openai config is missing OPENAI_API_KEY', () => {
    setEnv({
      AI_ASSISTANT_ENABLED: 'true',
      AI_PROVIDER: 'openai',
      OPENAI_API_KEY: undefined,
    });

    expect(getAssistantAvailability()).toMatchObject({
      enabled: false,
      reason: 'missing_config',
      message: 'OPENAI_API_KEY is not set',
    });
  });

  it('enables assistant with valid ollama config', () => {
    setEnv({
      AI_ASSISTANT_ENABLED: 'true',
      AI_PROVIDER: 'ollama',
      OLLAMA_MODEL: 'llama3',
    });

    expect(getAssistantAvailability()).toEqual({ enabled: true });
    expect(isAssistantEnabled()).toBe(true);
  });

  it('enables assistant with valid openai config', () => {
    setEnv({
      AI_ASSISTANT_ENABLED: 'yes',
      AI_PROVIDER: 'openai',
      OPENAI_API_KEY: 'sk-test',
    });

    expect(getAssistantAvailability()).toEqual({ enabled: true });
  });

  it('accepts "1" as an enabled flag value', () => {
    setEnv({
      AI_ASSISTANT_ENABLED: '1',
      AI_PROVIDER: 'ollama',
      OLLAMA_MODEL: 'llama3',
    });

    expect(isAssistantEnabled()).toBe(true);
  });
});
