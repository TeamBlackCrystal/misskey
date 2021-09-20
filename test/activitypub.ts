/*
 * Tests for ActivityPub
 *
 * How to run the tests:
 * > npx cross-env TS_NODE_FILES=true TS_NODE_TRANSPILE_ONLY=true TS_NODE_PROJECT="./test/tsconfig.json" mocha test/activitypub.ts --require ts-node/register
 *
 * To specify test:
 * > npx cross-env TS_NODE_FILES=true TS_NODE_TRANSPILE_ONLY=true TS_NODE_PROJECT="./test/tsconfig.json" npx mocha test/activitypub.ts --require ts-node/register -g 'test name'
 */
process.env.NODE_ENV = 'test';

import rndstr from 'rndstr';
import * as assert from 'assert';
import { initTestDb } from './utils';
import { LdSignature } from '../src/remote/activitypub/misc/ld-signature';
import { genRsaKeyPair, genEcKeyPair } from '../src/misc/gen-key-pair';

describe('ActivityPub', () => {
	before(async () => {
		await initTestDb();
	});

	describe('Parse minimum object', () => {
		const host = 'https://host1.test';
		const preferredUsername = `${rndstr('A-Z', 4)}${rndstr('a-z', 4)}`;
		const actorId = `${host}/users/${preferredUsername.toLowerCase()}`;

		const actor = {
			'@context': 'https://www.w3.org/ns/activitystreams',
			id: actorId,
			type: 'Person',
			preferredUsername,
			inbox: `${actorId}/inbox`,
			outbox: `${actorId}/outbox`,
		};

		const post = {
			'@context': 'https://www.w3.org/ns/activitystreams',
			id: `${host}/users/${rndstr('0-9a-z', 8)}`,
			type: 'Note',
			attributedTo: actor.id,
			to: 'https://www.w3.org/ns/activitystreams#Public',
			content: 'あ',
		};

		it('Minimum Actor', async () => {
			const { MockResolver } = await import('./misc/mock-resolver');
			const { createPerson } = await import('../src/remote/activitypub/models/person');

			const resolver = new MockResolver();
			resolver._register(actor.id, actor);

			const user = await createPerson(actor.id, resolver);

			assert.deepStrictEqual(user.uri, actor.id);
			assert.deepStrictEqual(user.username, actor.preferredUsername);
			assert.deepStrictEqual(user.inbox, actor.inbox);
		});

		it('Minimum Note', async () => {
			const { MockResolver } = await import('./misc/mock-resolver');
			const { createNote } = await import('../src/remote/activitypub/models/note');

			const resolver = new MockResolver();
			resolver._register(actor.id, actor);
			resolver._register(post.id, post);

			const note = await createNote(post.id, resolver, true);

			assert.deepStrictEqual(note?.uri, post.id);
			assert.deepStrictEqual(note?.visibility, 'public');
			assert.deepStrictEqual(note?.text, post.content);
		});
	});

	describe('Truncate long name', () => {
		const host = 'https://host1.test';
		const preferredUsername = `${rndstr('A-Z', 4)}${rndstr('a-z', 4)}`;
		const actorId = `${host}/users/${preferredUsername.toLowerCase()}`;

		const name = rndstr('0-9a-z', 513);

		const actor = {
			'@context': 'https://www.w3.org/ns/activitystreams',
			id: actorId,
			type: 'Person',
			preferredUsername,
			name,
			inbox: `${actorId}/inbox`,
			outbox: `${actorId}/outbox`,
		};

		it('Actor', async () => {
			const { MockResolver } = await import('./misc/mock-resolver');
			const { createPerson } = await import('../src/remote/activitypub/models/person');

			const resolver = new MockResolver();
			resolver._register(actor.id, actor);

			const user = await createPerson(actor.id, resolver);

			assert.deepStrictEqual(user.name, actor.name.substr(0, 512));
		});
	});

	describe('RsaSignature2017', () => {
		const data = {
			"@context": [
				"https://w3id.org/identity/v1",
			],
			"title": "a",
		};

		it('Basic sign/verify', async () => {
			const ldSignature = new LdSignature();
			ldSignature.debug = true;

			const rsa1 = await genRsaKeyPair();

			const signed = await ldSignature.signRsaSignature2017(data, rsa1.privateKey, 'https://example.com/users/1');
			const verified = await ldSignature.verifyRsaSignature2017(signed, rsa1.publicKey);
			assert.strictEqual(verified, true);
		});

		it('Verification fails if another key', async () => {
			const ldSignature = new LdSignature();
			ldSignature.debug = true;

			const rsa1 = await genRsaKeyPair();
			const rsa2 = await genRsaKeyPair();

			const signed = await ldSignature.signRsaSignature2017(data, rsa1.privateKey, 'https://example.com/users/1');
			const verified = await ldSignature.verifyRsaSignature2017(signed, rsa2.publicKey);
			assert.strictEqual(verified, false);
		});

		it('Verification fails if tampered', async () => {
			const ldSignature = new LdSignature();
			ldSignature.debug = true;

			const rsa1 = await genRsaKeyPair();

			const signed = await ldSignature.signRsaSignature2017(data, rsa1.privateKey, 'https://example.com/users/1');

			const tampered = { ...signed };
			tampered.title = 'b';

			const verified = await ldSignature.verifyRsaSignature2017(tampered, rsa1.publicKey);
			assert.strictEqual(verified, false);
		});

		it('Rejects if signature.type is not RsaSignature2017', async () => {
			const ldSignature = new LdSignature();
			ldSignature.debug = true;

			const rsa1 = await genRsaKeyPair();

			const signed = await ldSignature.signRsaSignature2017(data, rsa1.privateKey, 'https://example.com/users/1');

			const another = { ...signed };
			another.signature.type = 'AnotherSignature';

			await assert.rejects(ldSignature.verifyRsaSignature2017(data, rsa1.publicKey), {
				message: 'signature is not RsaSignature2017'
			});
		});

		it('Rejects if privateKey is not rsa', async () => {
			const ldSignature = new LdSignature();
			ldSignature.debug = true;

			const ec1 = await genEcKeyPair();

			await assert.rejects(ldSignature.signRsaSignature2017(data, ec1.privateKey, 'https://example.com/users/1'), {
				message: 'privateKey is not rsa'
			});
		});

		it('Rejects if publicKey is not rsa', async () => {
			const ldSignature = new LdSignature();
			ldSignature.debug = true;

			const rsa1 = await genRsaKeyPair();
			const ec1 = await genEcKeyPair();

			const signed = await ldSignature.signRsaSignature2017(data, rsa1.privateKey, 'https://example.com/users/1');

			await assert.rejects(ldSignature.verifyRsaSignature2017(signed, ec1.publicKey), {
				message: 'publicKey is not rsa'
			});
		});
	});

	describe('RsaSignature2017', () => {
		const data = {
			"@context": [
				"https://w3id.org/identity/v1",
			],
			"title": "a",
		};

		it('Basic sign/verify', async () => {
			const ldSignature = new LdSignature();
			ldSignature.debug = true;

			const rsa1 = await genRsaKeyPair();

			const signed = await ldSignature.signRsaSignature2017(data, rsa1.privateKey, 'https://example.com/users/1');
			const verified = await ldSignature.verifyRsaSignature2017(signed, rsa1.publicKey);
			assert.strictEqual(verified, true);
		});

		it('Verification fails if another key', async () => {
			const ldSignature = new LdSignature();
			ldSignature.debug = true;

			const rsa1 = await genRsaKeyPair();
			const rsa2 = await genRsaKeyPair();

			const signed = await ldSignature.signRsaSignature2017(data, rsa1.privateKey, 'https://example.com/users/1');
			const verified = await ldSignature.verifyRsaSignature2017(signed, rsa2.publicKey);
			assert.strictEqual(verified, false);
		});

		it('Verification fails if tampered', async () => {
			const ldSignature = new LdSignature();
			ldSignature.debug = true;

			const rsa1 = await genRsaKeyPair();

			const signed = await ldSignature.signRsaSignature2017(data, rsa1.privateKey, 'https://example.com/users/1');

			const tampered = { ...signed };
			tampered.title = 'b';

			const verified = await ldSignature.verifyRsaSignature2017(tampered, rsa1.publicKey);
			assert.strictEqual(verified, false);
		});

		it('Rejects if signature.type is not RsaSignature2017', async () => {
			const ldSignature = new LdSignature();
			ldSignature.debug = true;

			const rsa1 = await genRsaKeyPair();

			const signed = await ldSignature.signRsaSignature2017(data, rsa1.privateKey, 'https://example.com/users/1');

			const another = { ...signed };
			another.signature.type = 'AnotherSignature';

			await assert.rejects(ldSignature.verifyRsaSignature2017(data, rsa1.publicKey), {
				message: 'signature is not RsaSignature2017'
			});
		});

		it('Rejects if privateKey is not rsa', async () => {
			const ldSignature = new LdSignature();
			ldSignature.debug = true;

			const ec1 = await genEcKeyPair();

			await assert.rejects(ldSignature.signRsaSignature2017(data, ec1.privateKey, 'https://example.com/users/1'), {
				message: 'privateKey is not rsa'
			});
		});

		it('Rejects if publicKey is not rsa', async () => {
			const ldSignature = new LdSignature();
			ldSignature.debug = true;

			const rsa1 = await genRsaKeyPair();
			const ec1 = await genEcKeyPair();

			const signed = await ldSignature.signRsaSignature2017(data, rsa1.privateKey, 'https://example.com/users/1');

			await assert.rejects(ldSignature.verifyRsaSignature2017(signed, ec1.publicKey), {
				message: 'publicKey is not rsa'
			});
		});
	});
});
