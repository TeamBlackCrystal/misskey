import config from '../config';

const u = config.mongodb.user ? encodeURIComponent(config.mongodb.user) : null;
const p = config.mongodb.pass ? encodeURIComponent(config.mongodb.pass) : null;

const uri = `mongodb://${u && p ? `${u}:${p}@` : ''}${config.mongodb.host}:${config.mongodb.port}/${config.mongodb.db}`;

/**
 * monk
 */
import mongo, { TMiddleware } from 'monk';

const db = mongo(uri);

if (true) {
	const log: TMiddleware = context => next => (args, method) => {
		const name = context?.collection?.name;
		const t0 = Date.now();
		return next(args, method).then(res => {
			const t1 = Date.now();
			const td = Math.max(0, t1 - t0);
			console.debug(`Query: ${name} ${method} ${td}ms`);
			return res
		})
	}

	db.addMiddleware(log);
}

export default db;

/**
 * MongoDB native module (officialy)
 */
import * as mongodb from 'mongodb';

let mdb: mongodb.Db;

const nativeDbConn = async (): Promise<mongodb.Db> => {
	if (mdb) return mdb;

	const db = await ((): Promise<mongodb.Db> => new Promise((resolve, reject) => {
		mongodb.MongoClient.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true }, (e: Error, client: any) => {
			if (e) return reject(e);
			resolve(client.db(config.mongodb.db));
		});
	}))();

	mdb = db;

	return db;
};

export { nativeDbConn };

