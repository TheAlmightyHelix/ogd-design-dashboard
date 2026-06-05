import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import Input from '../layout/Input';
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
} from 'ai';
import { useChat } from '@ai-sdk/react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import useDataStore from '../../store/useDataStore';
import useLayoutStore from '../../store/useLayoutStore';
import apiService from '../../services/apiService';
import { normalizeApiResponse } from '../../adapters/apiAdapter';
import {
  buildDashboardFromRecommendations,
  mergeChartsIntoDashboard,
} from '../../lib/dashboard/buildDashboardFromRecommendations';
import {
  formatDashboardContextForPrompt,
  getDashboardContext,
} from '../../lib/chat/dashboardContext';
import type {
  BuildDashboardInput,
  FeatureRecommendation,
} from '../../lib/ai/schemas';
import { Loader2 } from 'lucide-react';
import { markdownTypographyComponents } from '../markdown/markdownTypography';
import FeatureRecommendationList from './FeatureRecommendationList';
import ChatStatusIndicator from './ChatStatusIndicator';
import { getChatActivityLabel, isChatBusy } from './chatActivity';
import { trackEvent } from '../../lib/analytics';

function isToolPartWithOutput(
  part: { type: string; state?: string; output?: unknown },
): part is { type: string; state: 'output-available'; output: unknown } {
  return part.state === 'output-available' && part.output !== undefined;
}

const AppChatPanel = () => {
  const [userInput, setUserInput] = useState('');
  const [clientToolName, setClientToolName] = useState<string | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { addDataset, datasets } = useDataStore();
  const {
    layouts,
    currentLayout,
    createNamedLayout,
    applyDashboard,
    setCurrentLayout,
  } = useLayoutStore();
  const { messages, sendMessage, addToolOutput, status } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
      body: () => ({
        dashboardContext: formatDashboardContextForPrompt(
          getDashboardContext(),
        ),
      }),
    }),
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    async onToolCall({ toolCall }) {
      if (toolCall.dynamic) {
        return;
      }

      const isClientTool =
        toolCall.toolName === 'addDataset' ||
        toolCall.toolName === 'buildDashboard';
      if (isClientTool) {
        setClientToolName(toolCall.toolName);
      }

      if (toolCall.toolName === 'addDataset') {
        const { game, month, year, level } = toolCall.input as {
          game: string;
          month: string;
          year: string;
          level: 'population' | 'player' | 'session';
        };

        try {
          const response = await apiService.getDataset(game, month, year, level);
          if (!response) throw new Error('No response from API');

          const normalized = normalizeApiResponse(
            response,
            game,
            `${year}/${month}`,
            level,
          );
          addDataset(normalized);
          addToolOutput({
            tool: 'addDataset',
            toolCallId: toolCall.toolCallId,
            output: {
              type: 'text',
              text: `Dataset ${game} ${month}/${year} (${level}) added. Dataset id: ${normalized.id}`,
            },
          });
        } catch (error) {
          addToolOutput({
            tool: 'addDataset',
            toolCallId: toolCall.toolCallId,
            output: {
              type: 'text',
              text: `Server error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          });
        } finally {
          setClientToolName(null);
        }
        return;
      }

      if (toolCall.toolName === 'buildDashboard') {
        try {
          const { target, dashboardName, datasetId, recommendations } =
            toolCall.input as BuildDashboardInput;

          const dataset =
            datasets[datasetId] ??
            useDataStore.getState().datasets[datasetId];

          if (!dataset) {
            addToolOutput({
              tool: 'buildDashboard',
              toolCallId: toolCall.toolCallId,
              output: {
                type: 'text',
                text: `Dataset "${datasetId}" was not found. Use addDataset first, then build the dashboard with the returned dataset id.`,
              },
            });
            return;
          }

          const built = buildDashboardFromRecommendations(
            dataset,
            recommendations,
          );

          if (built.chartCount === 0) {
            addToolOutput({
              tool: 'buildDashboard',
              toolCallId: toolCall.toolCallId,
              output: {
                type: 'text',
                text: `Could not add charts: ${built.warnings.join(' ')}`,
              },
            });
            return;
          }

          const warningText =
            built.warnings.length > 0 ? ` Notes: ${built.warnings.join(' ')}` : '';

          if (target === 'current') {
            const layoutId = currentLayout;
            const existing =
              layoutId != null ? layouts[layoutId] : undefined;

            if (!layoutId || !existing) {
              addToolOutput({
                tool: 'buildDashboard',
                toolCallId: toolCall.toolCallId,
                output: {
                  type: 'text',
                  text: 'No dashboard tab is open. Ask the user if they want a new dashboard instead, then call buildDashboard with target "new".',
                },
              });
              return;
            }

            const merged = mergeChartsIntoDashboard(
              existing.layout,
              existing.charts,
              built,
            );
            applyDashboard(layoutId, merged.layout, merged.charts);

            trackEvent('ai_dashboard_built', {
              chart_count: built.chartCount,
              game: dataset.game,
              target: 'current',
            });

            addToolOutput({
              tool: 'buildDashboard',
              toolCallId: toolCall.toolCallId,
              output: {
                type: 'text',
                text: `Added ${built.chartCount} chart${built.chartCount === 1 ? '' : 's'} to "${existing.name}".${warningText}`,
              },
            });
            return;
          }

          const newLayoutId = createNamedLayout(dashboardName);
          applyDashboard(newLayoutId, built.layout, built.charts, dashboardName);
          setCurrentLayout(newLayoutId);

          trackEvent('ai_dashboard_built', {
            chart_count: built.chartCount,
            game: dataset.game,
            target: 'new',
          });

          addToolOutput({
            tool: 'buildDashboard',
            toolCallId: toolCall.toolCallId,
            output: {
              type: 'text',
              text: `Created dashboard "${dashboardName}" with ${built.chartCount} chart${built.chartCount === 1 ? '' : 's'}. Switched to the new dashboard tab.${warningText}`,
            },
          });
        } catch (error) {
          addToolOutput({
            tool: 'buildDashboard',
            toolCallId: toolCall.toolCallId,
            output: {
              type: 'text',
              text: `Failed to build dashboard: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          });
        } finally {
          setClientToolName(null);
        }
      }
    },
  });

  const activityLabel = useMemo(
    () =>
      getChatActivityLabel({
        status,
        messages,
        clientToolName,
      }),
    [status, messages, clientToolName],
  );

  const showActivityIndicator = useMemo(
    () => isChatBusy({ status, messages, clientToolName }),
    [status, messages, clientToolName],
  );

  const transcriptSignature = useMemo(
    () =>
      [
        messages
          .flatMap((m) =>
            m.parts.flatMap((p) =>
              p.type === 'text'
                ? [p.text]
                : 'state' in p
                  ? [`${p.type}:${p.state}`]
                  : [p.type],
            ),
          )
          .join('\u0001'),
        activityLabel ?? '',
      ].join('\u0002'),
    [messages, activityLabel],
  );

  useLayoutEffect(() => {
    const el = scrollAreaRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [transcriptSignature]);

  const handleUserInput = async () => {
    sendMessage({
      text: userInput,
    });
    setUserInput('');
  };

  const renderMessagePart = (
    part: (typeof messages)[number]['parts'][number],
    index: number,
  ) => {
    if (part.type === 'text') {
      return (
        <div
          key={index}
          className="max-w-none text-sm leading-[1.65] text-gray-900 [&>*:first-child]:mt-0"
        >
          <Markdown
            remarkPlugins={[remarkGfm]}
            components={markdownTypographyComponents}
          >
            {part.text}
          </Markdown>
        </div>
      );
    }

    if (
      part.type === 'tool-recommendFeatures' &&
      isToolPartWithOutput(part)
    ) {
      return (
        <FeatureRecommendationList
          key={index}
          recommendations={part.output as FeatureRecommendation[]}
        />
      );
    }

    if (part.type === 'tool-buildDashboard' && isToolPartWithOutput(part)) {
      const output = part.output as { type?: string; text?: string } | string;
      const text =
        typeof output === 'string'
          ? output
          : output && typeof output === 'object' && 'text' in output
            ? String(output.text)
            : JSON.stringify(output);
      return (
        <p key={index} className="mt-2 text-sm font-medium text-green-800">
          {text}
        </p>
      );
    }

    return null;
  };

  return (
    <div className="flex h-full max-h-full min-h-0 flex-col overflow-hidden">
      <div className="sticky top-0 z-10 shrink-0 border-b border-gray-200 bg-white pb-3">
        <Input
          value={userInput}
          onChange={(value) => setUserInput(value)}
          onEnter={handleUserInput}
          placeholder="Enter a prompt"
        />
      </div>
      <div
        ref={scrollAreaRef}
        className="flex min-h-0 min-w-0 flex-1 flex-col gap-2 overflow-y-auto pt-3"
      >
        {messages.map((message) => (
          <div
            key={message.id}
            className={
              message.role === 'user'
                ? 'self-end rounded-md bg-gray-100 px-3 py-2.5'
                : 'rounded-md bg-white px-3 py-2.5'
            }
          >
            {message.parts.map((part, index) => renderMessagePart(part, index))}
          </div>
        ))}
        {showActivityIndicator && activityLabel && (
          <ChatStatusIndicator label={activityLabel} />
        )}
      </div>
    </div>
  );
};

export default AppChatPanel;
