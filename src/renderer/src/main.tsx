import '@mantine/core/styles.css'
import './motion.css'
import { MantineProvider } from '@mantine/core'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { theme } from './theme'

const container = document.getElementById('root')
if (!container) throw new Error('root element missing')

createRoot(container).render(
  <StrictMode>
    <MantineProvider theme={theme} defaultColorScheme="light">
      <App />
    </MantineProvider>
  </StrictMode>
)
