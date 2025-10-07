import { ReferenceDefinition } from "./index.js";

/**
 * Interface for column configuration options.
 */
export interface ColumnOptions {
	notNull?: boolean;
	primaryKey?: boolean;
	default?: string | number | boolean;
	length?: number;
	enumValues?: string;
	references?: ReferenceDefinition;
}
