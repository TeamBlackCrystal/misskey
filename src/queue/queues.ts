import config from '../config';
import { initialize as initializeQueue } from './initialize';
import { DbJobData, DeliverJobData, InboxJobData, ObjectStorageJobData } from './types';

//export const systemQueue = initializeQueue<Record<string, unknown>>('system');
//export const endedPollNotificationQueue = initializeQueue<EndedPollNotificationJobData>('endedPollNotification');
export const deliverQueue = initializeQueue<DeliverJobData>('deliver', config.deliverJobPerSec || 128);
export const inboxQueue = initializeQueue<InboxJobData>('inbox', config.inboxJobPerSec || 16);
export const dbQueue = initializeQueue<DbJobData>('db');
export const objectStorageQueue = initializeQueue<ObjectStorageJobData>('objectStorage');

export const queues = [
//	systemQueue,
//	endedPollNotificationQueue,
	deliverQueue,
	inboxQueue,
	dbQueue,
	objectStorageQueue,
];
