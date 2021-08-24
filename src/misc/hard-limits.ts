
// If you change DB_* values, you must also change the DB schema.

/**
 * Maximum note text length that can be stored in DB.
 * Surrogate pairs count as one
 */
export const DB_MAX_NOTE_TEXT_LENGTH = 10240;

/**
 * 値以上の場合は切り捨てる
 */
export const MAX_NAME_LENGTH = 512;
export const MAX_SUMMARY_LENGTH = 8192;
