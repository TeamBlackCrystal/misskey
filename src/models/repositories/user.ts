import $ from 'cafy';
import { EntityRepository, Repository, In, Not } from 'typeorm';
import { User, ILocalUser, IRemoteUser } from '../entities/user';
import { Emojis, Notes, NoteUnreads, FollowRequests, Notifications, MessagingMessages, UserNotePinings, Followings, Blockings, Mutings, UserProfiles, UserSecurityKeys, UserGroupJoinings, Pages, Instances, DriveFiles, Users, Announcements, AnnouncementReads, Antennas, AntennaNotes, ChannelFollowings  } from '..';
import { ensure } from '../../prelude/ensure';
import config from '../../config';
import { Packed } from '../../misc/schema';
import { awaitAll } from '../../prelude/await-all';
import { toPunyNullable } from '../../misc/convert-host';
import { Emoji } from '../entities/emoji';
import { getAntennas } from '../../misc/antenna-cache';
import { USER_ACTIVE_THRESHOLD, USER_ONLINE_THRESHOLD } from '@/const';

@EntityRepository(User)
export class UserRepository extends Repository<User> {
	public async getRelation(me: User['id'], target: User['id']) {
		const [following1, following2, followReq1, followReq2, toBlocking, fromBlocked, mute] = await Promise.all([
			Followings.findOne({
				followerId: me,
				followeeId: target
			}),
			Followings.findOne({
				followerId: target,
				followeeId: me
			}),
			FollowRequests.findOne({
				followerId: me,
				followeeId: target
			}),
			FollowRequests.findOne({
				followerId: target,
				followeeId: me
			}),
			Blockings.findOne({
				blockerId: me,
				blockeeId: target
			}),
			Blockings.findOne({
				blockerId: target,
				blockeeId: me
			}),
			Mutings.findOne({
				muterId: me,
				muteeId: target
			})
		]);

		return {
			id: target,
			isFollowing: following1 != null,
			hasPendingFollowRequestFromYou: followReq1 != null,
			hasPendingFollowRequestToYou: followReq2 != null,
			isFollowed: following2 != null,
			isBlocking: toBlocking != null,
			isBlocked: fromBlocked != null,
			isMuted: mute != null
		};
	}

	public async getHasUnreadMessagingMessage(userId: User['id']): Promise<boolean> {
		const mute = await Mutings.find({
			muterId: userId
		});

		const joinings = await UserGroupJoinings.find({ userId: userId });

		const groupQs = Promise.all(joinings.map(j => MessagingMessages.createQueryBuilder('message')
			.where(`message.groupId = :groupId`, { groupId: j.userGroupId })
			.andWhere('message.userId != :userId', { userId: userId })
			.andWhere('NOT (:userId = ANY(message.reads))', { userId: userId })
			.andWhere('message.createdAt > :joinedAt', { joinedAt: j.createdAt }) // 自分が加入する前の会話については、未読扱いしない
			.getOne().then(x => x != null)));

		const [withUser, withGroups] = await Promise.all([
			MessagingMessages.count({
				where: {
					recipientId: userId,
					isRead: false,
					...(mute.length > 0 ? { userId: Not(In(mute.map(x => x.muteeId))) } : {}),
				},
				take: 1
			}).then(count => count > 0),
			groupQs
		]);

		return withUser || withGroups.some(x => x);
	}

	public async getHasUnreadAnnouncement(userId: User['id']): Promise<boolean> {
		const reads = await AnnouncementReads.find({
			userId: userId
		});

		const count = await Announcements.count(reads.length > 0 ? {
			id: Not(In(reads.map(read => read.announcementId)))
		} : {});

		return count > 0;
	}

	public async getHasUnreadAntenna(userId: User['id']): Promise<boolean> {
		const myAntennas = (await getAntennas()).filter(a => a.userId === userId);

		const unread = myAntennas.length > 0 ? await AntennaNotes.findOne({
			antennaId: In(myAntennas.map(x => x.id)),
			read: false
		}) : null;

		return unread != null;
	}

	public async getHasUnreadChannel(userId: User['id']): Promise<boolean> {
		const channels = await ChannelFollowings.find({ followerId: userId });

		const unread = channels.length > 0 ? await NoteUnreads.findOne({
			userId: userId,
			noteChannelId: In(channels.map(x => x.id)),
		}) : null;

		return unread != null;
	}

	public async getHasUnreadNotification(userId: User['id']): Promise<boolean> {
		const mute = await Mutings.find({
			muterId: userId
		});
		const mutedUserIds = mute.map(m => m.muteeId);

		const count = await Notifications.count({
			where: {
				notifieeId: userId,
				...(mutedUserIds.length > 0 ? { notifierId: Not(In(mutedUserIds)) } : {}),
				isRead: false
			},
			take: 1
		});

		return count > 0;
	}

	public async getHasPendingReceivedFollowRequest(userId: User['id']): Promise<boolean> {
		const count = await FollowRequests.count({
			followeeId: userId
		});

		return count > 0;
	}

	public getOnlineStatus(user: User): string {
		if (user.hideOnlineStatus == null) return 'unknown';
		if (user.lastActiveDate == null) return 'unknown';
		const elapsed = Date.now() - user.lastActiveDate.getTime();
		return (
			elapsed < USER_ONLINE_THRESHOLD ? 'online' :
			elapsed < USER_ACTIVE_THRESHOLD ? 'active' :
			'offline'
		);
	}

	public getAvatarUrl(user: User): string {
		if (user.avatarUrl) {
			return user.avatarUrl;
		} else {
			return `${config.url}/random-avatar/${user.id}`;
		}
	}

	public async pack(
		src: User['id'] | User,
		me?: User['id'] | User | null | undefined,
		options?: {
			detail?: boolean,
			includeSecrets?: boolean,
			// TODO: remove
			includeHasUnreadNotes?: boolean
			_hint_?: {
				emojis: Emoji[] | null;
			};
		}
	): Promise<Packed<'User'>> {
		const opts = Object.assign({
			detail: false,
			includeSecrets: false
		}, options);

		let user: User;

		if (typeof src === 'object') {
			user = src;
			if (src.avatar === undefined && src.avatarId) src.avatar = await DriveFiles.findOne(src.avatarId) || null;
			if (src.banner === undefined && src.bannerId) src.banner = await DriveFiles.findOne(src.bannerId) || null;
		} else {
			user = await this.findOneOrFail(src, {
				relations: ['avatar', 'banner']
			});
		}

		const meId = me ? typeof me === 'string' ? me : me.id : null;

		const relation = meId && (meId !== user.id) && opts.detail ? await this.getRelation(meId, user.id) : null;
		const pins = opts.detail ? await UserNotePinings.find({
			where: { userId: user.id },
			order: { id: 'DESC' }
		}) : [];
		const profile = opts.detail ? await UserProfiles.findOne(user.id).then(ensure) : null;

		let emojis: Emoji[] = [];
		if (user.emojis.length > 0) {
			// 与えられたhintだけで十分(=新たにクエリする必要がない)かどうかを表すフラグ
			let enough = true;
			if (options?._hint_?.emojis) {
				for (const name of user.emojis) {
					const matched = options._hint_.emojis.find(x => x.name === name && x.host === user.host);
					if (matched) {
						emojis.push(matched);
					} else {
						enough = false;
					}
				}
			} else {
				enough = false;
			}

			if (!enough) {
				emojis = await Emojis.find({
					where: {
						name: In(user.emojis),
						host: user.host
					},
					select: ['name', 'host', 'url', 'aliases']
				});
			}
		}

		const falsy = opts.detail ? false : undefined;

		const packed = {
			id: user.id,
			name: user.name,
			username: user.username,
			host: user.host,
			avatarUrl: user.avatar ? DriveFiles.getPublicUrl(user.avatar, true) : config.url + '/avatar/' + user.id,
			avatarBlurhash: user.avatar?.blurhash || null,
			avatarColor: null,
			isAdmin: user.isAdmin || falsy,
			isBot: user.isBot || falsy,
			isCat: user.isCat || falsy,
			isLady: user.isLady || falsy,
			isVerified: user.isVerified || falsy,
			isPremium: user.isPremium || falsy,
			instance: user.host ? Instances.findOne({ host: user.host }).then(instance => instance ? {
				host: toPunyNullable(user.host),
				name: instance.name,
				softwareName: instance.softwareName,
				softwareVersion: instance.softwareVersion,
				iconUrl: instance.iconUrl,
				faviconUrl: instance.faviconUrl,
				themeColor: instance.themeColor,
			} : undefined) : undefined,

			// カスタム絵文字添付
			emojis: emojis,

			...(opts.includeHasUnreadNotes ? {
				hasUnreadSpecifiedNotes: NoteUnreads.count({
					where: { userId: user.id, isSpecified: true },
					take: 1
				}).then(count => count > 0),
				hasUnreadMentions: NoteUnreads.count({
					where: { userId: user.id },
					take: 1
				}).then(count => count > 0),
			} : {}),

			onlineStatus: this.getOnlineStatus(user),

			...(opts.detail ? {
				url: profile!.url,
				uri: user.uri,
				createdAt: user.createdAt.toISOString(),
				updatedAt: user.updatedAt ? user.updatedAt.toISOString() : null,
				bannerUrl: user.banner ? DriveFiles.getPublicUrl(user.banner, false) : null,
				bannerBlurhash: user.bannerBlurhash,
				bannerColor: null, // 後方互換性のため
				isLocked: user.isLocked,
				isModerator: user.isModerator || falsy,
				isSilenced: user.isSilenced || falsy,
				isSuspended: user.isSuspended || falsy,
				description: profile!.description,
				location: profile!.location,
				birthday: profile!.birthday,
				fields: profile!.fields,
				followersCount: user.followersCount,
				followingCount: user.followingCount,
				notesCount: user.notesCount,
				pinnedNoteIds: pins.map(pin => pin.noteId),
				pinnedNotes: Notes.packMany(pins.map(pin => pin.noteId), meId, {
					detail: true
				}),
				pinnedPageId: profile!.pinnedPageId,
				pinnedPage: profile!.pinnedPageId ? Pages.pack(profile!.pinnedPageId, meId) : null,
				twoFactorEnabled: profile!.twoFactorEnabled,
				usePasswordLessLogin: profile!.usePasswordLessLogin,
				securityKeys: profile!.twoFactorEnabled
					? UserSecurityKeys.count({
						userId: user.id
					}).then(result => result >= 1)
					: false,
				twitter: profile!.twitter ? {
					id: profile!.twitterUserId,
					screenName: profile!.twitterScreenName
				} : null,
				github: profile!.github ? {
					id: profile!.githubId,
					login: profile!.githubLogin
				} : null,
				discord: profile!.discord ? {
					id: profile!.discordId,
					username: profile!.discordUsername,
					discriminator: profile!.discordDiscriminator
				} : null,
				movedToUserId: user.movedToUserId,
				movedToUser: user.movedToUserId ? Users.pack(user.movedToUserId) : null,
			} : {}),

			...(opts.detail && meId === user.id ? {
				avatarId: user.avatarId,
				bannerId: user.bannerId,
				autoWatch: profile!.autoWatch,
				alwaysMarkNsfw: profile!.alwaysMarkNsfw,
				carefulBot: profile!.carefulBot,
				carefulMassive: profile!.carefulMassive,
				autoAcceptFollowed: profile!.autoAcceptFollowed,
				hasUnreadSpecifiedNotes: NoteUnreads.count({
					where: { userId: user.id, isSpecified: true },
					take: 1
				}).then(count => count > 0),
				hasUnreadMentions: NoteUnreads.count({
					where: { userId: user.id, isMentioned: true },
					take: 1
				}).then(count => count > 0),
				noCrawle: profile!.noCrawle,
				isExplorable: user.isExplorable,
				isDeleted: user.isDeleted,
				hideOnlineStatus: user.hideOnlineStatus,
				hasUnreadAnnouncement: this.getHasUnreadAnnouncement(user.id),
				hasUnreadAntenna: this.getHasUnreadAntenna(user.id),
				hasUnreadChannel: this.getHasUnreadChannel(user.id),
				hasUnreadMessagingMessage: this.getHasUnreadMessagingMessage(user.id),
				hasUnreadNotification: this.getHasUnreadNotification(user.id),
				pendingReceivedFollowRequestsCount: this.getHasPendingReceivedFollowRequest(user.id),
				mutingNotificationTypes: profile?.mutingNotificationTypes,
			} : {}),

			...(opts.includeSecrets ? {
				clientData: profile!.clientData,
				email: profile!.email,
				emailVerified: profile!.emailVerified,
				securityKeysList: profile!.twoFactorEnabled
					? UserSecurityKeys.find({
						where: {
							userId: user.id
						},
						select: ['id', 'name', 'lastUsed']
					})
					: []
			} : {}),

			...(relation ? {
				isFollowing: relation.isFollowing,
				isFollowed: relation.isFollowed,
				hasPendingFollowRequestFromYou: relation.hasPendingFollowRequestFromYou,
				hasPendingFollowRequestToYou: relation.hasPendingFollowRequestToYou,
				isBlocking: relation.isBlocking,
				isBlocked: relation.isBlocked,
				isMuted: relation.isMuted,
			} : {})
		};

		return await awaitAll(packed);
	}

	public packMany(
		users: (User['id'] | User)[],
		me?: User['id'] | User | null | undefined,
		options?: {
			detail?: boolean,
			includeSecrets?: boolean,
			// TODO: remove
			includeHasUnreadNotes?: boolean
		}
	) {
		return Promise.all(users.map(u => this.pack(u, me, options)));
	}

	public isLocalUser(user: User): user is ILocalUser {
		return user.host == null;
	}

	public isRemoteUser(user: User): user is IRemoteUser {
		return !this.isLocalUser(user);
	}

	//#region Validators
	public validateLocalUsername = $.str.match(/^\w{1,20}$/);
	public validatePassword = $.str.min(1);
	public validateName = $.str.min(1).max(50);
	public validateDescription = $.str.min(1).max(500);
	public validateLocation = $.str.min(1).max(50);
	public validateBirthday = $.str.match(/^([0-9]{4,8})-([0-9]{2})-([0-9]{2})$/);
	//#endregion
}

export const packedUserSchema = {
	type: 'object' as const,
	nullable: false as const, optional: false as const,
	properties: {
		id: {
			type: 'string' as const,
			nullable: false as const, optional: false as const,
			format: 'id',
			description: 'The unique identifier for this User.',
			example: 'xxxxxxxxxx',
		},
		name: {
			type: 'string' as const,
			nullable: true as const, optional: false as const,
			description: 'The name of the user, as they’ve defined it.',
			example: '藍'
		},
		username: {
			type: 'string' as const,
			nullable: false as const, optional: false as const,
			description: 'The screen name, handle, or alias that this user identifies themselves with.',
			example: 'ai'
		},
		host: {
			type: 'string' as const,
			nullable: true as const, optional: false as const,
			example: 'misskey.example.com'
		},
		avatarUrl: {
			type: 'string' as const,
			format: 'url',
			nullable: true as const, optional: false as const,
		},
		avatarBlurhash: {
			type: 'any' as const,
			nullable: true as const, optional: false as const,
		},
		avatarColor: {
			type: 'any' as const,
			nullable: true as const, optional: false as const,
			default: null
		},
		isAdmin: {
			type: 'boolean' as const,
			nullable: false as const, optional: true as const,
			default: false,
			description: 'Whether this account is the admin.'
		},
		isModerator: {
			type: 'boolean' as const,
			nullable: false as const, optional: true as const,
			default: false,
			description: 'Whether this account is a moderator.'
		},
		isVerified: {
			type: 'boolean' as const,
			nullable: false as const, optional: true as const,
		},
		isBot: {
			type: 'boolean' as const,
			nullable: false as const, optional: true as const,
			description: 'Whether this account is a bot.'
		},
		isCat: {
			type: 'boolean' as const,
			nullable: false as const, optional: true as const,
			description: 'Whether this account is a cat.'
		},
		isLady: {
			type: 'boolean' as const,
			nullable: false as const, optional: true as const,
			description: 'Whether this account is a Lady.'
		},
		emojis: {
			type: 'any' as const,
			nullable: true as const, optional: false as const,
			properties: {
				name: {
					type: 'string' as const,
					nullable: false as const, optional: false as const
				},
				host: {
					type: 'string' as const,
					nullable: true as const, optional: false as const
				},
				url: {
					type: 'string' as const,
					nullable: false as const, optional: false as const,
					format: 'url'
				},
				aliases: {
					type: 'array' as const,
					nullable: false as const, optional: false as const,
					items: {
						type: 'string' as const,
						nullable: false as const, optional: false as const
					}
				}
			}
		},
		url: {
			type: 'string' as const,
			format: 'url',
			nullable: true as const, optional: true as const,
		},
		createdAt: {
			type: 'string' as const,
			nullable: false as const, optional: true as const,
			format: 'date-time',
			description: 'The date that the user account was created on Misskey.'
		},
		updatedAt: {
			type: 'string' as const,
			nullable: true as const, optional: true as const,
			format: 'date-time',
		},
		bannerUrl: {
			type: 'string' as const,
			format: 'url',
			nullable: true as const, optional: true as const,
		},
		bannerBlurhash: {
			type: 'any' as const,
			nullable: true as const, optional: true as const,
		},
		bannerColor: {
			type: 'any' as const,
			nullable: true as const, optional: true as const,
			default: null
		},
		isLocked: {
			type: 'boolean' as const,
			nullable: false as const, optional: true as const,
		},
		isSuspended: {
			type: 'boolean' as const,
			nullable: false as const, optional: true as const,
			example: false
		},
		description: {
			type: 'string' as const,
			nullable: true as const, optional: true as const,
			description: 'The user-defined UTF-8 string describing their account.',
			example: 'Hi masters, I am Ai!'
		},
		location: {
			type: 'string' as const,
			nullable: true as const, optional: true as const,
		},
		birthday: {
			type: 'string' as const,
			nullable: true as const, optional: true as const,
			example: '2018-03-12'
		},
		fields: {
			type: 'array' as const,
			nullable: false as const, optional: true as const,
			items: {
				type: 'object' as const,
				nullable: false as const, optional: false as const,
				properties: {
					name: {
						type: 'string' as const,
						nullable: false as const, optional: false as const
					},
					value: {
						type: 'string' as const,
						nullable: false as const, optional: false as const
					}
				},
				maxLength: 4
			}
		},
		followersCount: {
			type: 'number' as const,
			nullable: false as const, optional: true as const,
			description: 'The number of followers this account currently has.'
		},
		followingCount: {
			type: 'number' as const,
			nullable: false as const, optional: true as const,
			description: 'The number of users this account is following.'
		},
		notesCount: {
			type: 'number' as const,
			nullable: false as const, optional: true as const,
			description: 'The number of Notes (including renotes) issued by the user.'
		},
		pinnedNoteIds: {
			type: 'array' as const,
			nullable: false as const, optional: true as const,
			items: {
				type: 'string' as const,
				nullable: false as const, optional: false as const,
				format: 'id',
			}
		},
		pinnedNotes: {
			type: 'array' as const,
			nullable: false as const, optional: true as const,
			items: {
				type: 'object' as const,
				nullable: false as const, optional: false as const,
				ref: 'Note' as const,
			}
		},
		pinnedPageId: {
			type: 'string' as const,
			nullable: true as const, optional: true as const
		},
		pinnedPage: {
			type: 'object' as const,
			nullable: true as const, optional: true as const,
			ref: 'Page' as const,
		},
		twoFactorEnabled: {
			type: 'boolean' as const,
			nullable: false as const, optional: true as const,
			default: false
		},
		usePasswordLessLogin: {
			type: 'boolean' as const,
			nullable: false as const, optional: true as const,
			default: false
		},
		securityKeys: {
			type: 'boolean' as const,
			nullable: false as const, optional: true as const,
			default: false
		},
		avatarId: {
			type: 'string' as const,
			nullable: true as const, optional: true as const,
			format: 'id'
		},
		bannerId: {
			type: 'string' as const,
			nullable: true as const, optional: true as const,
			format: 'id'
		},
		autoWatch: {
			type: 'boolean' as const,
			nullable: false as const, optional: true as const
		},
		injectFeaturedNote: {
			type: 'boolean' as const,
			nullable: false as const, optional: true as const
		},
		alwaysMarkNsfw: {
			type: 'boolean' as const,
			nullable: false as const, optional: true as const
		},
		carefulBot: {
			type: 'boolean' as const,
			nullable: false as const, optional: true as const
		},
		autoAcceptFollowed: {
			type: 'boolean' as const,
			nullable: false as const, optional: true as const
		},
		hasUnreadSpecifiedNotes: {
			type: 'boolean' as const,
			nullable: false as const, optional: true as const,
		},
		hasUnreadMentions: {
			type: 'boolean' as const,
			nullable: false as const, optional: true as const,
		},
		hasUnreadAnnouncement: {
			type: 'boolean' as const,
			nullable: false as const, optional: true as const,
		},
		hasUnreadAntenna: {
			type: 'boolean' as const,
			nullable: false as const, optional: true as const,
		},
		hasUnreadChannel: {
			type: 'boolean' as const,
			nullable: false as const, optional: true as const,
		},
		hasUnreadMessagingMessage: {
			type: 'boolean' as const,
			nullable: false as const, optional: true as const,
		},
		hasUnreadNotification: {
			type: 'boolean' as const,
			nullable: false as const, optional: true as const,
		},
		hasPendingReceivedFollowRequest: {
			type: 'boolean' as const,
			nullable: false as const, optional: true as const,
		},/*
		integrations: {
			type: 'object' as const,
			nullable: false as const, optional: true as const
		},
		mutedWords: {
			type: 'array' as const,
			nullable: false as const, optional: true as const
		},*/
		mutingNotificationTypes: {
			type: 'array' as const,
			nullable: false as const, optional: true as const
		},
		isFollowing: {
			type: 'boolean' as const,
			optional: true as const, nullable: false as const
		},
		hasPendingFollowRequestFromYou: {
			type: 'boolean' as const,
			optional: true as const, nullable: false as const
		},
		hasPendingFollowRequestToYou: {
			type: 'boolean' as const,
			optional: true as const, nullable: false as const
		},
		isFollowed: {
			type: 'boolean' as const,
			optional: true as const, nullable: false as const
		},
		isBlocking: {
			type: 'boolean' as const,
			optional: true as const, nullable: false as const
		},
		isBlocked: {
			type: 'boolean' as const,
			optional: true as const, nullable: false as const
		},
		isMuted: {
			type: 'boolean' as const,
			optional: true as const, nullable: false as const
		}
	},
};
