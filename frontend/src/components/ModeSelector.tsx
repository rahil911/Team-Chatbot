import { RadioGroup } from '@headlessui/react';
import { UsersIcon } from '@heroicons/react/24/outline';
import type { ChatMode } from '../types';

interface ModeSelectorProps {
  mode: ChatMode;
  onChange: (mode: ChatMode) => void;
}

const MODES: Array<{
  id: ChatMode;
  title: string;
  description: string;
  accent: string;
  Icon: typeof UsersIcon;
}> = [
  {
    id: 'group',
    title: 'Group Chat',
    description: 'All agents reply together',
    accent: 'from-accent-blue/90 via-accent-blue/70 to-accent-purple/45',
    Icon: UsersIcon,
  },
  // Orchestrator and Think Tank modes hidden (backend still functional)
];

export const ModeSelector = ({ mode, onChange }: ModeSelectorProps) => {
  return (
    <div className="space-y-2">
      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-text-tertiary">Chat mode</span>
      <RadioGroup value={mode} onChange={onChange} className="grid grid-cols-1 gap-3">
        {MODES.map(({ id, title, description, accent, Icon }) => (
          <RadioGroup.Option key={id} value={id} className="focus:outline-none">
            {({ checked }) => (
              <div
                className={`group flex h-full flex-col rounded-2xl border border-white/6 bg-surface-900/70 px-3 py-3 transition-all duration-200 hover:border-white/10 hover:bg-surface-900/55 ${
                  checked ? 'shadow-panel ring-1 ring-white/15' : 'shadow-none'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-lg border text-text-secondary transition ${
                      checked ? 'border-white/30 bg-gradient-to-br from-white/15 to-white/5 text-white' : 'border-white/10 bg-surface-900/60'
                    }`}
                  >
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                {checked && (
                  <div className={`hidden h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br ${accent} text-white shadow-md sm:flex`}>
                    <span className="text-xs font-semibold">●</span>
                  </div>
                )}
                </div>
                <div className="mt-3 space-y-1">
                  <p className={`text-sm font-semibold tracking-tight ${checked ? 'text-text-primary' : 'text-text-secondary'}`}>{title}</p>
                  <p className={`text-xs leading-5 ${checked ? 'text-text-secondary' : 'text-text-tertiary'}`}>{description}</p>
                </div>
              </div>
            )}
          </RadioGroup.Option>
        ))}
      </RadioGroup>
    </div>
  );
};
