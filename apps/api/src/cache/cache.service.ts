import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface CacheStore {
  [key: string]: {
    value: any;
    expiry: number;
  };
}

@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
  private cache: CacheStore = {};
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    // Run cleanup every 60 seconds
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000);
    
    console.log('✅ In-memory cache initialized (Redis-like behavior)');
  }

  async onModuleDestroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }

  async get<T>(key: string): Promise<T | null> {
    const item = this.cache[key];
    if (!item) return null;
    
    if (Date.now() > item.expiry) {
      delete this.cache[key];
      return null;
    }
    
    return item.value as T;
  }

  async set(key: string, value: any, ttlSeconds: number = 300): Promise<void> {
    this.cache[key] = {
      value,
      expiry: Date.now() + (ttlSeconds * 1000),
    };
  }

  async del(key: string): Promise<void> {
    delete this.cache[key];
  }

  async delPattern(pattern: string): Promise<number> {
    // Delete all keys matching a pattern (e.g., 'queue:*')
    const regex = new RegExp('^' + pattern.replace('*', '.*') + '$');
    const keys = Object.keys(this.cache);
    let deleted = 0;
    
    for (const key of keys) {
      if (regex.test(key)) {
        delete this.cache[key];
        deleted++;
      }
    }
    
    return deleted;
  }

  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    // Get multiple keys at once
    return Promise.all(keys.map(key => this.get<T>(key)));
  }

  async mset(entries: Array<{ key: string; value: any; ttl?: number }>): Promise<void> {
    // Set multiple keys at once
    for (const entry of entries) {
      await this.set(entry.key, entry.value, entry.ttl || 300);
    }
  }

  async clear(): Promise<void> {
    this.cache = {};
  }

  async exists(key: string): Promise<boolean> {
    const item = this.cache[key];
    if (!item) return false;
    
    if (Date.now() > item.expiry) {
      delete this.cache[key];
      return false;
    }
    
    return true;
  }

  async keys(pattern?: string): Promise<string[]> {
    // Get all keys or keys matching a pattern
    const allKeys = Object.keys(this.cache);
    
    if (!pattern) return allKeys;
    
    const regex = new RegExp('^' + pattern.replace('*', '.*') + '$');
    return allKeys.filter(key => regex.test(key));
  }

  async size(): Promise<number> {
    return Object.keys(this.cache).length;
  }

  private cleanup(): void {
    const now = Date.now();
    const keys = Object.keys(this.cache);
    
    for (const key of keys) {
      if (now > this.cache[key].expiry) {
        delete this.cache[key];
      }
    }
  }
}
