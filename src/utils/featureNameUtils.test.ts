import {
  getBaseFeatureFromKey,
  getIteratedFeatureMap,
  isIteratedBaseFeature,
} from './featureNameUtils';

describe('featureNameUtils', () => {
  it('groups only true OGD iterated features', () => {
    const map = getIteratedFeatureMap([
      'cty0_ActiveTime',
      'cty1_ActiveTime',
      'event_name',
      'session_id',
      'timestamp',
    ]);

    expect(map.ActiveTime).toEqual(['cty0_ActiveTime', 'cty1_ActiveTime']);
    expect(map.name).toBeUndefined();
    expect(map.id).toBeUndefined();
    expect(isIteratedBaseFeature('ActiveTime', map)).toBe(true);
    expect(isIteratedBaseFeature('name', map)).toBe(false);
  });

  it('extracts base feature from the first underscore', () => {
    expect(getBaseFeatureFromKey('cty0_ActiveTime')).toBe('ActiveTime');
    expect(getBaseFeatureFromKey('event_name')).toBe('name');
    expect(getBaseFeatureFromKey('timestamp')).toBeNull();
  });
});
