import config from '../../../config';
import { ILocalUser } from '../../../models/user';

export const renderDelete = (object: any, user: ILocalUser, id?: string) => {
	const activity = {
		type: 'Delete',
		actor: `${config.url}/users/${user._id}`,
		object
	} as any;

	if (id) activity.id = id;

	return activity;
};
