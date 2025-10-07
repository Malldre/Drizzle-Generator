import { ColumnDefinition } from "./index.js";

/**
 * Interface for reusable column helper definition.
 */
export interface HelperDefinition {
	name: string;
	columns: ColumnDefinition[];
}
