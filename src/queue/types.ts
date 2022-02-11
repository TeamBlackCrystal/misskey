//import { ObjectID } from 'mongodb';
import * as httpSignature from 'http-signature';
import { ILocalUser, User } from '../models/entities/user';
import { IActivity } from '../remote/activitypub/type';

export type DeliverJobData = {
	/** Actor */
	user: User;
	/** Activity */
	content: any;
	/** inbox URL to deliver */
	to: string;
};

export type InboxJobData = {
	activity: IActivity;
	signature: httpSignature.IParsedSignature;
};

export type DbJobData = DbUserJobData | DbUserImportJobData | DbUserDeleteJobData;

export type DbUserJobData = {
	user: ILocalUser;
};

export type DbUserDeleteJobData = {
	user: ThinUser;
	soft?: boolean;
};

export type DbUserImportJobData = {
	user: ILocalUser;
	fileId: string;
};

export type ObjectStorageJobData = DeleteObjectStorageFileJobData | CleanRemoteFilesJobData;

export type DeleteObjectStorageFileJobData = {
	key: string;
};

export type CleanRemoteFilesJobData = {};

export type ThinUser = {
	id: User['id'];
};
