/**
 * Interface for generation results
 */
export interface ProjectGeneratorResult {
    success: boolean;
    message: string;
    errors?: string[];
    generatedFiles: string[];
    structure: {
        enumsDir: string;
        helpersDir: string;
        tablesDir: string;
        files: {
            enums: string[];
            helpers: string[];
            tables: string[];
            indexes: string[];
        };
    };
}