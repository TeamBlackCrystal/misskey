import * as Bull from 'bull';
import * as Redis from "ioredis";
import config from '../config';

let redisOpts: Redis.RedisOptions

if (config.redis.path == null) {
	redisOpts = {
		port:  config.redis.port,
		host: config.redis.host,
		password: config.redis.pass,
		db: config.redis.db || 0,
	}
} else {
	redisOpts = {
		path: config.redis.path,
		password: config.redis.pass,
		db: config.redis.db || 0,
	}
}

export function initialize<T>(name: string, limitPerSec = -1) {
	return new Bull<T>(name, {
		redis: redisOpts,
		prefix: config.redis.prefix ? `${config.redis.prefix}:queue` : 'queue',
		limiter: limitPerSec > 0 ? {
			max: limitPerSec,
			duration: 1000
		} : undefined,
		settings: {
			backoffStrategies: {
				apBackoff
			}
		}
	});
}

function apBackoff(attemptsMade: number, err: Error) {
	const baseDelay = 60 * 1000;	// 1min
	const maxBackoff = 8 * 60 * 60 * 1000;	// 8hours
	let backoff = (Math.pow(2, attemptsMade) - 1) * baseDelay;
	backoff = Math.min(backoff, maxBackoff);
	backoff += Math.round(backoff * Math.random() * 0.2);
	return backoff;
}
