import { Encryption } from './lib/encryption';

require('dotenv-encrypted').config({
  secret: process.env.ENCRYPTION_KEY || Encryption.generateKey().toString('hex'),
  path: '.env'
});

export const config = {
  database: {
    url: process.env.DATABASE_URL,
    encryption: {
      key: process.env.ENCRYPTION_KEY
    }
  },
  security: {
    salt: process.env.SECURITY_SALT
  }
};