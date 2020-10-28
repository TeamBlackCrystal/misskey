/**
 * Render OrderedCollection
 * @param id URL of self
 * @param totalItems Total number of items
 * @param first URL of first page (optional)
 * @param last URL of last page (optional)
 * @param orderedItems attached objects (optional)
 */
export function renderOrderedCollection(id: string | null, totalItems: any, first?: string | null, last?: string | null, orderedItems?: object | null) {
	const page: any = {
		id,
		type: 'OrderedCollection',
		totalItems,
	};

	if (first) page.first = first;
	if (last) page.last = last;
	if (orderedItems) page.orderedItems = orderedItems;

	return page;
}
