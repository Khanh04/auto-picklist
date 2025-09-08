// Utility functions for conditional logging in development
export const devLog = (...args) => {
  if (import.meta.env.MODE !== 'production') {
    console.log(...args);
  }
};

export const devWarn = (...args) => {
  if (import.meta.env.MODE !== 'production') {
    console.warn(...args);
  }
};

// Always log errors even in production for debugging
export const logError = (...args) => {
  console.error(...args);
};