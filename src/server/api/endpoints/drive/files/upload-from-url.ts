import $ from 'cafy';
import { ID } from '../../../../../misc/cafy-id';
import * as ms from 'ms';
import uploadFromUrl from '../../../../../services/drive/upload-from-url';
import define from '../../../define';
import { DriveFiles } from '../../../../../models';
import { DB_MAX_IMAGE_COMMENT_LENGTH } from '@/misc/hard-limits';

export const meta = {
	desc: {
		'ja-JP': 'ドライブに指定されたURLに存在するファイルをアップロードします。'
	},

	tags: ['drive'],

	limit: {
		duration: ms('1hour'),
		max: 60
	},

	requireCredential: true,

	kind: 'write:drive',

	params: {
		url: {
			// TODO: Validate this url
			validator: $.str,
		},

		folderId: {
			validator: $.optional.nullable.type(ID),
			default: null as any,
		},

		isSensitive: {
			validator: $.optional.bool,
			default: false,
			desc: {
				'ja-JP': 'このメディアが「閲覧注意」(NSFW)かどうか',
				'en-US': 'Whether this media is NSFW'
			}
		},

		comment: {
			validator: $.optional.nullable.str.max(DB_MAX_IMAGE_COMMENT_LENGTH),
			default: null,
			desc: {
				'ja-JP': 'コメント (INOP)'
			}
		},

		force: {
			validator: $.optional.bool,
			default: false,
			desc: {
				'ja-JP': 'true にすると、同じハッシュを持つファイルが既にアップロードされていても強制的にファイルを作成します。',
			}
		}
	}
};

export default define(meta, async (ps, user) => {
	//todo: ps.comment
	return await DriveFiles.pack(await uploadFromUrl(ps.url, user, ps.folderId, null, ps.isSensitive, ps.force), { self: true });
});
