import autobind from 'autobind-decorator';
import shouldMuteThisNote from '../../../../misc/should-mute-this-note';
import Channel from '../channel';
import { fetchMeta } from '../../../../misc/fetch-meta';
import { Notes } from '../../../../models';
import { Packed } from '@/misc/schema';

export default class extends Channel {
	public readonly chName = 'globalTimeline';
	public static shouldShare = true;
	public static requireCredential = false;

	@autobind
	public async init(params: any) {
		const meta = await fetchMeta();
		if (meta.disableGlobalTimeline) {
			if (this.user == null || (!this.user.isAdmin && !this.user.isModerator)) return;
		}

		// Subscribe events
		this.subscriber.on('notesStream', this.onNote);
	}

	@autobind
	private async onNote(note: Packed<'Note'>) {
		if (note.visibility !== 'public') return;
		if (note.channelId != null) return;

		// リプライなら再pack
		if (note.replyId != null) {
			note.reply = await Notes.pack(note.replyId, this.user, {
				detail: true
			});
		}
		// Renoteなら再pack
		if (note.renoteId != null) {
			note.renote = await Notes.pack(note.renoteId, this.user, {
				detail: true
			});
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
