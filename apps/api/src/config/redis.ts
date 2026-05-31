import Redis from 'ioredis';
import { env } from './env';

const redisOptions: any = {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: false,
};

let sanitizedRedisUrl = env.REDIS_URL;

// 1. Render external Redis URLs use the resource ID (e.g. red-xxx) as the username,
// but Redis expects standard authentication (username 'default'). We normalize this.
try {
  if (sanitizedRedisUrl.includes('@')) {
    const urlObj = new URL(sanitizedRedisUrl);
    if (urlObj.username && urlObj.username !== 'default') {
      urlObj.username = 'default';
      sanitizedRedisUrl = urlObj.toString();
    }
  }
} catch (e) {
  // Fallback if URL parsing fails
}

// 2. Secure Redis connections (rediss://) require the TLS option in ioredis
if (sanitizedRedisUrl.startsWith('rediss://')) {
  redisOptions.tls = {
    rejectUnauthorized: false, // Prevents certificate validation errors on self-signed cloud certs
  };
}

export const redis = new Redis(sanitizedRedisUrl, redisOptions);

redis.on('connect', () => console.log('✅ Redis connected'));
redis.on('error', (err) => console.error('❌ Redis error:', err.message));
