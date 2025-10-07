import { ColumnDefinition } from "./ColumnDefinition.js";

/**
 * Interface for table definition.
 */
export interface TableDefinition {
	name: string;
	dbName?: string;
	columns: ColumnDefinition[];
	helperReferences?: string[];
	compositePrimaryKey?: string[];
}
