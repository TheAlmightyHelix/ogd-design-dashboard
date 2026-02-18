import { useRouter } from 'next/router';
import { useMemo } from 'react';
import { generateAPIDatasetID } from '../adapters/apiAdapter';

const VALID_LEVELS = ['population', 'player', 'session'] as const;
type DatasetLevel = (typeof VALID_LEVELS)[number];

export interface DatasetUrlParams {
  game: string;
  year: string;
  month: string;
  level: DatasetLevel;
  datasetId: string;
  isValid: boolean;
}

function isValidLevel(
  value: string | undefined,
): value is DatasetLevel {
  return VALID_LEVELS.includes(value as DatasetLevel);
}

export function useDatasetFromUrl(): DatasetUrlParams | null {
  const router = useRouter();

  return useMemo(() => {
    if (!router.isReady) return null;

    const { game, year, month, level } = router.query;

    const gameStr = typeof game === 'string' ? game.trim() : '';
    const yearStr = typeof year === 'string' ? year.trim() : '';
    const monthStr = typeof month === 'string' ? month.trim() : '';

    const levelValue = typeof level === 'string' ? level.trim().toLowerCase() : 'population';
    const resolvedLevel = isValidLevel(levelValue) ? levelValue : 'population';

    if (!gameStr || !yearStr || !monthStr) {
      return null;
    }

    const yearNum = parseInt(yearStr, 10);
    const monthNum = parseInt(monthStr, 10);

    const isValid =
      !Number.isNaN(yearNum) &&
      yearNum >= 2000 &&
      yearNum <= 2100 &&
      !Number.isNaN(monthNum) &&
      monthNum >= 1 &&
      monthNum <= 12;

    if (!isValid) {
      return {
        game: gameStr,
        year: yearStr,
        month: monthStr,
        level: resolvedLevel,
        datasetId: '',
        isValid: false,
      };
    }

    const dataset = `${yearNum}/${monthNum}`;
    const datasetId = generateAPIDatasetID(gameStr, dataset, resolvedLevel);

    return {
      game: gameStr,
      year: yearStr,
      month: monthStr,
      level: resolvedLevel,
      datasetId,
      isValid: true,
    };
  }, [router.isReady, router.query]);
}
