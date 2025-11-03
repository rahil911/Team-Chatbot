// import { StrictMode } from 'react'  // DISABLED: Causes duplicate WebSocket connections in dev
import { createRoot } from 'react-dom/client'
import { ChakraProvider } from '@chakra-ui/react'
import theme from './theme/chakra-theme'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  // <StrictMode>  {/* DISABLED: Prevents duplicate WebSocket connections */}
    <ChakraProvider theme={theme}>
      <App />
    </ChakraProvider>
  // </StrictMode>,
)
