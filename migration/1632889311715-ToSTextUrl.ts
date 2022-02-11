import {MigrationInterface, QueryRunner} from "typeorm";

export class ToSTextUrl1632889311715 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
			await queryRunner.query(`ALTER TABLE "meta" ADD "ToSTextUrl" character varying(512)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
			await queryRunner.query(`ALTER TABLE "meta" DROP COLUMN "ToSTextUrl"`);
    }

}
