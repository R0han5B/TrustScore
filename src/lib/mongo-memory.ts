/**
 * MongoDB Memory Server Helper
 * Starts an in-memory MongoDB instance for development
 */

import { MongoMemoryServer } from 'mongodb-memory-server';
import { writeFile } from 'fs/promises';
import { join } from 'path';

let mongoServer: MongoMemoryServer | null = null;

export async function startMongoMemoryServer(): Promise<string> {
  if (mongoServer) {
    return mongoServer.getUri();
  }

  console.log('Starting MongoDB Memory Server...');
  
  mongoServer = await MongoMemoryServer.create({
    instance: {
      dbName: 'trustscore',
    },
  });

  const uri = mongoServer.getUri();
  console.log('MongoDB Memory Server started at:', uri);
  
  // Save the URI to a file for other processes to use
  await writeFile(join(process.cwd(), '.mongo-uri'), uri);
  
  return uri;
}

export async function stopMongoMemoryServer(): Promise<void> {
  if (mongoServer) {
    await mongoServer.stop();
    mongoServer = null;
    console.log('MongoDB Memory Server stopped');
  }
}

export function getMongoUri(): string | null {
  return mongoServer?.getUri() || null;
}

// Start if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startMongoMemoryServer()
    .then((uri) => {
      console.log('\n=== MongoDB Memory Server Started ===');
      console.log('URI:', uri);
      console.log('\nCopy this URI to your .env file as DATABASE_URL');
      console.log('Press Ctrl+C to stop\n');
    })
    .catch(console.error);
}
