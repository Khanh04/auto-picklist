// Mock logger for tests
export const devLog = jest.fn((...args) => {
  // In test environment, we can choose to log or not
  if (process.env.NODE_ENV !== 'test') {
    console.log(...args);
  }
});