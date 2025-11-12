import { Fragment } from 'react';
import { Listbox, Transition } from '@headlessui/react';
import { ChevronUpDownIcon, CheckIcon, CpuChipIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';

export type ModelType = 'gpt-4o' | 'gpt-5' | 'o1-preview' | 'o1-mini';

interface Model {
  id: ModelType;
  name: string;
  description: string;
  status: 'stable' | 'beta' | 'experimental';
}

const MODELS: Model[] = [
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    description: 'Fast & reliable',
    status: 'stable'
  },
  {
    id: 'gpt-5',
    name: 'GPT-5',
    description: 'Advanced reasoning',
    status: 'experimental'
  },
  {
    id: 'o1-preview',
    name: 'o1-preview',
    description: 'Deep thinking',
    status: 'beta'
  },
  {
    id: 'o1-mini',
    name: 'o1-mini',
    description: 'Quick reasoning',
    status: 'beta'
  },
];

interface ModelSelectorProps {
  value: ModelType;
  onChange: (model: ModelType) => void;
  className?: string;
}

export const ModelSelector = ({ value, onChange, className }: ModelSelectorProps) => {
  const selected = MODELS.find(m => m.id === value) || MODELS[0];

  return (
    <div className={clsx("relative", className)}>
      <Listbox value={value} onChange={onChange}>
        <div className="relative">
          <Listbox.Button className="relative w-full cursor-pointer rounded-xl bg-surface-800/80 border border-white/10 py-2.5 pl-3 pr-10 text-left shadow-lg hover:bg-surface-700/80 focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-all duration-200">
            <div className="flex items-center gap-2">
              <CpuChipIcon className="h-5 w-5 text-primary-400" />
              <span className="block truncate text-sm font-medium text-white">
                {selected.name}
              </span>
              <span className={clsx(
                "ml-1 px-2 py-0.5 text-xs font-medium rounded-full",
                {
                  'bg-green-900/50 text-green-300': selected.status === 'stable',
                  'bg-yellow-900/50 text-yellow-300': selected.status === 'beta',
                  'bg-purple-900/50 text-purple-300': selected.status === 'experimental',
                }
              )}>
                {selected.status}
              </span>
            </div>
            <span className="absolute inset-y-0 right-0 flex items-center pr-2">
              <ChevronUpDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
            </span>
          </Listbox.Button>

          <Transition
            as={Fragment}
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <Listbox.Options className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-xl bg-surface-800/95 backdrop-blur-xl border border-white/10 py-1 text-base shadow-xl focus:outline-none sm:text-sm">
              {MODELS.map((model) => (
                <Listbox.Option
                  key={model.id}
                  className={({ active }) =>
                    clsx(
                      'relative cursor-pointer select-none py-2.5 pl-10 pr-4 transition-colors',
                      active ? 'bg-primary-600/20 text-white' : 'text-gray-300'
                    )
                  }
                  value={model.id}
                >
                  {({ selected, active }) => (
                    <>
                      <div className="flex items-center justify-between">
                        <div>
                          <span className={clsx('block truncate font-medium', selected && 'text-primary-400')}>
                            {model.name}
                          </span>
                          <span className="text-xs text-gray-500">
                            {model.description}
                          </span>
                        </div>
                        <span className={clsx(
                          "ml-2 px-2 py-0.5 text-xs font-medium rounded-full",
                          {
                            'bg-green-900/50 text-green-300': model.status === 'stable',
                            'bg-yellow-900/50 text-yellow-300': model.status === 'beta',
                            'bg-purple-900/50 text-purple-300': model.status === 'experimental',
                          }
                        )}>
                          {model.status}
                        </span>
                      </div>
                      {selected && (
                        <span className={clsx(
                          'absolute inset-y-0 left-0 flex items-center pl-3',
                          active ? 'text-white' : 'text-primary-400'
                        )}>
                          <CheckIcon className="h-5 w-5" aria-hidden="true" />
                        </span>
                      )}
                    </>
                  )}
                </Listbox.Option>
              ))}
            </Listbox.Options>
          </Transition>
        </div>
      </Listbox>
    </div>
  );
};