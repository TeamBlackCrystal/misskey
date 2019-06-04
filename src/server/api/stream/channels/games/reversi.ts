import autobind from 'autobind-decorator';
import { publishMainStream } from '../../../../../services/stream';
import Channel from '../../channel';
import { ReversiMatchings } from '../../../../../models';

export default class extends Channel {
	public readonly chName = 'gamesReversi';
	public static shouldShare = true;
	public static requireCredential = true;

	@autobind
	public async init(params: unknown) {
		// Subscribe reversi stream
		this.subscriber.on(`reversiStream:${this.user!.id}`, data => {
			this.send(data);
		});
	}

	@autobind
	public async onMessage(type: string, body: unknown) {
		switch (type) {
			case 'ping':
				if (body.id == null) return;
				const matching = await ReversiMatchings.findOne({
					parentId: this.user!.id,
					childId: body.id
				});
				if (matching == null) return;
				publishMainStream(matching.childId, 'reversiInvited', await ReversiMatchings.pack(matching, matching.childId));
				break;
		}
	}
}
