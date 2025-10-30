import { extendTheme, type ThemeConfig } from '@chakra-ui/react';

const config: ThemeConfig = {
  initialColorMode: 'dark',
  useSystemColorMode: false,
};

const theme = extendTheme({
  config,
  styles: {
    global: {
      body: {
        bg: 'gray.950',
        color: 'gray.50',
      },
      '@keyframes pulse': {
        '0%, 100%': {
          opacity: 1,
        },
        '50%': {
          opacity: 0.5,
        },
      },
    },
  },
  colors: {
    brand: {
      blue: '#38BDF8',
      purple: '#C084FC',
      green: '#34D399',
      orange: '#F97316',
    },
    agent: {
      mathew: '#2196F3',
      rahil: '#7E57C2',
      shreyas: '#4CAF50',
      siddarth: '#FF9800',
    },
    gray: {
      950: '#020617',
      925: '#070F1F',
      900: '#0F172A',
      850: '#141F35',
      800: '#1E293B',
      750: '#243046',
      700: '#334155',
      600: '#475569',
      500: '#64748B',
      400: '#94A3B8',
      300: '#CBD5E1',
      200: '#E2E8F0',
      100: '#F1F5F9',
      50: '#F8FAFC',
    },
  },
  fonts: {
    heading: `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`,
    body: `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`,
  },
  fontSizes: {
    xs: '0.625rem',   // 10px
    sm: '0.75rem',    // 12px
    md: '0.875rem',   // 14px
    lg: '1rem',       // 16px
    xl: '1.125rem',   // 18px
    '2xl': '1.25rem', // 20px
  },
  components: {
    Button: {
      defaultProps: {
        size: 'sm',
      },
      variants: {
        solid: {
          bg: 'gray.800',
          color: 'gray.300',
          _hover: {
            bg: 'gray.750',
            color: 'gray.100',
          },
        },
        ghost: {
          color: 'gray.400',
          _hover: {
            bg: 'gray.800',
            color: 'gray.200',
          },
        },
      },
    },
    Card: {
      baseStyle: {
        container: {
          bg: 'rgba(15, 23, 42, 0.6)',
          borderColor: 'rgba(148, 163, 184, 0.1)',
          borderWidth: '1px',
          borderRadius: 'xl',
        },
      },
    },
    Tabs: {
      variants: {
        line: {
          tab: {
            color: 'gray.500',
            borderBottom: '2px',
            borderColor: 'transparent',
            _selected: {
              color: 'gray.100',
              borderColor: 'brand.blue',
            },
            _hover: {
              color: 'gray.300',
            },
          },
          tablist: {
            borderBottom: '1px',
            borderColor: 'rgba(148, 163, 184, 0.1)',
          },
        },
      },
    },
    Input: {
      variants: {
        filled: {
          field: {
            bg: 'gray.850',
            borderColor: 'rgba(148, 163, 184, 0.1)',
            borderWidth: '1px',
            _hover: {
              bg: 'gray.800',
            },
            _focus: {
              bg: 'gray.900',
              borderColor: 'brand.blue',
            },
          },
        },
      },
      defaultProps: {
        variant: 'filled',
      },
    },
    Textarea: {
      variants: {
        filled: {
          bg: 'gray.850',
          borderColor: 'rgba(148, 163, 184, 0.1)',
          borderWidth: '1px',
          _hover: {
            bg: 'gray.800',
          },
          _focus: {
            bg: 'gray.900',
            borderColor: 'brand.blue',
          },
        },
      },
      defaultProps: {
        variant: 'filled',
      },
    },
    Badge: {
      baseStyle: {
        borderRadius: 'full',
        px: 3,
        py: 1,
        fontSize: 'xs',
        fontWeight: 'medium',
      },
    },
  },
  semanticTokens: {
    colors: {
      error: 'red.500',
      success: 'green.500',
      warning: 'orange.500',
      info: 'blue.500',
    },
  },
  radii: {
    sm: '0.625rem',   // 10px
    md: '0.875rem',   // 14px
    lg: '1.125rem',   // 18px
    xl: '1.5rem',     // 24px
    '2xl': '2rem',    // 32px
  },
  shadows: {
    sm: '0 4px 12px rgba(2, 6, 23, 0.2)',
    md: '0 8px 24px rgba(2, 6, 23, 0.3)',
    lg: '0 12px 32px rgba(2, 6, 23, 0.4)',
    outline: '0 0 0 3px rgba(56, 189, 248, 0.5)',
  },
});

export default theme;

