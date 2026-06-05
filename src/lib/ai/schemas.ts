import { z } from 'zod';

export const manifestFeatureSchema = z.object({
  feature_name: z.string(),
  module: z.string(),
  description: z.string(),
  return_type: z.string(),
  aggregation_levels: z.array(z.string()),
});

export const featureRecommendationSchema = z.object({
  featureName: z.string(),
  rationale: z.string(),
  priority: z.enum(['primary', 'secondary']),
});

export const featureRecommendationsOutputSchema = z.object({
  recommendations: z.array(featureRecommendationSchema),
});

export const recommendFeaturesInputSchema = z.object({
  researchQuestion: z.string(),
  gameName: z.string(),
  year: z.string().regex(/^\d{4}$/, 'Year must be 4 digits'),
  month: z.string().regex(/^(0[1-9]|1[0-2])$/, 'Month must be 01-12'),
  features: z.array(manifestFeatureSchema),
});

export const buildDashboardTargetSchema = z.enum(['new', 'current']);

export const buildDashboardInputSchema = z.object({
  target: buildDashboardTargetSchema.describe(
    'Use "new" only after the user asked for a new dashboard tab. Use "current" only after they asked to add charts to the open dashboard.',
  ),
  dashboardName: z
    .string()
    .describe(
      'Name for a new dashboard tab. When target is "current", pass the current dashboard name from context.',
    ),
  datasetId: z.string(),
  recommendations: z.array(featureRecommendationSchema),
});

export type BuildDashboardTarget = z.infer<typeof buildDashboardTargetSchema>;

export type ManifestFeature = z.infer<typeof manifestFeatureSchema>;
export type FeatureRecommendation = z.infer<typeof featureRecommendationSchema>;
export type RecommendFeaturesInput = z.infer<typeof recommendFeaturesInputSchema>;
export type BuildDashboardInput = z.infer<typeof buildDashboardInputSchema>;
