import autobind from 'autobind-decorator';
import shouldMuteThisNote from '../../../../misc/should-mute-this-note';
import Channel from '../channel';
import { fetchMeta } from '../../../../misc/fetch-meta';
import { Notes } from '../../../../models';
import { Packed } from '@/misc/schema';

export default class extends Channel {
	public readonly chName = 'hybridTimeline';
	public static shouldShare = true;
	public static requireCredential = true;

	@autobind
	public async init(params: any) {
		const meta = await fetchMeta();
		if (meta.disableLocalTimeline && !this.user!.isAdmin && !this.user!.isModerator) return;

		// Subscribe events
		this.subscriber.on('notesStream', this.onNote);
	}

	@autobind
	private async onNote(note: Packed<'Note'>) {
		// チャンネルの投稿ではなく、自分自身の投稿 または
		// チャンネルの投稿ではなく、その投稿のユーザーをフォローしている または
		// チャンネルの投稿ではなく、全体公開のローカルの投稿 または
		// フォローしているチャンネルの投稿 の場合だけ
		if (!(
			(note.channelId == null && this.user!.id === note.userId) ||
			(note.channelId == null && this.following.has(note.userId)) ||
			(note.channelId == null && (note.user.host == null && note.visibility === 'public')) ||
			(note.channelId != null && this.followingChannels.has(note.channelId))
		)) return;

		if (['followers', 'specified'].includes(note.visibility)) {
			note = await Notes.pack(note.id, this.user!, {
				detail: true
			});

			if (note.isHidden) {
				return;
			}
		} else {
			// リプライなら再pack
			if (note.replyId != null) {
				note.reply = await Notes.pack(note.replyId, this.user!, {
					detail: true
				});
			}
			// Renoteなら再pack
			if (note.renoteId != null) {
				note.renote = await Notes.pack(note.renoteId, this.user!, {
					detail: true
				});
			}
	}

		// 流れてきたNoteがミュートしているユーザーが関わるものだったら無視する
		if (shouldMuteThisNote(note, this.muting)) return;

		this.connection.cacheNote(note);

		this.send('note', note);
	}

	@autobind
	public dispose() {
		// Unsubscribe events
		this.subscriber.off('notesStream', this.onNote);
	}
}
