import { ProjectGeneratorConfig } from "./ProjectGeneratorConfig.js";

/**
 * Interface for schema reading results
 */
export interface SchemaReaderResult {
	success: boolean;
	message: string;
	schema?: ProjectGeneratorConfig;
	files: {
		enums: string[];
		helpers: string[];
		tables: string[];
		indexes: string[];
	};
	errors?: string[];
	metadata: {
		lastModified: Date;
		totalFiles: number;
		projectPath: string;
	};
}

/**
 * Categories of schema changes
 */
export enum SchemaChangeCategory {
	ADDITION = "addition",
	MODIFICATION = "modification",
	REMOVAL = "removal",
}

/**
 * Impact levels of schema changes
 */
export enum SchemaChangeImpact {
	SAFE = "safe", // Can be applied automatically
	WARNING = "warning", // Requires attention but generally safe
	BREAKING = "breaking", // Potentially dangerous, requires manual review
}

/**
 * Types of schema changes
 */
export type SchemaChangeType =
	// Enum changes
	| "enum_added"
	| "enum_removed"
	| "enum_modified"
	| "enum_value_added"
	| "enum_value_removed"
	// Helper changes
	| "helper_added"
	| "helper_removed"
	| "helper_modified"
	| "helper_column_added"
	| "helper_column_removed"
	| "helper_column_modified"
	// Table changes
	| "table_added"
	| "table_removed"
	| "table_modified"
	| "table_column_added"
	| "table_column_removed"
	| "table_column_modified"
	| "table_helper_reference_added"
	| "table_helper_reference_removed"
	| "table_composite_primary_key_changed"
	// Column changes
	| "column_type_changed"
	| "column_primary_key_changed"
	| "column_not_null_changed"
	| "column_default_changed"
	| "column_references_changed";

/**
 * Interface for schema change detection
 */
export interface SchemaChange {
	type: SchemaChangeType;
	category: SchemaChangeCategory;
	impact: SchemaChangeImpact;
	description: string;
	target: {
		type: "enum" | "helper" | "table";
		name: string;
		column?: string;
	};
	details?: any;
}

/**
 * Interface for schema update results
 */
export interface SchemaUpdateResult {
	applied: SchemaChange[];
	rejected: SchemaChange[];
	metadata: {
		totalChanges: number;
		appliedCount: number;
		rejectedCount: number;
		dryRun: boolean;
	};
}

/**
 * Interface for schema comparison
 */
export interface SchemaComparison {
	changes: SchemaChange[];
	summary: {
		totalChanges: number;
		byCategory: Record<SchemaChangeCategory, number>;
		byImpact: Record<SchemaChangeImpact, number>;
		byType: Record<string, number>;
	};
	recommendations: string[];
	canApply: {
		safe: boolean;
		withWarnings: boolean;
		withBreaking: boolean;
	};
}
