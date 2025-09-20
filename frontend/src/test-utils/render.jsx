import React from 'react'
import '@testing-library/jest-dom'
import { render as rtlRender } from '@testing-library/react'
import { ThemeProvider } from '@mui/material/styles'
import { createTheme } from '@mui/material/styles'

// Create a test theme
const theme = createTheme()

// Custom render function that includes providers
function render(ui, { theme: customTheme, ...renderOptions } = {}) {
  function Wrapper({ children }) {
    return (
      <ThemeProvider theme={customTheme || theme}>
        {children}
      </ThemeProvider>
    )
  }

  return rtlRender(ui, { wrapper: Wrapper, ...renderOptions })
}

// Re-export everything
export * from '@testing-library/react'
export { render }