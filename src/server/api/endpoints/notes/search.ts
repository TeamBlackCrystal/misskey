import $ from 'cafy';
import searchClient from '../../../../db/searchClient';
import define from '../../define';
import { ApiError } from '../../error';
import { Notes } from '../../../../models';
import { In } from 'typeorm';
import { ID } from '../../../../misc/cafy-id';
import config from '../../../../config';
import { makePaginationQuery } from '../../common/make-pagination-query';
import { generateVisibilityQuery } from '../../common/generate-visibility-query';
import { generateMutedUserQuery } from '../../common/generate-muted-user-query';

export const meta = {
	desc: {
		'ja-JP': '投稿を検索します。',
		'en-US': 'Search notes.'
	},

	tags: ['notes'],

	requireCredential: false as const,

	params: {
		query: {
			validator: $.str
		},

		sinceId: {
			validator: $.optional.type(ID),
		},

		untilId: {
			validator: $.optional.type(ID),
		},

		limit: {
			validator: $.optional.num.range(1, 100),
			default: 10
		},

		offset: {
			validator: $.optional.num.min(0),
			default: 0
		},

		host: {
			validator: $.optional.nullable.str,
			default: undefined
		},

		userId: {
			validator: $.optional.nullable.type(ID),
			default: null
		},

		/*
		channelId: {
			validator: $.optional.nullable.type(ID),
			default: null
		},
		*/
	},

	res: {
		type: 'array' as const,
		optional: false as const,
		nullable: false as const,
		items: {
			type: 'object' as const,
			optional: false as const,
			nullable: false as const,
			ref: 'Note'
		}
	},

	errors: {
		searchingNotAvailable: {
			message: 'Searching not available.',
			code: 'SEARCHING_NOT_AVAILABLE',
			id: '7ee9c119-16a1-479f-a6fd-6fab00ed946f'
		}
	}
};

export default define(meta, async (ps, me) => {
	if (searchClient == null) {
		if (config.searchFalse == null) config.searchFalse = false;
		if (config.searchFalse) throw new ApiError(meta.errors.searchingNotAvailable);

		const query = makePaginationQuery(Notes.createQueryBuilder('note'), ps.sinceId, ps.untilId);
		const sinceRegex = /since:([0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01]))/g;
		const untilRegex = /until:([0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01]))/g;
		const hostRegex = /host:([a-zA-Z0-9.-]+)/g;

		if (ps.userId) {
			query.andWhere('note.userId = :userId', { userId: ps.userId });
		} /*else if (ps.channelId) {
			query.andWhere('note.channelId = :channelId', { channelId: ps.channelId });
		}*/

		if (sinceRegex.test(ps.query)) {
			query.andWhere('note.createdAt > :since', {since: `${RegExp.$1}`});
			ps.query = ps.query.replaceAll(sinceRegex, '');
		}
		if (untilRegex.test(ps.query)) {
			query.andWhere('note.createdAt < :until', {until: `${RegExp.$1} 23:59:59`});
			ps.query = ps.query.replaceAll(untilRegex, '');
		}
		if (config.db.pgroonga == null) config.db.pgroonga = false;
		const isQuery = ps.query.replaceAll(hostRegex, '');
		if (hostRegex.test(ps.query)) {
			// pgroongaがあるとエラー落ちするので対策
			if (RegExp.$1 === 'local' && config.db.pgroonga) {
				query.andWhere('note.userHost IS NULL');

				generateVisibilityQuery(query, me);
				if (me) generateMutedUserQuery(query, me);
				const notes = await query.take(ps.limit!).getMany();
				return await Notes.packMany(notes, me);
			// ローカル通常
			} else if (RegExp.$1 === 'local') {
				query.andWhere('note.userHost IS NULL');
			// pgroongaがあるとエラー落ちするので対策
			} else if (!isQuery && config.db.pgroonga) {
				query.andWhere('note.userHost = :host', {host: `${RegExp.$1}`});

				generateVisibilityQuery(query, me);
				if (me) generateMutedUserQuery(query, me);
				const notes = await query.take(ps.limit!).getMany();
				return await Notes.packMany(notes, me);
			// 外部通常
			} else {
				query.andWhere('note.userHost = :host', {host: `${RegExp.$1}`});
			}
			ps.query = ps.query.replaceAll(hostRegex, '');
		}

		ps.query = ps.query.replaceAll(/\s\s+/g, ' ');

		if (config.db.pgroonga) {
			query
				.andWhere('note.text &@~ :q', { q: `${ps.query}` })
				.innerJoinAndSelect('note.user', 'user')
				.leftJoinAndSelect('note.reply', 'reply')
				.leftJoinAndSelect('note.renote', 'renote')
				.leftJoinAndSelect('reply.user', 'replyUser')
				.leftJoinAndSelect('renote.user', 'renoteUser');
		} else {
			query
				.andWhere('note.text ILIKE :q', { q: `%${ps.query}%` })
				.innerJoinAndSelect('note.user', 'user')
				.leftJoinAndSelect('note.reply', 'reply')
				.leftJoinAndSelect('note.renote', 'renote')
				.leftJoinAndSelect('reply.user', 'replyUser')
				.leftJoinAndSelect('renote.user', 'renoteUser');
		}

		generateVisibilityQuery(query, me);
		if (me) generateMutedUserQuery(query, me);

		const notes = await query.take(ps.limit!).getMany();

		return await Notes.packMany(notes, me);
	} else {

		const hits = await searchClient.search(ps.query, {
			userHost: ps.host,
			userId: ps.userId
		});

		if (hits.length === 0) return [];

		// Fetch found notes
		const notes = await Notes.find({
			where: {
				id: In(hits)
			},
			order: {
				id: -1
			}
		});

		return await Notes.packMany(notes, me);
	}
});
