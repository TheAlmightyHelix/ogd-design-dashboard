import SearchableSelect from './SearchableSelect';
import { useMemo, useState, useEffect } from 'react';

interface FeatureSelectProps {
  feature: string;
  handleFeatureChange: (feature: string) => void;
  featureOptions: Record<string, string>;
}

interface ParsedFeatures {
  simpleFeatures: string[];
  iteratedFeatures: Record<string, string[]>; // baseFeature -> [iterations]
}

export default function FeatureSelect({
  feature,
  handleFeatureChange,
  featureOptions,
}: FeatureSelectProps) {
  const [selectedBaseFeature, setSelectedBaseFeature] = useState<string>('');
  const [selectedIteration, setSelectedIteration] = useState<string>('');

  // Parse features into simple and iterated categories
  const parsedFeatures: ParsedFeatures = useMemo(() => {
    const simpleFeatures: string[] = [];
    const iteratedFeatures: Record<string, string[]> = {};

    Object.keys(featureOptions).forEach((featureKey) => {
      if (featureKey.includes('_')) {
        const [iteration, baseFeature] = featureKey.split('_');
        if (!iteratedFeatures[baseFeature]) {
          iteratedFeatures[baseFeature] = [];
        }
        iteratedFeatures[baseFeature].push(iteration);
      } else {
        simpleFeatures.push(featureKey);
      }
    });

    return { simpleFeatures, iteratedFeatures };
  }, [featureOptions]);

  // Initialize state based on current feature
  useEffect(() => {
    if (feature.includes('_')) {
      const [iteration, baseFeature] = feature.split('_');
      setSelectedBaseFeature(baseFeature);
      setSelectedIteration(iteration);
    } else {
      setSelectedBaseFeature(feature);
      setSelectedIteration('');
    }
  }, [feature]);

  // Get all available base features (simple + iterated)
  const allBaseFeatures = useMemo(() => {
    const features = [...parsedFeatures.simpleFeatures];
    Object.keys(parsedFeatures.iteratedFeatures).forEach((baseFeature) => {
      if (!features.includes(baseFeature)) {
        features.push(baseFeature);
      }
    });
    return features.sort();
  }, [parsedFeatures]);

  const handleBaseFeatureChange = (baseFeature: string) => {
    setSelectedBaseFeature(baseFeature);
    setSelectedIteration('');

    // If it's a simple feature, directly call the handler
    if (parsedFeatures.simpleFeatures.includes(baseFeature)) {
      handleFeatureChange(baseFeature);
    }
  };

  const handleIterationChange = (iteration: string) => {
    setSelectedIteration(iteration);
    handleFeatureChange(`${iteration}_${selectedBaseFeature}`);
  };

  const hasIterations =
    parsedFeatures.iteratedFeatures[selectedBaseFeature]?.length > 0;

  return (
    <div className="flex gap-2">
      <SearchableSelect
        className="min-w-xs"
        label="Feature"
        placeholder="Select a feature..."
        value={selectedBaseFeature}
        onChange={handleBaseFeatureChange}
        options={Object.fromEntries(allBaseFeatures.map((f) => [f, f]))}
      />

      {hasIterations && (
        <SearchableSelect
          className="max-w-sm"
          label="Iteration"
          placeholder="Select..."
          value={selectedIteration}
          onChange={handleIterationChange}
          options={Object.fromEntries(
            parsedFeatures.iteratedFeatures[selectedBaseFeature].map((iter) => [
              iter,
              iter,
            ]),
          )}
        />
      )}
    </div>
  );
}
