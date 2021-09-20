/*
 * Tests of MFM
 *
 * How to run the tests:
 * > TS_NODE_FILES=true mocha test/reaction-lib.ts --require ts-node/register
 *
 * To specify test:
 * > TS_NODE_FILES=true mocha test/reaction-lib.ts --require ts-node/register -g 'test name'
 */
/*
import * as assert from 'assert';

import { initTestDb } from './utils';
import { toDbReaction } from '../src/misc/reaction-lib';

describe('toDbReaction', async () => {
	before(async () => {
		await initTestDb();
	});

	it('Unicodeのまま', async () => {
		assert.strictEqual(await toDbReaction('🍅'), '🍅');
	});

	it('異体字セレクタ除去', async () => {
		assert.strictEqual(await toDbReaction('㊗️'), '㊗');
	});

	it('異体字セレクタ除去 必要なし', async () => {
		assert.strictEqual(await toDbReaction('㊗'), '㊗');
	});

	it('fallback - undefined', async () => {
		assert.strictEqual(await toDbReaction(undefined), '⭐');
	});

	it('fallback - null', async () => {
		assert.strictEqual(await toDbReaction(null), '⭐');
	});

	it('fallback - empty', async () => {
		assert.strictEqual(await toDbReaction(''), '⭐');
	});

	it('fallback - unknown', async () => {
		assert.strictEqual(await toDbReaction('unknown'), '⭐');
	});
});
*/
