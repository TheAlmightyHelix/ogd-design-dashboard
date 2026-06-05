import type { UIMessage } from 'ai';

export const TOOL_ACTIVITY_LABELS: Record<string, string> = {
  lookupGames: 'Looking up available games…',
  getGameManifest: 'Loading feature definitions…',
  recommendFeatures: 'Recommending features for your question…',
  addDataset: 'Fetching dataset…',
  buildDashboard: 'Building your dashboard…',
};

const STATUS_FALLBACK_LABELS: Record<string, string> = {
  submitted: 'Connecting to assistant…',
  streaming: 'Generating response…',
  ready: 'Finishing up…',
};

type ToolPart = {
  type: string;
  state?: string;
};

function isPendingToolPart(part: ToolPart): boolean {
  if (!part.type.startsWith('tool-')) return false;
  const { state } = part;
  return (
    state !== 'output-available' &&
    state !== 'output-error' &&
    state !== 'output-denied'
  );
}

function toolNameFromPartType(type: string): string | null {
  if (!type.startsWith('tool-')) return null;
  return type.slice('tool-'.length);
}

export function getActiveToolLabelFromMessages(
  messages: UIMessage[],
): string | null {
  const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant');
  if (!lastAssistant) return null;

  for (const part of lastAssistant.parts) {
    if (!isPendingToolPart(part as ToolPart)) continue;
    const name = toolNameFromPartType(part.type);
    if (!name) continue;
    return TOOL_ACTIVITY_LABELS[name] ?? `Running ${name}…`;
  }

  return null;
}

export function getChatActivityLabel(options: {
  status: string;
  messages: UIMessage[];
  clientToolName: string | null;
}): string | null {
  const { status, messages, clientToolName } = options;

  if (status === 'error') return null;

  if (clientToolName) {
    return (
      TOOL_ACTIVITY_LABELS[clientToolName] ??
      `Running ${clientToolName}…`
    );
  }

  const toolLabel = getActiveToolLabelFromMessages(messages);
  if (toolLabel) return toolLabel;

  if (status === 'submitted' || status === 'streaming') {
    return STATUS_FALLBACK_LABELS[status] ?? 'Working…';
  }

  return null;
}

export function isChatBusy(options: {
  status: string;
  messages: UIMessage[];
  clientToolName: string | null;
}): boolean {
  if (options.status === 'error') return false;
  if (options.clientToolName) return true;
  if (options.status === 'submitted' || options.status === 'streaming') {
    return true;
  }
  return getActiveToolLabelFromMessages(options.messages) !== null;
}
