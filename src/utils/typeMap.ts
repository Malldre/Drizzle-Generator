/**
 * Map of JSON types to Drizzle pg-core column function names.
 */
export const TypeMap: { [key: string]: string } = {
	serial: "serial",
	string: "varchar",
	text: "text",
	number: "integer",
	bigint: "bigint",
	boolean: "boolean",
	date: "timestamp",
	json: "jsonb",
	uuid: "uuid",
	enum: "pgEnum",
};
