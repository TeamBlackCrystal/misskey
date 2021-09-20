import { EntityRepository, In, Repository } from 'typeorm';
import { Users, Notes, NoteReactions, Emojis } from '..';
import { Notification } from '../entities/notification';
import { ensure } from '../../prelude/ensure';
import { awaitAll } from '../../prelude/await-all';
import { SchemaType } from '../../misc/schema';
import { Note } from '../entities/note';
import { NoteReaction } from '../entities/note-reaction';
import { User } from '../entities/user';
import { decodeReaction } from '../../misc/reaction-lib';
import { Emoji } from '../entities/emoji';
import { notificationTypes } from '@/types';

export type PackedNotification = SchemaType<typeof packedNotificationSchema>;

@EntityRepository(Notification)
export class NotificationRepository extends Repository<Notification> {
	public async pack(
		src: Notification['id'] | Notification,
		options: {
			_hintForEachNotes_?: {
				emojis: Emoji[] | null;
				myReactions: Map<Note['id'], NoteReaction | null>;
			};
		}
	): Promise<PackedNotification> {
		const notification = typeof src === 'object' ? src : await this.findOne(src).then(ensure);

		return await awaitAll({
			id: notification.id,
			createdAt: notification.createdAt.toISOString(),
			type: notification.type,
			isRead: notification.isRead,
			userId: notification.notifierId,
			user: Users.pack(notification.notifier || notification.notifierId),
			...(notification.type === 'mention' ? {
				note: Notes.pack(notification.note || notification.noteId!, notification.notifieeId, {
					detail: true,
					_hint_: options._hintForEachNotes_
				}),
			} : {}),
			...(notification.type === 'reply' ? {
				note: Notes.pack(notification.note || notification.noteId!, notification.notifieeId, {
					detail: true,
					_hint_: options._hintForEachNotes_
				}),
			} : {}),
			...(notification.type === 'renote' ? {
				note: Notes.pack(notification.note || notification.noteId!, notification.notifieeId, {
					detail: true,
					_hint_: options._hintForEachNotes_
				}),
			} : {}),
			...(notification.type === 'quote' ? {
				note: Notes.pack(notification.note || notification.noteId!, notification.notifieeId, {
					detail: true,
					_hint_: options._hintForEachNotes_
				}),
			} : {}),
			...(notification.type === 'reaction' ? {
				note: Notes.pack(notification.note || notification.noteId!, notification.notifieeId, {
					detail: true,
					_hint_: options._hintForEachNotes_
				}),
				reaction: notification.reaction
			} : {}),
			...(notification.type === 'pollVote' ? {
				note: Notes.pack(notification.note || notification.noteId!, notification.notifieeId, {
					detail: true,
					_hint_: options._hintForEachNotes_
				}),
				choice: notification.choice
			} : {})
		});
	}

	public async packMany(
		notifications: Notification[],
		meId: User['id']
	) {
		if (notifications.length === 0) return [];

		const notes = notifications.filter(x => x.note != null).map(x => x.note!);
		const noteIds = notes.map(n => n.id);
		const myReactionsMap = new Map<Note['id'], NoteReaction | null>();
		const renoteIds = notes.filter(n => n.renoteId != null).map(n => n.renoteId!);
		const targets = [...noteIds, ...renoteIds];
		const myReactions = await NoteReactions.find({
			userId: meId,
			noteId: In(targets),
		});

		for (const target of targets) {
			myReactionsMap.set(target, myReactions.find(reaction => reaction.noteId === target) || null);
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

		return await Promise.all(notifications.map(x => this.pack(x, {
			_hintForEachNotes_: {
				myReactions: myReactionsMap,
				emojis: emojis,
			}
		})));
	}
}

export const packedNotificationSchema = {
	type: 'object' as const,
	optional: false as const, nullable: false as const,
	properties: {
		id: {
			type: 'string' as const,
			optional: false as const, nullable: false as const,
			format: 'id',
			description: 'The unique identifier for this notification.',
			example: 'xxxxxxxxxx',
		},
		createdAt: {
			type: 'string' as const,
			optional: false as const, nullable: false as const,
			format: 'date-time',
			description: 'The date that the notification was created.'
		},
		isRead: {
			type: 'boolean' as const,
			optional: false as const, nullable: false as const,
		},
		type: {
			type: 'string' as const,
			optional: false as const, nullable: false as const,
			enum: [...notificationTypes],
			description: 'The type of the notification.'
		},
		user: {
			type: 'object' as const,
			ref: 'User' as const,
			optional: true as const, nullable: true as const,
		},
		userId: {
			type: 'string' as const,
			optional: true as const, nullable: true as const,
			format: 'id',
		},
		note: {
			type: 'object' as const,
			ref: 'Note' as const,
			optional: true as const, nullable: true as const,
		},
		reaction: {
			type: 'string' as const,
			optional: true as const, nullable: true as const,
		},
		choice: {
			type: 'number' as const,
			optional: true as const, nullable: true as const,
		},
		invitation: {
			type: 'object' as const,
			optional: true as const, nullable: true as const,
		},
		body: {
			type: 'string' as const,
			optional: true as const, nullable: true as const,
		},
		header: {
			type: 'string' as const,
			optional: true as const, nullable: true as const,
		},
		icon: {
			type: 'string' as const,
			optional: true as const, nullable: true as const,
		},
	}
};
