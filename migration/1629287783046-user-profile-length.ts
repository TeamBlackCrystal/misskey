import {MigrationInterface, QueryRunner} from "typeorm";

export class userProfileLength1629287783046 implements MigrationInterface {

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "user" ALTER COLUMN "name" TYPE character varying(512)`, undefined);
		await queryRunner.query(`ALTER TABLE "user_profile" ALTER COLUMN "description" TYPE character varying(8192)`, undefined);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "user" ALTER COLUMN "name" TYPE character varying(128)`, undefined);
		await queryRunner.query(`ALTER TABLE "user_profile" ALTER COLUMN "description" TYPE character varying(2048)`, undefined);
	}

}
