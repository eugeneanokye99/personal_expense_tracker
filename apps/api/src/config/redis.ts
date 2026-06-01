import Redis from 'ioredis';
import { env } from './env';

// High-fidelity in-memory Redis mock for local fallback
class InMemoryRedis {
  private store = new Map<string, { value: string; expiry?: number }>();

  async get(key: string): Promise<string | null> {
    const item = this.store.get(key);
    if (!item) return null;
    if (item.expiry && item.expiry < Date.now()) {
      this.store.delete(key);
      return null;
    }
    return item.value;
  }

  async set(key: string, value: any, ...args: any[]): Promise<string | null> {
    let expiry: number | undefined;
    
    // Handle 'EX' argument
    const exIndex = args.indexOf('EX');
    if (exIndex !== -1 && args[exIndex + 1]) {
      expiry = Date.now() + parseInt(args[exIndex + 1]) * 1000;
    }

    // Handle 'NX' argument
    const nxIndex = args.indexOf('NX');
    if (nxIndex !== -1) {
      const exists = await this.exists(key);
      if (exists) return null;
    }

    this.store.set(key, { value: String(value), expiry });
    return 'OK';
  }

  async del(key: string): Promise<number> {
    return this.store.delete(key) ? 1 : 0;
  }

  async exists(key: string): Promise<number> {
    const value = await this.get(key);
    return value !== null ? 1 : 0;
  }

  async incr(key: string): Promise<number> {
    const value = await this.get(key);
    const num = value ? parseInt(value) + 1 : 1;
    await this.set(key, String(num));
    return num;
  }

  async expire(key: string, seconds: number): Promise<number> {
    const item = this.store.get(key);
    if (!item) return 0;
    item.expiry = Date.now() + seconds * 1000;
    return 1;
  }
}

// Resilient wrapper that delegates to ioredis, with automatic in-memory fallback on auth or connection failures
class RedisClientWrapper {
  private client!: Redis;
  private fallbackStore: InMemoryRedis | null = null;
  private isFallback = false;

  constructor() {
    this.init();
  }

  private init() {
    const redisOptions: any = {
      maxRetriesPerRequest: 1,
      enableReadyCheck: true,
      lazyConnect: false,
    };

    let sanitizedRedisUrl = env.REDIS_URL;

    // Normalize username for Render Redis
    try {
      if (sanitizedRedisUrl.includes('@')) {
        const urlObj = new URL(sanitizedRedisUrl);
        if (urlObj.username && urlObj.username !== 'default') {
          urlObj.username = 'default';
          sanitizedRedisUrl = urlObj.toString();
        }
      }
    } catch (e) {
      // Ignore URL parsing errors
    }

    if (sanitizedRedisUrl.startsWith('rediss://')) {
      redisOptions.tls = { rejectUnauthorized: false };
    }

    try {
      this.client = new Redis(sanitizedRedisUrl, redisOptions);

      this.client.on('connect', () => {
        if (!this.isFallback) {
          console.log('✅ Redis connected to cloud');
        }
      });

      this.client.on('error', (err: any) => {
        if (this.isFallback) return;

        // If permanent failure (NOAUTH, connection refused, or timeout), fall back to in-memory
        if (
          err.message.includes('NOAUTH') ||
          err.message.includes('ECONNREFUSED') ||
          err.message.includes('ENOTFOUND') ||
          err.message.includes('ETIMEDOUT')
        ) {
          console.warn(`⚠️  Cloud Redis is unreachable or requires authentication (${err.message}). Falling back to in-memory Redis...`);
          this.isFallback = true;
          this.fallbackStore = new InMemoryRedis();
          try {
            this.client.disconnect();
          } catch (e) {}
        } else {
          console.error('❌ Redis connection error:', err.message);
        }
      });
    } catch (e) {
      console.warn('⚠️  Failed to initialize Redis client. Falling back to in-memory Redis...');
      this.isFallback = true;
      this.fallbackStore = new InMemoryRedis();
    }
  }

  async get(key: string) {
    if (this.isFallback) return this.fallbackStore!.get(key);
    return this.client.get(key);
  }

  async set(key: string, value: any, ...args: any[]) {
    if (this.isFallback) return this.fallbackStore!.set(key, value, ...args);
    return this.client.set(key, value, ...args);
  }

  async del(key: string) {
    if (this.isFallback) return this.fallbackStore!.del(key);
    return this.client.del(key);
  }

  async exists(key: string) {
    if (this.isFallback) return this.fallbackStore!.exists(key);
    return this.client.exists(key);
  }

  async incr(key: string) {
    if (this.isFallback) return this.fallbackStore!.incr(key);
    return this.client.incr(key);
  }

  async expire(key: string, seconds: number) {
    if (this.isFallback) return this.fallbackStore!.expire(key, seconds);
    return this.client.expire(key, seconds);
  }

  on(event: string, callback: any) {
    if (this.isFallback) {
      if (event === 'connect') {
        setTimeout(callback, 0);
      }
    } else {
      this.client.on(event, callback);
    }
    return this;
  }
}

export const redis = new RedisClientWrapper();
