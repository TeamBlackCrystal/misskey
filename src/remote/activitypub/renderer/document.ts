import { IDriveFile } from '../../../models/drive-file';
import getDriveFileUrl from '../../../misc/get-drive-file-url';

export const renderDocument = (file: IDriveFile) => ({
	type: 'Document',
	mediaType: file.contentType,
	url: getDriveFileUrl(file)
});
