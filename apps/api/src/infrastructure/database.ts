import mongoose from 'mongoose';

import type { AppLogger } from '../config/logger.js';

export async function connectDatabase(uri: string, logger: AppLogger): Promise<void> {
  mongoose.set('strictQuery', true);
  mongoose.set('sanitizeFilter', true);
  await mongoose.connect(uri, {
    autoIndex: process.env.NODE_ENV !== 'production',
    serverSelectionTimeoutMS: 10_000,
  });
  logger.info('MongoDB connection established');
}

export async function disconnectDatabase(logger: AppLogger): Promise<void> {
  await mongoose.disconnect();
  logger.info('MongoDB connection closed');
}

export function getDatabaseHealth(): 'connected' | 'connecting' | 'disconnected' {
  if (mongoose.connection.readyState === mongoose.ConnectionStates.connected) return 'connected';
  if (mongoose.connection.readyState === mongoose.ConnectionStates.connecting) return 'connecting';
  return 'disconnected';
}
