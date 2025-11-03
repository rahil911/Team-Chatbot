import { CheckCircleIcon, ClockIcon } from '@heroicons/react/24/outline';

interface ConsensusMeterProps {
  consensus: number; // 0.0 to 1.0
  threshold?: number; // default 0.85
  round?: number;
}

export const ConsensusMeter = ({ consensus, threshold = 0.85, round }: ConsensusMeterProps) => {
  const percentage = Math.round(consensus * 100);
  const thresholdPercentage = Math.round(threshold * 100);
  const isReached = consensus >= threshold;

  // Color gradient based on consensus level
  const getGradient = () => {
    if (isReached) {
      return 'from-green-400/90 via-emerald-400/80 to-green-500/70';
    } else if (consensus >= 0.6) {
      return 'from-yellow-400/90 via-amber-400/80 to-orange-400/70';
    } else if (consensus >= 0.3) {
      return 'from-orange-400/90 via-amber-500/80 to-yellow-500/70';
    } else {
      return 'from-red-400/90 via-orange-400/80 to-amber-400/70';
    }
  };

  return (
    <div className="space-y-3 rounded-2xl border border-white/6 bg-surface-900/70 px-4 py-4 shadow-panel">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isReached ? (
            <CheckCircleIcon className="h-5 w-5 text-green-400" />
          ) : (
            <ClockIcon className="h-5 w-5 text-text-tertiary" />
          )}
          <span className="text-sm font-semibold text-text-primary">
            Consensus {isReached ? 'Reached' : 'Building'}
          </span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className={`text-2xl font-bold tabular-nums ${isReached ? 'text-green-400' : 'text-text-primary'}`}>
            {percentage}
          </span>
          <span className="text-xs font-medium text-text-tertiary">%</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="relative">
        <div className="h-3 w-full overflow-hidden rounded-full bg-surface-800/80 shadow-inner">
          <div
            className={`h-full bg-gradient-to-r ${getGradient()} shadow-md transition-all duration-700 ease-out`}
            style={{ width: `${percentage}%` }}
          >
            {/* Shimmer effect when active */}
            {!isReached && consensus > 0 && (
              <div className="h-full w-full animate-shimmer bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            )}
          </div>
        </div>

        {/* Threshold marker */}
        <div
          className="absolute top-0 h-3 w-0.5 bg-white/40 shadow-sm"
          style={{ left: `${thresholdPercentage}%` }}
        >
          <div className="absolute -top-1 left-1/2 -translate-x-1/2">
            <div className="flex flex-col items-center">
              <div className="h-1 w-1 rounded-full bg-white/60" />
            </div>
          </div>
        </div>
      </div>

      {/* Info Text */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-text-tertiary">
          Target: <span className="font-semibold text-text-secondary">{thresholdPercentage}%</span>
        </span>
        {round !== undefined && (
          <span className="text-text-tertiary">
            Round <span className="font-semibold text-text-secondary">{round}</span>
          </span>
        )}
      </div>

      {/* Status message */}
      {isReached ? (
        <div className="rounded-lg border border-green-400/20 bg-green-400/10 px-3 py-2">
          <p className="text-xs font-medium text-green-300">
            Agents have reached consensus. Preparing final summary...
          </p>
        </div>
      ) : consensus > 0 ? (
        <div className="rounded-lg border border-amber-400/20 bg-amber-400/10 px-3 py-2">
          <p className="text-xs font-medium text-amber-200">
            Discussion ongoing. Need {thresholdPercentage - percentage}% more for consensus.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-blue-400/20 bg-blue-400/10 px-3 py-2">
          <p className="text-xs font-medium text-blue-200">
            Agents are beginning their discussion...
          </p>
        </div>
      )}
    </div>
  );
};
