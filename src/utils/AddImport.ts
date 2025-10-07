/**
 * Interface for managing imports organized by import path
 */
export interface ImportMap {
    [importPath: string]: string[];
}

/**
 * Utility class for managing imports in a structured way
 */
export class ImportManager {
    private imports: ImportMap = {};

    /**
     * Add a single import to the import map
     * @param importPath - The path/library to import from (e.g., 'drizzle-orm/pg-core')
     * @param importName - The name of the item to import (e.g., 'serial')
     */
    addImport(importPath: string, importName: string): void {
        if (!this.imports[importPath]) {
            this.imports[importPath] = [];
        }
        if (!this.imports[importPath].includes(importName)) {
            this.imports[importPath].push(importName);
        }
    }

    /**
     * Add multiple imports from the same path
     * @param importPath - The path/library to import from
     * @param importNames - Array of names to import
     */
    addImports(importPath: string, importNames: string[]): void {
        importNames.forEach(name => this.addImport(importPath, name));
    }

    /**
     * Merge imports from another ImportManager or ImportMap
     * @param otherImports - Another ImportManager instance or ImportMap object
     */
    merge(otherImports: ImportManager | ImportMap): void {
        const importsToMerge = otherImports instanceof ImportManager 
            ? otherImports.getImports() 
            : otherImports;

        Object.entries(importsToMerge).forEach(([path, names]) => {
            this.addImports(path, names);
        });
    }

    /**
     * Get the current imports map
     * @returns The imports object
     */
    getImports(): ImportMap {
        return { ...this.imports };
    }

    /**
     * Clear all imports
     */
    clear(): void {
        this.imports = {};
    }

    /**
     * Check if a specific import exists
     * @param importPath - The import path to check
     * @param importName - The import name to check (optional)
     * @returns True if the import exists
     */
    hasImport(importPath: string, importName?: string): boolean {
        if (!this.imports[importPath]) return false;
        if (!importName) return true;
        return this.imports[importPath].includes(importName);
    }

    /**
     * Generate import statements as strings
     * @returns Array of import statement strings
     */
    generateImportStatements(): string[] {
        return Object.entries(this.imports)
            .filter(([_, names]) => names.length > 0)
            .map(([path, names]) => {
                const uniqueNames = [...new Set(names)].sort();
                return `import { ${uniqueNames.join(', ')} } from '${path}';`;
            });
    }

    /**
     * Get imports as a formatted string
     * @returns Formatted import statements joined by newlines
     */
    toString(): string {
        return this.generateImportStatements().join('\n');
    }
}

/**
 * Helper function to add imports to an existing ImportMap
 * @param imports - The existing imports object
 * @param importPath - The path to import from
 * @param importName - The name to import
 */
export function addImportToMap(imports: ImportMap, importPath: string, importName: string): void {
    if (!imports[importPath]) {
        imports[importPath] = [];
    }
    if (!imports[importPath].includes(importName)) {
        imports[importPath].push(importName);
    }
}

/**
 * Helper function to merge two ImportMaps
 * @param target - The target ImportMap to merge into
 * @param source - The source ImportMap to merge from
 */
export function mergeImportMaps(target: ImportMap, source: ImportMap): void {
    Object.entries(source).forEach(([path, names]) => {
        names.forEach(name => addImportToMap(target, path, name));
    });
}