import * as Redis from 'ioredis';
import config from '../config';

export function createConnection() {
	if (config.redis.path == null) { 
		return new Redis({
				port: config.redis.port,
				host: config.redis.host,
				family: config.redis.family == null ? 0 : config.redis.family,
				password: config.redis.pass,
				keyPrefix: `${config.redis.prefix}:`,
				db: config.redis.db || 0
			}
		);
	} else {
		return new Redis({
				path: config.redis.path,
				password: config.redis.pass,
				keyPrefix: `${config.redis.prefix}:`,
				db: config.redis.db || 0
			}
		);
	}
}

export const subsdcriber = createConnection();
//subsdcriber.subscribe(config.host);

export const redisClient = createConnection();
