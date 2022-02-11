import { EntityRepository, Repository, In } from 'typeorm';
import { Note } from '../entities/note';
import { User } from '../entities/user';
import { unique, concat } from '../../prelude/array';
import { nyaize } from '../../misc/nyaize';
import { Emojis, Users, Apps, PollVotes, DriveFiles, NoteReactions, Followings, Polls, Channels  } from '..';
import { ensure } from '../../prelude/ensure';
import { Packed } from '../../misc/schema';
import { awaitAll } from '../../prelude/await-all';
import { Emoji } from '../entities/emoji';
import { decodeReaction, convertLegacyReactions, convertLegacyReaction } from '../../misc/reaction-lib';
import parseAcct from '../../misc/acct/parse';
import { resolveUser } from '../../remote/resolve-user';
import { NoteReaction } from '../entities/note-reaction';

@EntityRepository(Note)
export class NoteRepository extends Repository<Note> {
	public validateCw(x: string) {
		return x.trim().length <= 100;
	}

	private async hideNote(packedNote: Packed<'Note'>, meId: User['id'] | null) {
		let hide = false;

		// visibility が specified かつ自分が指定されていなかったら非表示
		if (packedNote.visibility === 'specified') {
			if (meId == null) {
				hide = true;
			} else if (meId === packedNote.userId) {
				hide = false;
			} else {
				// 指定されているかどうか
				const specified = packedNote.visibleUserIds!.some((id: any) => meId === id);

				if (specified) {
					hide = false;
				} else {
					hide = true;
				}
			}
		}

		// visibility が followers かつ自分が投稿者のフォロワーでなかったら非表示
		if (packedNote.visibility == 'followers') {
			if (meId == null) {
				hide = true;
			} else if (meId === packedNote.userId) {
				hide = false;
			} else if (packedNote.reply && (meId === packedNote.reply.userId)) {
				// 自分の投稿に対するリプライ
				hide = false;
			} else if (packedNote.mentions && packedNote.mentions.some(id => meId === id)) {
				// 自分へのメンション
				hide = false;
			} else {
				// フォロワーかどうか
				const following = await Followings.findOne({
					followeeId: packedNote.userId,
					followerId: meId
				});

				if (following == null) {
					hide = true;
				} else {
					hide = false;
				}
			}
		}

		if (hide) {
			packedNote.visibleUserIds = undefined;
			packedNote.fileIds = [];
			packedNote.files = [];
			packedNote.text = null;
			packedNote.poll = undefined;
			packedNote.cw = null;
			packedNote.geo = undefined;
			packedNote.isHidden = true;
		}
	}

	public async pack(
		src: Note['id'] | Note,
		me?: User['id'] | User | null | undefined,
		options?: {
			detail?: boolean;
			skipHide?: boolean;
			_hint_?: {
				emojis: Emoji[] | null;
				myReactions: Map<Note['id'], NoteReaction | null>;
			};
		}
	): Promise<Packed<'Note'>> {
		const opts = Object.assign({
			detail: true,
			skipHide: false
		}, options);

		const meId = me ? typeof me === 'string' ? me : me.id : null;
		const note = typeof src === 'object' ? src : await this.findOne(src).then(ensure);
		const host = note.userHost;

		async function populatePoll() {
			const poll = await Polls.findOne(note.id).then(ensure);
			const choices = poll.choices.map(c => ({
				text: c,
				votes: poll.votes[poll.choices.indexOf(c)],
				isVoted: false
			}));

			if (poll.multiple) {
				const votes = await PollVotes.find({
					userId: meId!,
					noteId: note.id
				});

				const myChoices = votes.map(v => v.choice);
				for (const myChoice of myChoices) {
					choices[myChoice].isVoted = true;
				}
			} else {
				const vote = await PollVotes.findOne({
					userId: meId!,
					noteId: note.id
				});

				if (vote) {
					choices[vote.choice].isVoted = true;
				}
			}

			return {
				multiple: poll.multiple,
				expiresAt: poll.expiresAt,
				choices
			};
		}

		/**
		 * 添付用emojisを解決する
		 * @param emojiNames Note等に添付されたカスタム絵文字名 (:は含めない)
		 * @param noteUserHost Noteのホスト
		 * @param reactionNames Note等にリアクションされたカスタム絵文字名 (:は含めない)
		 */
		async function populateEmojis(emojiNames: string[], noteUserHost: string | null, reactionNames: string[]) {
			const customReactions = reactionNames?.map(x => decodeReaction(x)).filter(x => x.name);

			let all = [] as {
				name: string,
				url: string
			}[];

			// 与えられたhintだけで十分(=新たにクエリする必要がない)かどうかを表すフラグ
			let enough = true;
			if (options?._hint_?.emojis) {
				for (const name of emojiNames) {
					const matched = options._hint_.emojis.find(x => x.name === name && x.host === noteUserHost);
					if (matched) {
						all.push({
							name: matched.name,
							url: matched.url,
						});
					} else {
						enough = false;
					}
				}
				for (const customReaction of customReactions) {
					const matched = options._hint_.emojis.find(x => x.name === customReaction.name && x.host === customReaction.host);
					if (matched) {
						all.push({
							name: `${matched.name}@${matched.host || '.'}`,	// @host付きでローカルは.
							url: matched.url,
						});
					} else {
						enough = false;
					}
				}
			} else {
				enough = false;
			}
			if (enough) return all;

			const accts = emojiNames.filter(n => n.startsWith('@'));

			// カスタム絵文字
			if (emojiNames?.length > 0) {
				const tmp = await Emojis.find({
					where: {
						name: In(emojiNames),
						host: noteUserHost
					},
					select: ['name', 'host', 'url']
				}).then(emojis => emojis.map((emoji: Emoji) => {
					return {
						name: emoji.name,
						url: emoji.url,
					};
				}));

				all = concat([all, tmp]);
			}

			if (accts.length > 0) { 
				const tmp = await Promise.all(
					accts
						.map(acct => ({ acct, parsed: parseAcct(acct) }))
						.map(async ({ acct, parsed }) => {
							const user = await resolveUser(parsed.username.toLowerCase(), parsed.host || note.userHost).catch(() => null);
							return ({ acct, user: user ? await Users.pack(user) : undefined })
						})
				).then(users => users.filter((u) => u.user != null).map(u => {
					const res = {
						name: u.acct,
						url: u.user?.avatarUrl || ''
					};
					return res;
				}));

				all = concat([all, tmp]);
			}

			if (customReactions?.length > 0) {
				const where = [] as {}[];

				for (const customReaction of customReactions) {
					where.push({
						name: customReaction.name,
						host: customReaction.host
					});
				}

				const tmp = await Emojis.find({
					where,
					select: ['name', 'host', 'url']
				}).then(emojis => emojis.map((emoji: Emoji) => {
					return {
						name: `${emoji.name}@${emoji.host || '.'}`,	// @host付きでローカルは.
						url: emoji.url,
					};
				}));
				all = concat([all, tmp]);
			}

			return all;
		}

		async function populateMyReaction() {
			if (options?._hint_?.myReactions) {
				const reaction = options._hint_.myReactions.get(note.id);
				if (reaction) {
					return convertLegacyReaction(reaction.reaction);
				} else if (reaction === null) {
					return undefined;
				}
				// 実装上抜けがあるだけかもしれないので、「ヒントに含まれてなかったら(=undefinedなら)return」のようにはしない
			}

			const reaction = await NoteReactions.findOne({
				userId: meId!,
				noteId: note.id,
			});

			if (reaction) {
				return convertLegacyReaction(reaction.reaction);
			}

			return undefined;
		}

		let text = note.text;

		if (note.name && (note.url || note.uri)) {
			text = `【${note.name}】\n${(note.text || '').trim()}\n\n${note.url || note.uri}`;
		}

		const channel = note.channelId
			? note.channel
				? note.channel
				: await Channels.findOne(note.channelId)
			: null;

		const packed = await awaitAll({
			id: note.id,
			createdAt: note.createdAt.toISOString(),
			app: note.appId ? Apps.pack(note.appId) : undefined,
			userId: note.userId,
			user: Users.pack(note.user || note.userId, meId, {
				detail: false,
				_hint_: {
					emojis: options?._hint_?.emojis || null
				}
			}),
			text: text,
			cw: note.cw,
			visibility: note.visibility,
			localOnly: note.localOnly || undefined,
			visibleUserIds: note.visibility === 'specified' ? note.visibleUserIds : undefined,
			viaMobile: note.viaMobile || undefined,
			renoteCount: note.renoteCount,
			repliesCount: note.repliesCount,
			reactions: convertLegacyReactions(note.reactions),
			tags: note.tags.length > 0 ? note.tags : undefined,
			emojis: populateEmojis(note.emojis, host, Object.keys(note.reactions)),
			fileIds: note.fileIds,
			files: DriveFiles.packMany(note.fileIds),
			replyId: note.replyId,
			renoteId: note.renoteId,
			channelId: note.channelId || undefined,
			channel: channel ? {
				id: channel.id,
				name: channel.name,
			} : undefined,
			mentions: note.mentions.length > 0 ? note.mentions : undefined,
			uri: note.uri || undefined,
			url: note.url || undefined,
			geo: note.geo || undefined,

			...(opts.detail ? {
				reply: note.replyId ? this.pack(note.reply || note.replyId, meId, {
					detail: false,
					_hint_: options?._hint_
				}) : undefined,

				renote: note.renoteId ? this.pack(note.renote || note.renoteId, meId, {
					detail: true,
					_hint_: options?._hint_
				}) : undefined,

				poll: note.hasPoll ? populatePoll() : undefined,

				...(meId ? {
					myReaction: populateMyReaction()
				} : {})
			} : {})
		});

		if (packed.user.isCat && packed.text) {
			packed.text = nyaize(packed.text);
		}
		//TODO: 2020/10/28 お嬢様口調への変換追加
		//2021/03/07 準備工事
		//if (packed.user.isLady && packed.text) {
		//	packed.text = nanodawaize(packed.text);
		//}

		if (!opts.skipHide) {
			await this.hideNote(packed, meId);
		}

		return packed;
	}

	public async packMany(
		notes: (Note['id'] | Note)[],
		me?: User['id'] | User | null | undefined,
		options?: {
			detail?: boolean;
			skipHide?: boolean;
		}
	) {
		if (notes.length === 0) return [];

		const meId = me ? typeof me === 'string' ? me : me.id : null;
		const noteIds = notes.map(n => typeof n === 'object' ? n.id : n);
		const myReactionsMap = new Map<Note['id'], NoteReaction | null>();
		if (meId) {
			const renoteIds = notes.filter(n => (typeof n === 'object') && (n.renoteId != null)).map(n => (n as Note).renoteId!);
			const targets = [...noteIds, ...renoteIds];
			const myReactions = await NoteReactions.find({
				userId: meId,
				noteId: In(targets),
			});

			for (const target of targets) {
				myReactionsMap.set(target, myReactions.find(reaction => reaction.noteId === target) || null);
			}
		}

		// TODO: ここら辺の処理をaggregateEmojisみたいな関数に切り出したい
		let emojisWhere: any[] = [];
		for (const note of notes) {
			if (typeof note !== 'object') continue;
			emojisWhere.push({
				name: In(note.emojis),
				host: note.userHost
			});
			if (note.renote) {
				emojisWhere.push({
					name: In(note.renote.emojis),
					host: note.renote.userHost
				});
				if (note.renote.user) {
					emojisWhere.push({
						name: In(note.renote.user.emojis),
						host: note.renote.userHost
					});
				}
			}
			const customReactions = Object.keys(note.reactions).map(x => decodeReaction(x)).filter(x => x.name);
			emojisWhere = emojisWhere.concat(customReactions.map(x => ({
				name: x.name,
				host: x.host
			})));
			if (note.user) {
				emojisWhere.push({
					name: In(note.user.emojis),
					host: note.userHost
				});
			}
		}
		const emojis = emojisWhere.length > 0 ? await Emojis.find({
			where: emojisWhere,
			select: ['name', 'host', 'url']
		}) : null;

		return await Promise.all(notes.map(n => this.pack(n, me, {
			...options,
			_hint_: {
				myReactions: myReactionsMap,
				emojis: emojis
			}
		})));
	}
}

export const packedNoteSchema = {
	type: 'object' as const,
	optional: false as const, nullable: false as const,
	properties: {
		id: {
			type: 'string' as const,
			optional: false as const, nullable: false as const,
			format: 'id',
			description: 'The unique identifier for this Note.',
			example: 'xxxxxxxxxx',
		},
		createdAt: {
			type: 'string' as const,
			optional: false as const, nullable: false as const,
			format: 'date-time',
			description: 'The date that the Note was created on Misskey.'
		},
		text: {
			type: 'string' as const,
			optional: false as const, nullable: true as const,
		},
		cw: {
			type: 'string' as const,
			optional: true as const, nullable: true as const,
		},
		userId: {
			type: 'string' as const,
			optional: false as const, nullable: false as const,
			format: 'id',
		},
		user: {
			type: 'object' as const,
			ref: 'User' as const,
			optional: false as const, nullable: false as const,
		},
		replyId: {
			type: 'string' as const,
			optional: true as const, nullable: true as const,
			format: 'id',
			example: 'xxxxxxxxxx',
		},
		renoteId: {
			type: 'string' as const,
			optional: true as const, nullable: true as const,
			format: 'id',
			example: 'xxxxxxxxxx',
		},
		reply: {
			type: 'object' as const,
			optional: true as const, nullable: true as const,
			ref: 'Note' as const,
		},
		renote: {
			type: 'object' as const,
			optional: true as const, nullable: true as const,
			ref: 'Note' as const,
		},
		viaMobile: {
			type: 'boolean' as const,
			optional: true as const, nullable: false as const,
		},
		isHidden: {
			type: 'boolean' as const,
			optional: true as const, nullable: false as const,
		},
		visibility: {
			type: 'string' as const,
			optional: false as const, nullable: false as const,
		},
		mentions: {
			type: 'array' as const,
			optional: true as const, nullable: false as const,
			items: {
				type: 'string' as const,
				optional: false as const, nullable: false as const,
				format: 'id'
			}
		},
		visibleUserIds: {
			type: 'array' as const,
			optional: true as const, nullable: false as const,
			items: {
				type: 'string' as const,
				optional: false as const, nullable: false as const,
				format: 'id'
			}
		},
		fileIds: {
			type: 'array' as const,
			optional: true as const, nullable: false as const,
			items: {
				type: 'string' as const,
				optional: false as const, nullable: false as const,
				format: 'id'
			}
		},
		files: {
			type: 'array' as const,
			optional: true as const, nullable: false as const,
			items: {
				type: 'object' as const,
				optional: false as const, nullable: false as const,
				ref: 'DriveFile' as const,
			}
		},
		tags: {
			type: 'array' as const,
			optional: true as const, nullable: false as const,
			items: {
				type: 'string' as const,
				optional: false as const, nullable: false as const,
			}
		},
		poll: {
			type: 'object' as const,
			optional: true as const, nullable: true as const,
		},
		geo: {
			type: 'object' as const,
			optional: true as const, nullable: true as const,
		},
		channelId: {
			type: 'string' as const,
			optional: true as const, nullable: true as const,
			format: 'id',
			example: 'xxxxxxxxxx',
		},
		channel: {
			type: 'object' as const,
			optional: true as const, nullable: true as const,
			items: {
				type: 'object' as const,
				optional: false as const, nullable: false as const,
				properties: {
					id: {
						type: 'string' as const,
						optional: false as const, nullable: false as const,
					},
					name: {
						type: 'string' as const,
						optional: false as const, nullable: true as const,
					},
				},
			},
		},
		localOnly: {
			type: 'boolean' as const,
			optional: true as const, nullable: false as const,
		},
	},
	emojis: {
		type: 'array' as const,
		optional: false as const, nullable: false as const,
		items: {
			type: 'object' as const,
			optional: false as const, nullable: false as const,
			properties: {
				name: {
					type: 'string' as const,
					optional: false as const, nullable: false as const,
				},
				url: {
					type: 'string' as const,
					optional: false as const, nullable: true as const,
				},
			},
		},
	},
	reactions: {
		type: 'object' as const,
		optional: false as const, nullable: false as const,
	},
	renoteCount: {
		type: 'number' as const,
		optional: false as const, nullable: false as const,
	},
	repliesCount: {
		type: 'number' as const,
		optional: false as const, nullable: false as const,
	},
	uri: {
		type: 'string' as const,
		optional: true as const, nullable: false as const,
	},
	url: {
		type: 'string' as const,
		optional: true as const, nullable: false as const,
	},

	myReaction: {
		type: 'object' as const,
		optional: true as const, nullable: true as const,
	},
};
