import { Loader2 } from 'lucide-react';

export function LoadingOverlay({ message }: { message?: string }) {
  return (
    <div className="absolute inset-0 bg-white/80 flex flex-col items-center justify-center z-10 rounded-lg">
      <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
      {message && <p className="mt-3 text-sm text-gray-600">{message}</p>}
    </div>
  );
}
