// Jest global setup file

module.exports = async () => {
  console.log('Jest global setup started');
  
  // Setup global test environment
  process.env.NODE_ENV = 'test';
  
  // Mock Tauri API globally
  const { jest } = require('@jest/globals');
  global.__TAURI_INTERNALS__ = {
    invoke: jest.fn(),
    listen: jest.fn(),
    emit: jest.fn(),
  };
  
  console.log('Jest global setup completed');
};