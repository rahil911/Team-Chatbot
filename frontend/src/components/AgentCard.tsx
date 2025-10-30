import { useMemo } from 'react';
import { MessageFormatter } from './MessageFormatter';
import { token } from '../theme';

interface AgentCardProps {
  agentId: string;
  agentName: string;
  agentTitle: string;
  isActive: boolean;
  message: string;
}

export const AgentCard = ({ agentId, agentName, agentTitle, isActive, message }: AgentCardProps) => {
  const color = token.getAgentAccent(agentId) || token.text.muted;

  const statusLabel = useMemo(() => {
    if (isActive) return 'Active now';
    if (message) return 'Contributed';
    return 'Standing by';
  }, [isActive, message]);

  const initials = useMemo(() => {
    return agentName
      .split(' ')
      .map((part) => part.charAt(0))
      .slice(0, 2)
      .join('');
  }, [agentName]);

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-white/5 bg-surface-900/60 p-5 text-sm text-text-secondary transition-all duration-200 hover:border-white/8 hover:bg-surface-900/75"
      style={{
        boxShadow: isActive
          ? `0 0 24px color-mix(in srgb, ${color} 20%, transparent)`
          : undefined,
      }}
    >
      {isActive && (
        <div
          className="pointer-events-none absolute inset-0 opacity-10"
          style={{ background: `linear-gradient(135deg, color-mix(in srgb, ${color} 25%, transparent) 0%, transparent 70%)` }}
        />
      )}

      <div className="relative z-10 flex items-start gap-3">
        <div
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border text-sm font-semibold"
          style={{
            borderColor: color,
            background: `color-mix(in srgb, ${color} 20%, transparent)`,
            color: color,
          }}
        >
          {initials}
        </div>

        <div className="flex-1 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h4 className="text-xs font-semibold tracking-tight text-text-primary">{agentName}</h4>
              <p className="text-[10px] text-text-tertiary">{agentTitle}</p>
            </div>
            <span
              className="rounded-full border px-2 py-0.5 text-[10px] font-medium"
              style={{
                borderColor: `color-mix(in srgb, ${color} 35%, transparent)`,
                background: `color-mix(in srgb, ${color} 12%, transparent)`,
                color,
              }}
            >
              {statusLabel}
            </span>
          </div>

          <div className="rounded-xl border border-white/5 bg-surface-900/50 px-3 py-2 text-xs leading-relaxed text-text-secondary">
            {message ? (
              <MessageFormatter content={message} maxLines={4} />
            ) : (
              <p className="text-[10px] text-text-tertiary">Awaiting the next user question.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
