// Utility functions for conditional logging in development
export const devLog = (...args) => {
  // In test environment, always allow logging for debugging
  // In production, suppress logs
  const mode = process.env.NODE_ENV || 'development';

  if (mode !== 'production') {
    console.log(...args);
  }
};

export const devWarn = (...args) => {
  // In test environment, always allow logging for debugging
  // In production, suppress logs
  const mode = process.env.NODE_ENV || 'development';

  if (mode !== 'production') {
    console.warn(...args);
  }
};

// Always log errors even in production for debugging
export const logError = (...args) => {
  console.error(...args);
};