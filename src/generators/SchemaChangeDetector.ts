import { promises as fs } from "fs";
import { join } from "path";
import { ProjectGeneratorConfig } from "../definitions/index.js";
import { SchemaChange, SchemaChangeCategory, SchemaChangeImpact, SchemaComparison, SchemaUpdateResult } from "../definitions/SchemaReaderResult.js";

/**
 * Intelligent schema change detector and validator
 */
export class SchemaChangeDetector {
	/**
	 * Compare two schemas and detect changes
	 */
	async compareSchemas(currentSchema: ProjectGeneratorConfig, newSchema: ProjectGeneratorConfig): Promise<SchemaComparison> {
		const changes: SchemaChange[] = [];

		// Compare enums
		const enumChanges = this.compareEnums(currentSchema.enums || [], newSchema.enums || []);
		changes.push(...enumChanges);

		// Compare helpers
		const helperChanges = this.compareHelpers(currentSchema.helpers || [], newSchema.helpers || []);
		changes.push(...helperChanges);

		// Compare tables
		const tableChanges = this.compareTables(currentSchema.tables || [], newSchema.tables || []);
		changes.push(...tableChanges);

		// Generate summary
		const summary = this.generateSummary(changes);

		// Generate recommendations
		const recommendations = this.generateRecommendations(changes);

		// Determine what can be applied
		const canApply = {
			safe: changes.some((c) => c.impact === SchemaChangeImpact.SAFE),
			withWarnings: changes.some((c) => c.impact === SchemaChangeImpact.WARNING),
			withBreaking: changes.some((c) => c.impact === SchemaChangeImpact.BREAKING),
		};

		return {
			changes,
			summary,
			recommendations,
			canApply,
		};
	}

	/**
	 * Apply safe changes to a schema
	 */
	async applySafeChanges(
		projectPath: string,
		comparison: SchemaComparison,
		options: {
			allowBreaking?: boolean;
			allowWarning?: boolean;
			dryRun?: boolean;
		} = {}
	): Promise<SchemaUpdateResult> {
		const { allowBreaking = false, allowWarning = true, dryRun = false } = options;

		const applied: SchemaChange[] = [];
		const rejected: SchemaChange[] = [];

		for (const change of comparison.changes) {
			const shouldApply = this.shouldApplyChange(change, allowBreaking, allowWarning);

			if (shouldApply) {
				applied.push(change);
			} else {
				rejected.push(change);
			}
		}

		// If not dry run, actually apply changes
		if (!dryRun && applied.length > 0) {
			await this.applyChangesToFiles(projectPath, applied);
		}

		return {
			applied,
			rejected,
			metadata: {
				totalChanges: comparison.changes.length,
				appliedCount: applied.length,
				rejectedCount: rejected.length,
				dryRun,
			},
		};
	}

	/**
	 * Compare enum definitions
	 */
	private compareEnums(currentEnums: any[], newEnums: any[]): SchemaChange[] {
		const changes: SchemaChange[] = [];

		// Track enum names for comparison
		const currentEnumNames = new Set(currentEnums.map((e) => e.name));
		const newEnumNames = new Set(newEnums.map((e) => e.name));

		// Find added enums
		for (const newEnum of newEnums) {
			if (!currentEnumNames.has(newEnum.name)) {
				changes.push({
					type: "enum_added",
					category: SchemaChangeCategory.ADDITION,
					impact: SchemaChangeImpact.SAFE,
					description: `Added enum '${newEnum.name}' with values: ${newEnum.values.join(", ")}`,
					target: {
						type: "enum",
						name: newEnum.name,
					},
					details: {
						values: newEnum.values,
					},
				});
			}
		}

		// Find removed enums
		for (const currentEnum of currentEnums) {
			if (!newEnumNames.has(currentEnum.name)) {
				changes.push({
					type: "enum_removed",
					category: SchemaChangeCategory.REMOVAL,
					impact: SchemaChangeImpact.BREAKING,
					description: `Removed enum '${currentEnum.name}'`,
					target: {
						type: "enum",
						name: currentEnum.name,
					},
				});
			}
		}

		// Find modified enums
		for (const newEnum of newEnums) {
			const currentEnum = currentEnums.find((e) => e.name === newEnum.name);
			if (currentEnum) {
				const enumChanges = this.compareEnumValues(currentEnum, newEnum);
				changes.push(...enumChanges);
			}
		}

		return changes;
	}

	/**
	 * Compare enum values
	 */
	private compareEnumValues(currentEnum: any, newEnum: any): SchemaChange[] {
		const changes: SchemaChange[] = [];

		const currentValues = new Set(currentEnum.values);
		const newValues = new Set(newEnum.values);

		// Check for added values
		for (const value of newEnum.values) {
			if (!currentValues.has(value)) {
				changes.push({
					type: "enum_value_added",
					category: SchemaChangeCategory.ADDITION,
					impact: SchemaChangeImpact.SAFE,
					description: `Added value '${value}' to enum '${newEnum.name}'`,
					target: {
						type: "enum",
						name: newEnum.name,
					},
					details: {
						value,
					},
				});
			}
		}

		// Check for removed values
		for (const value of currentEnum.values) {
			if (!newValues.has(value)) {
				changes.push({
					type: "enum_value_removed",
					category: SchemaChangeCategory.REMOVAL,
					impact: SchemaChangeImpact.BREAKING,
					description: `Removed value '${value}' from enum '${newEnum.name}'`,
					target: {
						type: "enum",
						name: newEnum.name,
					},
					details: {
						value,
					},
				});
			}
		}

		return changes;
	}

	/**
	 * Compare helper definitions
	 */
	private compareHelpers(currentHelpers: any[], newHelpers: any[]): SchemaChange[] {
		const changes: SchemaChange[] = [];

		const currentHelperNames = new Set(currentHelpers.map((h) => h.name));
		const newHelperNames = new Set(newHelpers.map((h) => h.name));

		// Find added helpers
		for (const newHelper of newHelpers) {
			if (!currentHelperNames.has(newHelper.name)) {
				changes.push({
					type: "helper_added",
					category: SchemaChangeCategory.ADDITION,
					impact: SchemaChangeImpact.SAFE,
					description: `Added helper '${newHelper.name}' with ${newHelper.columns.length} columns`,
					target: {
						type: "helper",
						name: newHelper.name,
					},
				});
			}
		}

		// Find removed helpers
		for (const currentHelper of currentHelpers) {
			if (!newHelperNames.has(currentHelper.name)) {
				changes.push({
					type: "helper_removed",
					category: SchemaChangeCategory.REMOVAL,
					impact: SchemaChangeImpact.WARNING, // Could break tables using this helper
					description: `Removed helper '${currentHelper.name}'`,
					target: {
						type: "helper",
						name: currentHelper.name,
					},
				});
			}
		}

		// Find modified helpers
		for (const newHelper of newHelpers) {
			const currentHelper = currentHelpers.find((h) => h.name === newHelper.name);
			if (currentHelper) {
				const helperChanges = this.compareHelperColumns(currentHelper, newHelper);
				changes.push(...helperChanges);
			}
		}

		return changes;
	}

	/**
	 * Compare helper columns
	 */
	private compareHelperColumns(currentHelper: any, newHelper: any): SchemaChange[] {
		const changes: SchemaChange[] = [];

		const currentColumns = new Map(currentHelper.columns.map((c: any) => [c.name, c]));
		const newColumns = new Map(newHelper.columns.map((c: any) => [c.name, c]));

		// Check for added columns
		for (const [name, column] of newColumns) {
			if (!currentColumns.has(name)) {
				changes.push({
					type: "helper_column_added",
					category: SchemaChangeCategory.ADDITION,
					impact: SchemaChangeImpact.SAFE,
					description: `Added column '${name}' to helper '${newHelper.name}'`,
					target: {
						type: "helper",
						name: newHelper.name,
						column: String(name),
					},
				});
			}
		}

		// Check for removed columns
		for (const [name, column] of currentColumns) {
			if (!newColumns.has(name)) {
				changes.push({
					type: "helper_column_removed",
					category: SchemaChangeCategory.REMOVAL,
					impact: SchemaChangeImpact.WARNING,
					description: `Removed column '${name}' from helper '${newHelper.name}'`,
					target: {
						type: "helper",
						name: newHelper.name,
						column: String(name),
					},
				});
			}
		}

		// Check for modified columns
		for (const [name, newColumn] of newColumns) {
			const currentColumn = currentColumns.get(name);
			if (currentColumn) {
				const columnChanges = this.compareColumnDefinitions(currentColumn, newColumn, "helper", newHelper.name);
				changes.push(...columnChanges);
			}
		}

		return changes;
	}

	/**
	 * Compare table definitions
	 */
	private compareTables(currentTables: any[], newTables: any[]): SchemaChange[] {
		const changes: SchemaChange[] = [];

		const currentTableNames = new Set(currentTables.map((t) => t.name));
		const newTableNames = new Set(newTables.map((t) => t.name));

		// Find added tables
		for (const newTable of newTables) {
			if (!currentTableNames.has(newTable.name)) {
				changes.push({
					type: "table_added",
					category: SchemaChangeCategory.ADDITION,
					impact: SchemaChangeImpact.SAFE,
					description: `Added table '${newTable.name}' with ${newTable.columns?.length || 0} columns`,
					target: {
						type: "table",
						name: newTable.name,
					},
				});
			}
		}

		// Find removed tables
		for (const currentTable of currentTables) {
			if (!newTableNames.has(currentTable.name)) {
				changes.push({
					type: "table_removed",
					category: SchemaChangeCategory.REMOVAL,
					impact: SchemaChangeImpact.BREAKING,
					description: `Removed table '${currentTable.name}'`,
					target: {
						type: "table",
						name: currentTable.name,
					},
				});
			}
		}

		// Find modified tables
		for (const newTable of newTables) {
			const currentTable = currentTables.find((t) => t.name === newTable.name);
			if (currentTable) {
				const tableChanges = this.compareTableStructure(currentTable, newTable);
				changes.push(...tableChanges);
			}
		}

		return changes;
	}

	/**
	 * Compare table structure
	 */
	private compareTableStructure(currentTable: any, newTable: any): SchemaChange[] {
		const changes: SchemaChange[] = [];

		// Compare columns
		if (currentTable.columns && newTable.columns) {
			const columnChanges = this.compareTableColumns(currentTable, newTable);
			changes.push(...columnChanges);
		}

		// Compare helper references
		const helperChanges = this.compareHelperReferences(currentTable, newTable);
		changes.push(...helperChanges);

		// Compare composite primary keys
		const pkChanges = this.compareCompositePrimaryKeys(currentTable, newTable);
		changes.push(...pkChanges);

		return changes;
	}

	/**
	 * Compare table columns
	 */
	private compareTableColumns(currentTable: any, newTable: any): SchemaChange[] {
		const changes: SchemaChange[] = [];

		const currentColumns = new Map(currentTable.columns.map((c: any) => [c.name, c]));
		const newColumns = new Map(newTable.columns.map((c: any) => [c.name, c]));

		// Check for added columns
		for (const [name, column] of newColumns) {
			if (!currentColumns.has(name)) {
				const col = column as any;
				const impact = col.options?.notNull ? SchemaChangeImpact.WARNING : SchemaChangeImpact.SAFE;
				changes.push({
					type: "table_column_added",
					category: SchemaChangeCategory.ADDITION,
					impact,
					description: `Added column '${name}' to table '${newTable.name}'${col.options?.notNull ? " (NOT NULL - requires default or data migration)" : ""}`,
					target: {
						type: "table",
						name: newTable.name,
						column: String(name),
					},
				});
			}
		}

		// Check for removed columns
		for (const [name, column] of currentColumns) {
			if (!newColumns.has(name)) {
				changes.push({
					type: "table_column_removed",
					category: SchemaChangeCategory.REMOVAL,
					impact: SchemaChangeImpact.BREAKING,
					description: `Removed column '${name}' from table '${newTable.name}'`,
					target: {
						type: "table",
						name: newTable.name,
						column: String(name),
					},
				});
			}
		}

		// Check for modified columns
		for (const [name, newColumn] of newColumns) {
			const currentColumn = currentColumns.get(name);
			if (currentColumn) {
				const columnChanges = this.compareColumnDefinitions(currentColumn, newColumn, "table", newTable.name);
				changes.push(...columnChanges);
			}
		}

		return changes;
	}

	/**
	 * Compare column definitions
	 */
	private compareColumnDefinitions(currentColumn: any, newColumn: any, targetType: string, targetName: string): SchemaChange[] {
		const changes: SchemaChange[] = [];

		// Type change
		if (currentColumn.type !== newColumn.type) {
			changes.push({
				type: "column_type_changed",
				category: SchemaChangeCategory.MODIFICATION,
				impact: SchemaChangeImpact.BREAKING,
				description: `Changed column '${newColumn.name}' type from '${currentColumn.type}' to '${newColumn.type}' in ${targetType} '${targetName}'`,
				target: {
					type: targetType as any,
					name: targetName,
					column: newColumn.name,
				},
				details: {
					from: currentColumn.type,
					to: newColumn.type,
				},
			});
		}

		// Options changes
		const currentOptions = currentColumn.options || {};
		const newOptions = newColumn.options || {};

		// Primary key change
		if (currentOptions.primaryKey !== newOptions.primaryKey) {
			changes.push({
				type: "column_primary_key_changed",
				category: SchemaChangeCategory.MODIFICATION,
				impact: SchemaChangeImpact.BREAKING,
				description: `${newOptions.primaryKey ? "Added" : "Removed"} primary key on column '${newColumn.name}' in ${targetType} '${targetName}'`,
				target: {
					type: targetType as any,
					name: targetName,
					column: newColumn.name,
				},
			});
		}

		// Not null change
		if (currentOptions.notNull !== newOptions.notNull) {
			const impact = newOptions.notNull ? SchemaChangeImpact.WARNING : SchemaChangeImpact.SAFE;
			changes.push({
				type: "column_not_null_changed",
				category: SchemaChangeCategory.MODIFICATION,
				impact,
				description: `${newOptions.notNull ? "Added NOT NULL constraint" : "Removed NOT NULL constraint"} on column '${newColumn.name}' in ${targetType} '${targetName}'`,
				target: {
					type: targetType as any,
					name: targetName,
					column: newColumn.name,
				},
			});
		}

		// Default value change
		if (JSON.stringify(currentOptions.default) !== JSON.stringify(newOptions.default)) {
			changes.push({
				type: "column_default_changed",
				category: SchemaChangeCategory.MODIFICATION,
				impact: SchemaChangeImpact.SAFE,
				description: `Changed default value for column '${newColumn.name}' in ${targetType} '${targetName}'`,
				target: {
					type: targetType as any,
					name: targetName,
					column: newColumn.name,
				},
				details: {
					from: currentOptions.default,
					to: newOptions.default,
				},
			});
		}

		return changes;
	}

	/**
	 * Compare helper references
	 */
	private compareHelperReferences(currentTable: any, newTable: any): SchemaChange[] {
		const changes: SchemaChange[] = [];

		const currentRefs = new Set(currentTable.helperReferences || []);
		const newRefs = new Set(newTable.helperReferences || []);

		// Added references
		for (const ref of newRefs) {
			if (!currentRefs.has(ref)) {
				changes.push({
					type: "table_helper_reference_added",
					category: SchemaChangeCategory.ADDITION,
					impact: SchemaChangeImpact.SAFE,
					description: `Added helper reference '${ref}' to table '${newTable.name}'`,
					target: {
						type: "table",
						name: newTable.name,
					},
					details: {
						helperReference: ref,
					},
				});
			}
		}

		// Removed references
		for (const ref of currentRefs) {
			if (!newRefs.has(ref)) {
				changes.push({
					type: "table_helper_reference_removed",
					category: SchemaChangeCategory.REMOVAL,
					impact: SchemaChangeImpact.WARNING,
					description: `Removed helper reference '${ref}' from table '${newTable.name}'`,
					target: {
						type: "table",
						name: newTable.name,
					},
					details: {
						helperReference: ref,
					},
				});
			}
		}

		return changes;
	}

	/**
	 * Compare composite primary keys
	 */
	private compareCompositePrimaryKeys(currentTable: any, newTable: any): SchemaChange[] {
		const changes: SchemaChange[] = [];

		const currentPK = new Set(currentTable.compositePrimaryKey || []);
		const newPK = new Set(newTable.compositePrimaryKey || []);

		if (currentPK.size !== newPK.size || [...currentPK].some((col) => !newPK.has(col))) {
			changes.push({
				type: "table_composite_primary_key_changed",
				category: SchemaChangeCategory.MODIFICATION,
				impact: SchemaChangeImpact.BREAKING,
				description: `Changed composite primary key for table '${newTable.name}'`,
				target: {
					type: "table",
					name: newTable.name,
				},
				details: {
					from: [...currentPK],
					to: [...newPK],
				},
			});
		}

		return changes;
	}

	/**
	 * Generate summary of changes
	 */
	private generateSummary(changes: SchemaChange[]): any {
		const summary = {
			totalChanges: changes.length,
			byCategory: {} as any,
			byImpact: {} as any,
			byType: {} as any,
		};

		// Count by category
		for (const category of Object.values(SchemaChangeCategory)) {
			summary.byCategory[category] = changes.filter((c) => c.category === category).length;
		}

		// Count by impact
		for (const impact of Object.values(SchemaChangeImpact)) {
			summary.byImpact[impact] = changes.filter((c) => c.impact === impact).length;
		}

		// Count by type
		for (const change of changes) {
			summary.byType[change.type] = (summary.byType[change.type] || 0) + 1;
		}

		return summary;
	}

	/**
	 * Generate recommendations
	 */
	private generateRecommendations(changes: SchemaChange[]): string[] {
		const recommendations: string[] = [];

		const breakingChanges = changes.filter((c) => c.impact === SchemaChangeImpact.BREAKING);
		const warningChanges = changes.filter((c) => c.impact === SchemaChangeImpact.WARNING);

		if (breakingChanges.length > 0) {
			recommendations.push(`⚠️  ${breakingChanges.length} breaking changes detected. Consider creating a migration plan.`);

			const tableRemovals = breakingChanges.filter((c) => c.type === "table_removed");
			if (tableRemovals.length > 0) {
				recommendations.push("📋 Back up data for removed tables before applying changes.");
			}

			const columnRemovals = breakingChanges.filter((c) => c.type.includes("column_removed"));
			if (columnRemovals.length > 0) {
				recommendations.push("🔄 Plan data migration for removed columns.");
			}
		}

		if (warningChanges.length > 0) {
			recommendations.push(`⚡ ${warningChanges.length} changes require attention. Review before applying.`);

			const notNullAdditions = warningChanges.filter((c) => c.description.includes("NOT NULL"));
			if (notNullAdditions.length > 0) {
				recommendations.push("🔧 Add default values or populate data for new NOT NULL columns.");
			}
		}

		const safeChanges = changes.filter((c) => c.impact === SchemaChangeImpact.SAFE);
		if (safeChanges.length > 0) {
			recommendations.push(`✅ ${safeChanges.length} safe changes can be applied automatically.`);
		}

		if (changes.length === 0) {
			recommendations.push("🎉 No changes detected. Schemas are identical.");
		}

		return recommendations;
	}

	/**
	 * Determine if a change should be applied
	 */
	private shouldApplyChange(change: SchemaChange, allowBreaking: boolean, allowWarning: boolean): boolean {
		switch (change.impact) {
			case SchemaChangeImpact.SAFE:
				return true;
			case SchemaChangeImpact.WARNING:
				return allowWarning;
			case SchemaChangeImpact.BREAKING:
				return allowBreaking;
			default:
				return false;
		}
	}

	/**
	 * Apply changes to actual files (placeholder for now)
	 */
	private async applyChangesToFiles(projectPath: string, changes: SchemaChange[]): Promise<void> {
		// This would implement the actual file modification logic
		// For now, this is a placeholder that would integrate with ProjectGenerator
		console.log(`Would apply ${changes.length} changes to ${projectPath}`);

		// TODO: Implement actual file modification logic
		// This could work by:
		// 1. Reading current schema using SchemaReader
		// 2. Applying changes to the schema object
		// 3. Regenerating files using ProjectGenerator
	}
}
