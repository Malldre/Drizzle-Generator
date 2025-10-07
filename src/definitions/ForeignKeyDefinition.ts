/**
 * Interface for foreign key constraint definition.
 */
export interface ForeignKeyDefinition {
	referencesTable: string;
	referencesColumn: string;
	onDelete?: "cascade" | "restrict" | "set null" | "no action";
	onUpdate?: "cascade" | "restrict" | "set null" | "no action";
}
