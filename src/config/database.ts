import * as dotenv from 'dotenv';
dotenv.config();

export const MONGO_DB_CONFIG = {
  host: process.env.DATABASE_HOST || '127.0.0.1',
  port: process.env.DATABASE_PORT || 27017,
  db: process.env.DATABASE_NAME || 'nft-events',
  user: process.env.DATABASE_USERNAME || 'admin',
  password: process.env.DATABASE_PASSWORD || '',
  srv: process.env.DATABASE_SRV || false,
  ssl: process.env.DATABASE_SSL || false,
  connectStr: process.env.DATABASE_CONNECT_STR || '',
};
