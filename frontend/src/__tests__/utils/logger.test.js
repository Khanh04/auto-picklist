import { devLog } from '../../utils/logger';

// Mock import.meta.env
const mockEnv = {
  MODE: 'development'
};

// Mock import.meta
Object.defineProperty(global, 'import', {
  value: {
    meta: {
      env: mockEnv
    }
  },
  writable: true
});

describe('logger utility', () => {
  let consoleSpy;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    // Reset environment mode
    mockEnv.MODE = 'development';
  });

  describe('devLog', () => {
    test('should log in development mode', () => {
      mockEnv.MODE = 'development';
      
      devLog('Test message', { data: 'test' });
      
      expect(consoleSpy).toHaveBeenCalledWith('Test message', { data: 'test' });
    });

    test('should log in test mode', () => {
      mockEnv.MODE = 'test';
      
      devLog('Test message');
      
      expect(consoleSpy).toHaveBeenCalledWith('Test message');
    });

    test('should not log in production mode', () => {
      mockEnv.MODE = 'production';
      
      devLog('Test message', { data: 'test' });
      
      expect(consoleSpy).not.toHaveBeenCalled();
    });

    test('should handle multiple arguments', () => {
      mockEnv.MODE = 'development';
      
      devLog('Message', 123, true, { object: 'data' });
      
      expect(consoleSpy).toHaveBeenCalledWith('Message', 123, true, { object: 'data' });
    });

    test('should handle no arguments', () => {
      mockEnv.MODE = 'development';
      
      devLog();
      
      expect(consoleSpy).toHaveBeenCalledWith();
    });

    test('should handle complex objects', () => {
      mockEnv.MODE = 'development';
      
      const complexObject = {
        nested: {
          array: [1, 2, 3],
          boolean: true,
          nullValue: null,
          undefinedValue: undefined
        }
      };
      
      devLog('Complex object:', complexObject);
      
      expect(consoleSpy).toHaveBeenCalledWith('Complex object:', complexObject);
    });
  });
});