import {MigrationInterface, QueryRunner} from "typeorm";

export class defaultStarForReactionFallback1629702556432 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
			await queryRunner.query(`ALTER TABLE "meta" DROP COLUMN "useStarForReactionFallback"`, undefined);
			await queryRunner.query(`ALTER TABLE "meta" ADD "useStarForReactionFallback" boolean NOT NULL DEFAULT true`, undefined);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
			await queryRunner.query(`ALTER TABLE "meta" DROP COLUMN "useStarForReactionFallback"`, undefined);
			await queryRunner.query(`ALTER TABLE "meta" ADD "useStarForReactionFallback" boolean NOT NULL DEFAULT false`, undefined);
    }

}
