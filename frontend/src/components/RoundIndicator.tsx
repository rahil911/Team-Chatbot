import { ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';

interface RoundIndicatorProps {
  currentRound: number;
  maxRounds: number;
  agentsResponded?: number;
  totalAgents?: number;
  status?: 'active' | 'complete' | 'waiting';
}

export const RoundIndicator = ({
  currentRound,
  maxRounds,
  agentsResponded = 0,
  totalAgents = 4,
  status = 'active',
}: RoundIndicatorProps) => {
  const progress = (currentRound / maxRounds) * 100;

  const getStatusColor = () => {
    switch (status) {
      case 'complete':
        return 'text-green-400';
      case 'active':
        return 'text-blue-400';
      case 'waiting':
        return 'text-amber-400';
      default:
        return 'text-text-secondary';
    }
  };

  const getStatusBg = () => {
    switch (status) {
      case 'complete':
        return 'bg-green-400/10 border-green-400/20';
      case 'active':
        return 'bg-blue-400/10 border-blue-400/20';
      case 'waiting':
        return 'bg-amber-400/10 border-amber-400/20';
      default:
        return 'bg-surface-800/50 border-white/6';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'complete':
        return 'Round Complete';
      case 'active':
        return 'Discussion In Progress';
      case 'waiting':
        return 'Waiting for Responses';
      default:
        return 'Idle';
    }
  };

  return (
    <div className="space-y-3 rounded-2xl border border-white/6 bg-surface-900/70 px-4 py-4 shadow-panel">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ChatBubbleLeftRightIcon className={`h-5 w-5 ${getStatusColor()}`} />
          <span className="text-sm font-semibold text-text-primary">Discussion Round</span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className={`text-2xl font-bold tabular-nums ${getStatusColor()}`}>{currentRound}</span>
          <span className="text-sm font-medium text-text-tertiary">/ {maxRounds}</span>
        </div>
      </div>

      {/* Round Progress */}
      <div className="space-y-2">
        <div className="h-2 w-full overflow-hidden rounded-full bg-surface-800/80 shadow-inner">
          <div
            className={`h-full bg-gradient-to-r from-accent-blue/90 via-accent-purple/70 to-accent-orange/60 shadow-md transition-all duration-500`}
            style={{ width: `${progress}%` }}
          >
            {/* Animated shimmer when active */}
            {status === 'active' && (
              <div className="h-full w-full animate-shimmer bg-gradient-to-r from-transparent via-white/30 to-transparent" />
            )}
          </div>
        </div>

        {/* Round dots */}
        <div className="flex items-center justify-between px-1">
          {Array.from({ length: maxRounds }, (_, i) => i + 1).map((round) => (
            <div key={round} className="flex flex-col items-center gap-1">
              <div
                className={`h-2 w-2 rounded-full transition-all duration-300 ${
                  round < currentRound
                    ? 'bg-accent-blue shadow-md shadow-accent-blue/50'
                    : round === currentRound
                      ? 'bg-accent-orange shadow-md shadow-accent-orange/50 ring-2 ring-accent-orange/30'
                      : 'bg-surface-700/60'
                }`}
              />
              <span
                className={`text-[10px] font-medium ${round <= currentRound ? 'text-text-secondary' : 'text-text-tertiary'}`}
              >
                {round}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Agent Response Status */}
      {agentsResponded > 0 && status === 'active' && (
        <div className="flex items-center justify-between rounded-lg border border-white/6 bg-surface-800/60 px-3 py-2">
          <span className="text-xs font-medium text-text-secondary">Agents Responded</span>
          <div className="flex items-baseline gap-1">
            <span className="text-sm font-bold text-accent-blue">{agentsResponded}</span>
            <span className="text-xs text-text-tertiary">/ {totalAgents}</span>
          </div>
        </div>
      )}

      {/* Status Badge */}
      <div className={`rounded-lg border px-3 py-2 ${getStatusBg()}`}>
        <p className={`text-xs font-medium ${getStatusColor()}`}>{getStatusText()}</p>
      </div>
    </div>
  );
};
