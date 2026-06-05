import {
  convertToModelMessages,
  generateObject,
  streamText,
  UIMessage,
  tool,
  stepCountIs,
} from 'ai';
import apiService from '../../../services/apiService';
import { getAssistantAvailability } from '../../../lib/ai/assistantFeature';
import { getChatModel } from '../../../lib/ai/getChatModel';
import {
  buildDashboardInputSchema,
  featureRecommendationsOutputSchema,
  recommendFeaturesInputSchema,
} from '../../../lib/ai/schemas';
import { z } from 'zod';

const SYSTEM_PROMPT_BASE = `You are a helpful assistant for the Open Game Data Dashboard, a visualization tool for educational game data. The user is not technical — avoid programming jargon.

Workflow when helping with research questions:
1. Use lookupGames and getGameManifest to discover available features for the game and time period.
2. Use recommendFeatures with researchQuestion, gameName, year, month, and the features array from getGameManifest. Do not add extra fields to the tool input.
3. Use addDataset to load data if it is not already available (population, player, or session level as appropriate).
4. After features are recommended and data is loaded, ask the user how they want the charts before calling buildDashboard (see dashboard rules below).

Rules:
- Never invent feature names that are not in the manifest.
- Prefer primary recommendations when building dashboards; include at most 6–8 charts worth of features.
- Summarize tool results in plain language.`;

const DASHBOARD_BUILD_RULES = `
Dashboard build rules (important):
- Do NOT call buildDashboard until the user has clearly said what they want.
- After recommending features (and loading data if needed), ask in plain language:
  "Would you like me to create a new dashboard for these charts, or add them to your current dashboard?"
  Mention the current dashboard name and chart count when available.
- Wait for the user's answer. If they are unclear, ask again. Do not guess.
- Only then call buildDashboard with:
  - target "new" if they want a new dashboard tab / fresh dashboard / separate dashboard
  - target "current" if they want to add to the open / current / existing dashboard
- For target "new", pick a short dashboardName describing the analysis.
- For target "current", set dashboardName to the current dashboard name from context.`;

function buildSystemPrompt(dashboardContextText?: string): string {
  const contextSection = dashboardContextText
    ? `\nCurrent dashboard context: ${dashboardContextText}`
    : '';
  return `${SYSTEM_PROMPT_BASE}${contextSection}${DASHBOARD_BUILD_RULES}`;
}

export async function POST(request: Request) {
  const availability = getAssistantAvailability();
  if (!availability.enabled) {
    return Response.json(
      { error: 'Assistant is not available', reason: availability.reason },
      { status: 503 },
    );
  }

  const {
    messages,
    dashboardContext: dashboardContextText,
  }: {
    messages: UIMessage[];
    dashboardContext?: string;
  } = await request.json();

  const model = getChatModel();

  const result = streamText({
    model,
    tools: {
      lookupGames: tool({
        description: 'Lookup games from the Open Game Data dataset repository.',
        inputSchema: z.object({}),
        execute: async () => {
          return apiService.getGames();
        },
      }),
      getGameManifest: tool({
        description:
          'Get the manifest for a game from the Open Game Data dataset repository. A manifest documents the features (definition, datatype, etc.) available and other metadata for a game.',
        inputSchema: z.object({
          gameName: z.string(),
          year: z.string().regex(/^\d{4}$/, 'Year must be 4 digits'),
          month: z.string().regex(/^(0[1-9]|1[0-2])$/, 'Month must be 01-12'),
        }),
        execute: async ({ gameName, year, month }) => {
          const manifest = await apiService.getGameManifest(
            gameName,
            month,
            year,
          );
          return manifest.val.features;
        },
      }),
      recommendFeatures: tool({
        description:
          'Recommend OGD telemetry features that best answer a research question, based on the game manifest. Returns a structured ranked list.',
        inputSchema: recommendFeaturesInputSchema,
        execute: async (input) => {
          const featureList = input.features
            .map(
              (f) =>
                `- ${f.feature_name} (${f.return_type}): ${f.description} [levels: ${f.aggregation_levels.join(', ')}]`,
            )
            .join('\n');

          try {
            const { object } = await generateObject({
              model,
              schema: featureRecommendationsOutputSchema,
              prompt: `Research question: ${input.researchQuestion}

                      Game: ${input.gameName} (${input.year}-${input.month})

                      Available manifest features:
                      ${featureList}

                      Select features that best help answer the research question. Include 3–8 recommendations.
                      Return JSON with a "recommendations" array. Each item must have exactly: featureName (from feature_name in the list), rationale (plain language), priority ("primary" or "secondary").
                      Use only feature names from the list above. Mark the most important as primary and supporting ones as secondary.`,
            });

            return object.recommendations;
          } catch (error) {
            const message =
              error instanceof Error ? error.message : 'Unknown error';
            throw new Error(
              `Feature recommendation failed: ${message}. Each recommendation needs featureName, rationale, and priority only.`,
            );
          }
        },
      }),
      addDataset: tool({
        description:
          'Fetch a dataset from the Open Game Data dataset repository and add it to the local storage. Use your best judgement to convert user input into valid input for this tool.',
        inputSchema: z.object({
          game: z.string(),
          month: z.string().regex(/^(0[1-9]|1[0-2])$/, 'Month must be 01-12'),
          year: z.string().regex(/^\d{4}$/, 'Year must be 4 digits'),
          level: z.enum(['population', 'player', 'session']),
        }),
      }),
      buildDashboard: tool({
        description:
          'Add charts for recommended features. Only call after the user chose new vs current dashboard. Requires dataset loaded via addDataset. target "new" creates a tab; target "current" appends to the open dashboard.',
        inputSchema: buildDashboardInputSchema,
      }),
    },
    system: buildSystemPrompt(dashboardContextText),
    messages: await convertToModelMessages(messages),
    stopWhen: stepCountIs(8),
  });
  return result.toUIMessageStreamResponse();
}
