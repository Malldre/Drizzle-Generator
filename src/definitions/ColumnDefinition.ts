import { ColumnOptions } from "./index.js";

/**
 * Interface for column definition input.
 */
export interface ColumnDefinition {
	name: string;
	type?: string;
	options?: ColumnOptions;
}
