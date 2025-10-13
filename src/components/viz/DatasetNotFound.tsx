import { TriangleAlert } from 'lucide-react';

export default function DatasetNotFound({
  gameDataId,
}: {
  gameDataId: string;
}) {
  return (
    <div className="flex flex-col gap-2 p-2 h-full w-full items-center justify-center">
      <TriangleAlert className="w-10 h-10 text-orange-300" />
      <div className="text-lg font-semibold">Dataset not found</div>
      <div className="text-sm text-gray-700 break-all">
        Upload {gameDataId} to visualize
      </div>
    </div>
  );
}
