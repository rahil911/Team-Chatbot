export type AgentKey = 'mathew' | 'rahil' | 'shreyas' | 'siddarth';

const surfaceVars = {
  950: '--surface-950-rgb',
  925: '--surface-925-rgb',
  900: '--surface-900-rgb',
  850: '--surface-850-rgb',
  800: '--surface-800-rgb',
  750: '--surface-750-rgb',
  700: '--surface-700-rgb',
} as const;

const textVars = {
  primary: '--text-primary-rgb',
  secondary: '--text-secondary-rgb',
  tertiary: '--text-tertiary-rgb',
  muted: '--text-muted-rgb',
} as const;

const accentVars = {
  blue: '--accent-blue-rgb',
  purple: '--accent-purple-rgb',
  green: '--accent-green-rgb',
  orange: '--accent-orange-rgb',
} as const;

const agentVars: Record<AgentKey, string> = {
  mathew: '--agent-mathew-rgb',
  rahil: '--agent-rahil-rgb',
  shreyas: '--agent-shreyas-rgb',
  siddarth: '--agent-siddarth-rgb',
};

const toColor = (variable: string) => `rgb(var(${variable}))`;
const withAlpha = (variable: string, alpha: number) => `rgb(var(${variable}) / ${alpha})`;

export const surfaces = {
  950: toColor(surfaceVars[950]),
  925: toColor(surfaceVars[925]),
  900: toColor(surfaceVars[900]),
  850: toColor(surfaceVars[850]),
  800: toColor(surfaceVars[800]),
  750: toColor(surfaceVars[750]),
  700: toColor(surfaceVars[700]),
} as const;

export const text = {
  primary: toColor(textVars.primary),
  secondary: toColor(textVars.secondary),
  tertiary: toColor(textVars.tertiary),
  muted: toColor(textVars.muted),
} as const;

export const accent = {
  blue: toColor(accentVars.blue),
  purple: toColor(accentVars.purple),
  green: toColor(accentVars.green),
  orange: toColor(accentVars.orange),
} as const;

export const agents: Record<AgentKey, string> = {
  mathew: toColor(agentVars.mathew),
  rahil: toColor(agentVars.rahil),
  shreyas: toColor(agentVars.shreyas),
  siddarth: toColor(agentVars.siddarth),
};

export const accentAlpha = (key: keyof typeof accentVars, alpha: number) => withAlpha(accentVars[key], alpha);
export const agentAlpha = (key: AgentKey, alpha: number) => withAlpha(agentVars[key], alpha);
export const surfaceAlpha = (key: keyof typeof surfaceVars, alpha: number) => withAlpha(surfaceVars[key], alpha);
export const textAlpha = (key: keyof typeof textVars, alpha: number) => withAlpha(textVars[key], alpha);

export const radius = {
  xs: 'var(--radius-xs)',
  sm: 'var(--radius-sm)',
  md: 'var(--radius-md)',
  lg: 'var(--radius-lg)',
  xl: 'var(--radius-xl)',
} as const;

export const spacing = {
  xs: 'var(--spacing-xs)',
  sm: 'var(--spacing-sm)',
  md: 'var(--spacing-md)',
  lg: 'var(--spacing-lg)',
  xl: 'var(--spacing-xl)',
} as const;

export const shadows = {
  soft: 'var(--shadow-soft)',
  glowBlue: 'var(--shadow-glow-blue)',
  glowPurple: 'var(--shadow-glow-purple)',
} as const;

export const gradients = {
  aurora: `linear-gradient(135deg, ${accent.blue} 0%, ${accent.purple} 100%)`,
  ocean: `linear-gradient(135deg, ${accent.blue} 0%, ${accent.green} 100%)`,
  ember: `linear-gradient(135deg, ${accent.orange} 0%, ${accent.purple} 100%)`,
} as const;

export const getAgentAccent = (agentId?: string) => {
  if (!agentId) return accent.blue;
  return agents[agentId as AgentKey] ?? accent.blue;
};

export const token = {
  surfaces,
  text,
  accent,
  agents,
  accentAlpha,
  agentAlpha,
  surfaceAlpha,
  textAlpha,
  radius,
  spacing,
  shadows,
  gradients,
  getAgentAccent,
};

export type Token = typeof token;

