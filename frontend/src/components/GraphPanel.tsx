import { useEffect, useMemo, useRef, useState } from 'react';
import CytoscapeComponent from 'react-cytoscapejs';
import type cytoscape from 'cytoscape';
import type { CytoscapeElement } from '../types';
import { token } from '../theme';
import { config } from '../config';

interface GraphPanelProps {
  highlightData: {
    nodes: any[];
    edges: any[];
  };
}

export const GraphPanel = ({ highlightData }: GraphPanelProps) => {
  const cyRef = useRef<cytoscape.Core | null>(null);
  const [elements, setElements] = useState<CytoscapeElement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const stats = useMemo(() => {
    const nodeCount = elements.filter(e => 'label' in e.data).length;
    const edgeCount = elements.filter(e => 'source' in e.data).length;
    return { nodeCount, edgeCount };
  }, [elements]);

  const highlightCount = highlightData?.nodes?.length ?? 0;
  
  // Load graph data from API
  useEffect(() => {
    fetch(`${config.apiEndpoint}/graph`)
      .then(res => res.json())
      .then(data => {
        setElements(data.elements);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading graph:', err);
        setError('Failed to load knowledge graph');
        setLoading(false);
      });
  }, []);
  
  // Apply highlights in real-time
  useEffect(() => {
    if (!cyRef.current) return;
    
    const cy = cyRef.current;
    
    // If no highlights, show everything normally
    if (!highlightData || !highlightData.nodes || highlightData.nodes.length === 0) {
      cy.batch(() => {
        cy.nodes().style({
          'opacity': 0.9,
          'border-width': 1.8,
          'border-color': token.text.tertiary,
          'background-opacity': 0.95,
        });
        cy.edges().style({
          'opacity': 0.35,
          'line-color': 'rgba(148, 163, 184, 0.28)',
          'width': 1.8,
        });
        cy.nodes().removeClass('pulsing');
      });
      return;
    }
    
    // Use batch for better performance and to prevent notify errors
    cy.batch(() => {
      // Get set of highlighted node IDs
      const highlightedNodeIds = new Set(highlightData.nodes.map((n: any) => n.id));
      
      // BLUR/FADE all non-highlighted nodes
      cy.nodes().forEach(node => {
        const isHighlighted = highlightedNodeIds.has(node.id());
        
        if (isHighlighted) {
          // Highlighted node - make it POP!
          const nodeData = highlightData.nodes.find((n: any) => n.id === node.id());
          const borderWidth = 3 + ((nodeData?.intensity ?? 0.7) * 3.2);
          
          node.style({
            'opacity': 1,
            'border-width': borderWidth,
            'border-color': nodeData?.color || token.accent.orange,
            'border-opacity': 1,
            'background-opacity': 1,
            'z-index': 999
          });
          
          if (nodeData?.pulse) {
            node.addClass('pulsing');
          }
        } else {
          // Non-highlighted node - FADE IT OUT
          node.style({
            'opacity': 0.18,
            'border-width': 1,
            'border-color': 'rgba(148, 163, 184, 0.25)',
            'border-opacity': 0.25,
            'background-opacity': 0.18,
            'z-index': 1,
          });
          node.removeClass('pulsing');
        }
      });
      
      // Highlight only edges between highlighted nodes, fade others
      cy.edges().forEach(edge => {
        const source = edge.source().id();
        const target = edge.target().id();
        const bothHighlighted = highlightedNodeIds.has(source) && highlightedNodeIds.has(target);
        
        if (bothHighlighted) {
          // Edge between highlighted nodes - show it
          const edgeData = highlightData.edges?.find((e: any) => 
            (e.source === source && e.target === target) || e.id === edge.id()
          );
          
          edge.style({
            'line-color': edgeData?.color || token.accent.orange,
            'width': 3,
            'opacity': 0.85,
            'z-index': 100,
          });
        } else {
          // Edge involving non-highlighted nodes - FADE IT
          edge.style({
            'line-color': 'rgba(148, 163, 184, 0.15)',
            'width': 1,
            'opacity': 0.1,
            'z-index': 1
          });
        }
      });
    });
  }, [highlightData]);
  
  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-surface-925/90">
        <div className="text-center">
          <div className="relative">
            <div className="mx-auto mb-4 h-16 w-16 animate-spin rounded-full border-4 border-white/10 border-t-accent-blue"></div>
            <div className="absolute inset-0 rounded-full bg-accent-blue/20 blur-xl" />
          </div>
          <p className="font-medium text-text-secondary">Loading knowledge graph…</p>
          <p className="mt-1 text-sm text-text-tertiary">Preparing network layout</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex h-full items-center justify-center bg-surface-925/90">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/15">
            <svg className="h-8 w-8 text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="mb-2 text-lg font-semibold text-red-300">We hit a snag</p>
          <p className="text-sm text-text-tertiary">{error}</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="relative h-full w-full overflow-hidden rounded-tr-[var(--radius-xl)]">
      <div
        className="pointer-events-none absolute inset-0 opacity-50"
        style={{
          background: `radial-gradient(100% 50% at 15% 15%, color-mix(in srgb, ${token.accent.blue} 8%, transparent) 0%, transparent 60%)`,
        }}
      />

      <div className="absolute left-5 top-5 z-20 flex flex-col gap-3 text-sm">
        <div className="rounded-2xl border border-white/6 bg-surface-900/70 px-5 py-4 backdrop-blur-lg">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.15em] text-text-tertiary mb-3">
            <span>Knowledge Graph</span>
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-text-secondary">Live</span>
            </span>
          </div>
          <div className="grid grid-cols-3 gap-4 text-text-secondary">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-text-tertiary">Nodes</p>
              <p className="mt-0.5 text-lg font-semibold text-text-primary">{stats.nodeCount}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-text-tertiary">Edges</p>
              <p className="mt-0.5 text-lg font-semibold text-text-primary">{stats.edgeCount}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-text-tertiary">Active</p>
              <p className="mt-0.5 text-lg font-semibold" style={{ color: highlightCount ? token.accent.orange : token.text.secondary }}>
                {highlightCount}
              </p>
            </div>
          </div>
        </div>

        <div className="hidden w-max rounded-2xl border border-white/5 bg-surface-900/60 px-4 py-3 text-xs text-text-secondary backdrop-blur-md xl:flex">
          <div className="space-y-1.5">
            <p className="text-[10px] uppercase tracking-wide text-text-tertiary">Agents</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
              {(
                [
                  ['mathew', 'Mathew'],
                  ['rahil', 'Rahil'],
                  ['shreyas', 'Shreyas'],
                  ['siddarth', 'Siddarth'],
                ] as Array<[keyof typeof token.agents, string]>
              ).map(([id, name]) => (
                <div key={id} className="flex items-center gap-1.5">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: token.agents[id] }}
                  />
                  <span>{name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      <CytoscapeComponent
        elements={elements as any}
        stylesheet={cytoscapeStyles}
        layout={layoutConfig}
        cy={(cy: any) => { 
          cyRef.current = cy;
          
          // Add node click handler
          cy.on('tap', 'node', (evt: any) => {
            const node = evt.target;
            console.log('Node clicked:', node.data());
          });
          
          // Fit graph to viewport
          cy.fit(undefined, 50);
        }}
        style={{ width: '100%', height: '100%' }}
        className="cytoscape-container"
      />
    </div>
  );
};

// Cytoscape styles (corporate theme)
const cytoscapeStyles: any[] = [
  {
    selector: 'node',
    style: {
      'background-color': (ele: any) => ele.data('color') || token.accent.blue,
      'label': 'data(label)',
      'font-size': '11px',
      'color': token.text.primary,
      'text-valign': 'center',
      'text-halign': 'center',
      'text-wrap': 'wrap',
      'text-max-width': '120px',
      'width': '36px',
      'height': '36px',
      'border-width': 1.8,
      'border-color': token.text.tertiary,
      'border-opacity': 0.6,
      'background-opacity': 0.95,
      'text-outline-width': 2,
      'text-outline-color': 'rgba(2, 6, 23, 0.82)',
      'font-family': 'Inter, sans-serif',
      'font-weight': '600',
    }
  },
  {
    selector: 'node[type="person"]',
    style: {
      'width': '56px',
      'height': '56px',
      'font-size': '12px',
      'font-weight': '700'
    }
  },
  {
    selector: 'edge',
    style: {
      'width': 1.4,
      'line-color': 'rgba(148, 163, 184, 0.25)',
      'line-style': 'solid',
      'target-arrow-color': 'rgba(148, 163, 184, 0.25)',
      'target-arrow-shape': 'triangle',
      'curve-style': 'bezier',
      'arrow-scale': 0.8,
      'opacity': 0.5
    }
  },
  {
    selector: '.pulsing',
    style: {
      'transition-property': 'border-width, border-opacity',
      'transition-duration': '0.5s',
      'transition-timing-function': 'ease-in-out'
    }
  },
  {
    selector: ':selected',
    style: {
      'border-width': 4,
      'border-color': '#3B82F6',
      'background-color': '#DBEAFE'
    }
  }
];

// Layout configuration
const layoutConfig = {
  name: 'cose',
  animate: true,
  animationDuration: 500,
  fit: true,
  padding: 50,
  nodeRepulsion: 8000,
  idealEdgeLength: 100,
  edgeElasticity: 100,
  nestingFactor: 1.2,
  gravity: 1,
  numIter: 1000,
  initialTemp: 200,
  coolingFactor: 0.95,
  minTemp: 1.0
};

