/**
 * Interface for SQL view definition.
 */
export interface ViewDefinition {
	name: string;
	dbName?: string;
	query: string;
}
