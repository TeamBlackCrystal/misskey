import { EntityRepository, Repository } from 'typeorm';
import { Users } from '..';
import { Muting } from '../entities/muting';
import { ensure } from '../../prelude/ensure';
import { awaitAll } from '../../prelude/await-all';
import { Packed } from '../../misc/schema';

@EntityRepository(Muting)
export class MutingRepository extends Repository<Muting> {
	public async pack(
		src: Muting['id'] | Muting,
		me?: any
	): Promise<Packed<'Muting'>> {
		const muting = typeof src === 'object' ? src : await this.findOne(src).then(ensure);

		return await awaitAll({
			id: muting.id,
			createdAt: muting.createdAt.toISOString(),
			muteeId: muting.muteeId,
			mutee: Users.pack(muting.muteeId, me, {
				detail: true
			})
		});
	}

	public packMany(
		mutings: any[],
		me: any
	) {
		return Promise.all(mutings.map(x => this.pack(x, me)));
	}
}

export const packedMutingSchema = {
	type: 'object' as const,
	optional: false as const, nullable: false as const,
	properties: {
		id: {
			type: 'string' as const,
			optional: false as const, nullable: false as const,
			format: 'id',
			description: 'The unique identifier for this muting.',
			example: 'xxxxxxxxxx',
		},
		createdAt: {
			type: 'string' as const,
			optional: false as const, nullable: false as const,
			format: 'date-time',
			description: 'The date that the muting was created.'
		},
		muteeId: {
			type: 'string' as const,
			optional: false as const, nullable: false as const,
			format: 'id',
		},
		mutee: {
			type: 'object' as const,
			optional: false as const, nullable: false as const,
			ref: 'User' as const,
			description: 'The mutee.'
		},
	}
};
