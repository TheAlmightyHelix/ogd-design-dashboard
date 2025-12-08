import { Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import Dialog from '../../layout/Dialog';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '../../../services/apiService';
import SearchableSelect from '../../layout/select/SearchableSelect';
import useDataStore from '../../../store/useDataStore';
import {
  generateAPIDatasetID,
  normalizeApiResponse,
} from '../../../adapters/apiAdapter';
import { X } from 'lucide-react';

const DatasetAPIPicker = () => {
  const { addDataset, hasDataset } = useDataStore();
  const [isOpen, setIsOpen] = useState(false);
  const {
    data: games,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['games'],
    queryFn: () => api.getGames(),
  });
  const [selectedGame, setSelectedGame] = useState<string>('');
  const {
    data: datasets,
    isLoading: isLoadingDatasets,
    error: errorDatasets,
  } = useQuery({
    queryKey: ['datasets', selectedGame as string],
    queryFn: () => api.getDatasets(selectedGame),
    select: (data) =>
      data.val.datasets.reduce(
        (acc, dataset) => {
          if (
            dataset.sessions_file === null &&
            dataset.players_file === null &&
            dataset.population_file === null
          ) {
            return acc;
          }
          acc[`${dataset.year}/${dataset.month}`] = [];
          if (dataset.sessions_file !== null) {
            acc[`${dataset.year}/${dataset.month}`].push('session');
          }
          if (dataset.players_file !== null) {
            acc[`${dataset.year}/${dataset.month}`].push('player');
          }
          if (dataset.population_file !== null) {
            acc[`${dataset.year}/${dataset.month}`].push('population');
          }

          return acc;
        },
        {} as Record<string, ('population' | 'player' | 'session')[]>,
      ),
    enabled: !!selectedGame,
  });

  const [selectedDataset, setSelectedDataset] = useState<string>('');
  const [importingLevels, setImportingLevels] = useState<
    Set<'population' | 'player' | 'session'>
  >(new Set());

  const importDatasetMutation = useMutation({
    mutationFn: ({
      level,
      game,
      dataset,
    }: {
      level: 'population' | 'player' | 'session';
      game: string;
      dataset: string;
    }) =>
      api.getDataset(game, dataset.split('/')[1], dataset.split('/')[0], level),
    onSuccess: (responseBody, variables) => {
      if (responseBody) {
        addDataset(
          normalizeApiResponse(
            responseBody,
            variables.game,
            variables.dataset,
            variables.level,
          ),
        );
      }
    },
    onSettled: (data, error, variables) => {
      setImportingLevels((prev) => {
        const next = new Set(prev);
        next.delete(variables.level);
        return next;
      });
    },
  });

  function handleImportDataset(level: 'population' | 'player' | 'session') {
    if (!selectedGame || !selectedDataset) return;
    setImportingLevels((prev) => new Set(prev).add(level));
    importDatasetMutation.mutate({
      level,
      game: selectedGame,
      dataset: selectedDataset,
    });
  }

  useEffect(() => {
    // Reset dataset selection and flush metadata when game changes
    setSelectedDataset('');
  }, [selectedGame]);

  const DatasetLevelCard = ({
    level,
  }: {
    level: 'population' | 'player' | 'session';
  }) => {
    const isImporting = importingLevels.has(level);
    return (
      <div
        key={level}
        className="h-full border border-gray-300 rounded-md p-4 w-full flex flex-col items-start justify-between hover:bg-gray-100 transition-colors"
      >
        <div>
          <h3 className="font-semibold">{level.toUpperCase()}</h3>
          <p className="text-sm text-gray-500">
            {level === 'population' &&
              'Population level data contains features aggregated across all events.'}
            {level === 'player' &&
              'Player level data contains features for each player.'}
            {level === 'session' &&
              'Session level data contains features for each session.'}
          </p>
        </div>
        <button
          onClick={() =>
            handleImportDataset(level as 'population' | 'player' | 'session')
          }
          disabled={
            isImporting ||
            hasDataset(
              generateAPIDatasetID(selectedGame, selectedDataset, level),
            )
          }
          className="w-full bg-blue-400 text-white px-4 py-2 rounded-md font-medium cursor-pointer shadow hover:bg-blue-500 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isImporting
            ? 'Importing...'
            : hasDataset(
                  generateAPIDatasetID(selectedGame, selectedDataset, level),
                )
              ? 'Imported'
              : 'Add to Dashboard'}
        </button>
      </div>
    );
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="w-full inline-flex items-center justify-center px-4 py-2 bg-blue-400 text-white rounded-md font-medium cursor-pointer shadow hover:bg-blue-500 transition-colors text-sm"
      >
        <Search className="w-4 h-4 mr-2" />
        Browse Datasets
      </button>
      <Dialog open={isOpen} onClose={() => setIsOpen(false)}>
        <div className="flex flex-col gap-8 h-120">
          <div className="flex flex-col gap-4">
            <div className="flex w-full justify-between items-start">
              <div>
                <h1 className="text-xl font-bold">Browse Datasets</h1>
                <p className="text-sm text-gray-500">
                  Lookup datasets from the Open Game Data repository and import
                  them into the dashboard.
                </p>
              </div>
              <X
                className="w-4 h-4 cursor-pointer"
                onClick={() => setIsOpen(false)}
              />
            </div>
            {isLoading && <p>Loading...</p>}
            {error && <p>Error: {error.message}</p>}
            <div className="grid grid-cols-2 gap-4">
              {games && (
                <SearchableSelect
                  label="Game"
                  options={games.val.game_ids.reduce(
                    (acc, game) => {
                      acc[game] = game;
                      return acc;
                    },
                    {} as Record<string, string>,
                  )}
                  value={selectedGame}
                  onChange={setSelectedGame}
                />
              )}
              {datasets && (
                <SearchableSelect
                  label="Month"
                  options={Object.keys(datasets).reduce(
                    (acc, key) => {
                      acc[key] = key;
                      return acc;
                    },
                    {} as Record<string, string>,
                  )}
                  value={selectedDataset}
                  onChange={setSelectedDataset}
                />
              )}
            </div>
          </div>

          {datasets && selectedDataset && (
            <div className="h-full flex flex-col gap-2">
              <h2 className="font-semibold">Available Datasets</h2>
              <div className="grid grid-cols-3 gap-4 h-full">
                {datasets[selectedDataset].map((level) => {
                  return <DatasetLevelCard key={level} level={level} />;
                })}
              </div>
            </div>
          )}
        </div>
      </Dialog>
    </>
  );
};

export default DatasetAPIPicker;
