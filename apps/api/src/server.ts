import { createServer } from 'node:http';

import { createApp } from './app.js';
import { loadEnvironment } from './config/env.js';
import { createLogger } from './config/logger.js';
import { connectDatabase, disconnectDatabase } from './infrastructure/database.js';
import {
  configureSocketGateway,
  createRealtimeServer,
} from './infrastructure/realtime/socket.gateway.js';
import { SocketRealtimePublisher } from './infrastructure/realtime/socket.publisher.js';
import { createIdentityDependencies } from './modules/auth/identity.dependencies.js';
import { createChatDependencies } from './modules/chat/chat.dependencies.js';

const environment = loadEnvironment();
const logger = createLogger(environment);
const identity = createIdentityDependencies(environment, logger);
const httpServer = createServer();
const socketServer = createRealtimeServer(httpServer, environment.CLIENT_URL);
const realtime = new SocketRealtimePublisher(socketServer);
const collaboration = createChatDependencies(identity, realtime);
const app = createApp({ environment, logger, identity, realtime });
httpServer.on('request', app);
configureSocketGateway(socketServer, identity, collaboration.projects, collaboration.chat, logger);

let isShuttingDown = false;

async function start(): Promise<void> {
  await connectDatabase(environment.MONGODB_URI, logger);
  httpServer.listen(environment.PORT, () => {
    logger.info({ port: environment.PORT }, 'NexOps API is listening');
  });
}

async function shutdown(signal: NodeJS.Signals): Promise<void> {
  if (isShuttingDown) return;
  isShuttingDown = true;
  logger.info({ signal }, 'Graceful shutdown started');

  await new Promise<void>((resolve, reject) => {
    void socketServer.close();
    httpServer.close((error) => (error ? reject(error) : resolve()));
  });
  await disconnectDatabase(logger);
}

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    void shutdown(signal)
      .then(() => process.exit(0))
      .catch((error: unknown) => {
        logger.fatal({ err: error }, 'Graceful shutdown failed');
        process.exit(1);
      });
  });
}

start().catch((error: unknown) => {
  logger.fatal({ err: error }, 'API startup failed');
  process.exit(1);
});
