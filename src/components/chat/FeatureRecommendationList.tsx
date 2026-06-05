import type { FeatureRecommendation } from '../../lib/ai/schemas';

interface FeatureRecommendationListProps {
  recommendations: FeatureRecommendation[];
}

export default function FeatureRecommendationList({
  recommendations,
}: FeatureRecommendationListProps) {
  if (!recommendations.length) return null;

  return (
    <div className="mt-2 space-y-2 rounded-md border border-gray-200 bg-gray-50 p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
        Recommended features
      </p>
      <ul className="space-y-2">
        {recommendations.map((rec) => (
          <li key={rec.featureName} className="text-sm">
            <div className="flex items-baseline gap-2">
              <span className="font-medium text-gray-900">{rec.featureName}</span>
              <span
                className={
                  rec.priority === 'primary'
                    ? 'rounded bg-blue-100 px-1.5 py-0.5 text-xs text-blue-800'
                    : 'rounded bg-gray-200 px-1.5 py-0.5 text-xs text-gray-600'
                }
              >
                {rec.priority}
              </span>
            </div>
            <p className="mt-0.5 text-gray-600">{rec.rationale}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
