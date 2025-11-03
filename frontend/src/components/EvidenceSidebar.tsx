import { useState, useMemo } from 'react';
import { BookmarkIcon, FunnelIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { BookmarkIcon as BookmarkSolidIcon } from '@heroicons/react/24/solid';
import type { Citation } from '../types';

interface EvidenceSidebarProps {
  citations: Citation[];
  agentMap: Record<string, { name: string; color: string }>;
}

// Node type to icon/color mapping
const NODE_TYPE_CONFIG: Record<string, { color: string; bgColor: string; borderColor: string }> = {
  Skill: { color: 'text-blue-400', bgColor: 'bg-blue-400/10', borderColor: 'border-blue-400/30' },
  Project: { color: 'text-purple-400', bgColor: 'bg-purple-400/10', borderColor: 'border-purple-400/30' },
  Experience: { color: 'text-green-400', bgColor: 'bg-green-400/10', borderColor: 'border-green-400/30' },
  Education: { color: 'text-amber-400', bgColor: 'bg-amber-400/10', borderColor: 'border-amber-400/30' },
  Certification: { color: 'text-teal-400', bgColor: 'bg-teal-400/10', borderColor: 'border-teal-400/30' },
  Tool: { color: 'text-indigo-400', bgColor: 'bg-indigo-400/10', borderColor: 'border-indigo-400/30' },
  default: { color: 'text-gray-400', bgColor: 'bg-gray-400/10', borderColor: 'border-gray-400/30' },
};

export const EvidenceSidebar = ({ citations, agentMap }: EvidenceSidebarProps) => {
  const [filterType, setFilterType] = useState<string | null>(null);
  const [filterAgent, setFilterAgent] = useState<string | null>(null);

  // Get unique node types and agents
  const { nodeTypes, agents } = useMemo(() => {
    const types = new Set<string>();
    const agentIds = new Set<string>();

    citations.forEach((citation) => {
      types.add(citation.type);
      agentIds.add(citation.agent_id);
    });

    return {
      nodeTypes: Array.from(types).sort(),
      agents: Array.from(agentIds).sort(),
    };
  }, [citations]);

  // Filter citations
  const filteredCitations = useMemo(() => {
    let filtered = [...citations];

    if (filterType) {
      filtered = filtered.filter((c) => c.type === filterType);
    }

    if (filterAgent) {
      filtered = filtered.filter((c) => c.agent_id === filterAgent);
    }

    return filtered;
  }, [citations, filterType, filterAgent]);

  // Group by node type
  const groupedCitations = useMemo(() => {
    const groups: Record<string, Citation[]> = {};

    filteredCitations.forEach((citation) => {
      if (!groups[citation.type]) {
        groups[citation.type] = [];
      }
      groups[citation.type].push(citation);
    });

    return groups;
  }, [filteredCitations]);

  const getNodeConfig = (type: string) => {
    return NODE_TYPE_CONFIG[type] || NODE_TYPE_CONFIG.default;
  };

  return (
    <div className="flex h-full flex-col space-y-4 overflow-hidden rounded-2xl border border-white/6 bg-surface-900/70 shadow-panel">
      {/* Header */}
      <div className="border-b border-white/6 px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookmarkSolidIcon className="h-5 w-5 text-accent-orange" />
            <h3 className="text-sm font-semibold text-text-primary">Evidence & Citations</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-accent-orange/20 px-2 py-0.5 text-xs font-bold text-accent-orange">
              {filteredCitations.length}
            </span>
          </div>
        </div>

        <p className="mt-2 text-xs text-text-tertiary">
          Knowledge graph nodes cited by agents to support their claims
        </p>
      </div>

      {/* Filters */}
      {(nodeTypes.length > 1 || agents.length > 1) && (
        <div className="space-y-3 px-4">
          {/* Type Filter */}
          {nodeTypes.length > 1 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                <FunnelIcon className="h-3.5 w-3.5" />
                <span>By Type</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setFilterType(null)}
                  className={`rounded-lg border px-2 py-1 text-xs font-medium transition ${
                    filterType === null
                      ? 'border-accent-blue/40 bg-accent-blue/20 text-accent-blue'
                      : 'border-white/10 bg-surface-800/60 text-text-tertiary hover:border-white/20 hover:text-text-secondary'
                  }`}
                >
                  All
                </button>
                {nodeTypes.map((type) => {
                  const config = getNodeConfig(type);
                  return (
                    <button
                      key={type}
                      onClick={() => setFilterType(type)}
                      className={`rounded-lg border px-2 py-1 text-xs font-medium transition ${
                        filterType === type
                          ? `${config.borderColor} ${config.bgColor} ${config.color}`
                          : 'border-white/10 bg-surface-800/60 text-text-tertiary hover:border-white/20 hover:text-text-secondary'
                      }`}
                    >
                      {type}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Agent Filter */}
          {agents.length > 1 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                <FunnelIcon className="h-3.5 w-3.5" />
                <span>By Agent</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setFilterAgent(null)}
                  className={`rounded-lg border px-2 py-1 text-xs font-medium transition ${
                    filterAgent === null
                      ? 'border-accent-blue/40 bg-accent-blue/20 text-accent-blue'
                      : 'border-white/10 bg-surface-800/60 text-text-tertiary hover:border-white/20 hover:text-text-secondary'
                  }`}
                >
                  All
                </button>
                {agents.map((agentId) => {
                  const agent = agentMap[agentId];
                  return (
                    <button
                      key={agentId}
                      onClick={() => setFilterAgent(agentId)}
                      className={`rounded-lg border px-2 py-1 text-xs font-medium transition ${
                        filterAgent === agentId
                          ? 'border-white/30 bg-white/10 text-text-primary'
                          : 'border-white/10 bg-surface-800/60 text-text-tertiary hover:border-white/20 hover:text-text-secondary'
                      }`}
                      style={{
                        borderColor: filterAgent === agentId ? agent?.color : undefined,
                        backgroundColor: filterAgent === agentId ? `${agent?.color}20` : undefined,
                        color: filterAgent === agentId ? agent?.color : undefined,
                      }}
                    >
                      {agent?.name || agentId}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Citations List */}
      <div className="flex-1 space-y-4 overflow-y-auto px-4 pb-4">
        {Object.keys(groupedCitations).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <BookmarkIcon className="h-12 w-12 text-text-tertiary opacity-40" />
            <p className="mt-3 text-sm font-medium text-text-secondary">No citations yet</p>
            <p className="mt-1 text-xs text-text-tertiary">
              Agents will cite knowledge graph nodes<br />as they build their arguments
            </p>
          </div>
        ) : (
          Object.entries(groupedCitations).map(([type, citationsInType]) => {
            const config = getNodeConfig(type);
            return (
              <div key={type} className="space-y-2">
                {/* Type Header */}
                <div className="flex items-center gap-2">
                  <div
                    className={`rounded-md border px-2 py-0.5 ${config.borderColor} ${config.bgColor}`}
                  >
                    <span className={`text-xs font-semibold ${config.color}`}>{type}</span>
                  </div>
                  <span className="text-xs text-text-tertiary">({citationsInType.length})</span>
                </div>

                {/* Citations */}
                <div className="space-y-2">
                  {citationsInType.map((citation, idx) => {
                    const agent = agentMap[citation.agent_id];
                    return (
                      <div
                        key={`${citation.type}-${citation.name}-${idx}`}
                        className="group rounded-lg border border-white/6 bg-surface-800/60 px-3 py-2 transition hover:border-white/12 hover:bg-surface-800/80"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-text-primary line-clamp-2">
                              {citation.name}
                            </p>
                            <p className="mt-1 text-xs text-text-tertiary">
                              Cited by{' '}
                              <span
                                className="font-semibold"
                                style={{ color: agent?.color }}
                              >
                                {agent?.name || citation.agent_id}
                              </span>
                            </p>
                          </div>
                          <BookmarkSolidIcon
                            className={`h-4 w-4 flex-shrink-0 ${config.color} opacity-60 group-hover:opacity-100 transition`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
