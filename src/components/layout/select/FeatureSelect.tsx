import SearchableSelect from './SearchableSelect';
import { useMemo, useState, useEffect } from 'react';
import { trackEvent } from '../../../lib/analytics';

interface FeatureSelectProps {
  feature: string;
  handleFeatureChange: (feature: string) => void;
  featureOptions: Record<string, string>;
  label?: string;
}

interface ParsedFeatures {
  simpleFeatures: string[];
  iteratedFeatures: Record<string, string[]>; // baseFeature -> [iterations]
}

export default function FeatureSelect({
  feature,
  handleFeatureChange,
  featureOptions,
  label = 'Feature',
}: FeatureSelectProps) {
  const [selectedBaseFeature, setSelectedBaseFeature] = useState<string>('');
  const [selectedIteration, setSelectedIteration] = useState<string>('');

  const emitFeatureSelected = (selectedFeature: string) => {
    trackEvent('feature_selected', { feature: selectedFeature });
  };

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

  const hasIterations = (baseFeature: string) =>
    parsedFeatures.iteratedFeatures[baseFeature]?.length > 0;

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

  useEffect(() => {
    if (
      selectedBaseFeature &&
      hasIterations(selectedBaseFeature) &&
      !selectedIteration
    ) {
      const defaultIteration =
        parsedFeatures.iteratedFeatures[selectedBaseFeature][0] || '';
      setSelectedIteration(defaultIteration);
      const selectedFeature = `${defaultIteration}_${selectedBaseFeature}`;
      emitFeatureSelected(selectedFeature);
      handleFeatureChange(selectedFeature);
    }
  }, [selectedBaseFeature, selectedIteration, parsedFeatures]);

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
      emitFeatureSelected(baseFeature);
      handleFeatureChange(baseFeature);
    }
  };

  const handleIterationChange = (iteration: string) => {
    setSelectedIteration(iteration);
    const selectedFeature = `${iteration}_${selectedBaseFeature}`;
    emitFeatureSelected(selectedFeature);
    handleFeatureChange(selectedFeature);
  };

  return (
    <div className="flex gap-2 w-full">
      <SearchableSelect
        className="w-full min-w-0"
        label={label}
        placeholder="Select a feature..."
        value={selectedBaseFeature}
        onChange={handleBaseFeatureChange}
        options={Object.fromEntries(allBaseFeatures.map((f) => [f, f]))}
      />

      {selectedBaseFeature && hasIterations(selectedBaseFeature) && (
        <SearchableSelect
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
