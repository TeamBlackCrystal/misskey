import { IUser, isRemoteUser } from '../../../models/user';
import config from '../../../config';

export const renderMention = (mention: IUser) => ({
	type: 'Mention',
	href: isRemoteUser(mention) ? mention.uri : `${config.url}/users/${mention._id}`,
	name: isRemoteUser(mention) ? `@${mention.username}@${mention.host}` : `@${mention.username}`,
});
