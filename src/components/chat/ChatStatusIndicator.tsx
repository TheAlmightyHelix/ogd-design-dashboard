import { Loader2 } from 'lucide-react';

interface ChatStatusIndicatorProps {
  label: string;
}

export default function ChatStatusIndicator({ label }: ChatStatusIndicatorProps) {
  return (
    <div
      className="flex items-center gap-2 rounded-md border border-gray-100 bg-gray-50 px-3 py-2"
      role="status"
      aria-live="polite"
    >
      <Loader2 className="h-4 w-4 shrink-0 animate-spin text-blue-600" />
      <span className="text-sm text-gray-700">{label}</span>
    </div>
  );
}
