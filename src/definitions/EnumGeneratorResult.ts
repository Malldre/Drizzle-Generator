/**
 * Interface for the return object of EnumGenerator
 */
export interface EnumGeneratorResult {
	enumCode: string;
	imports: { [importPath: string]: string[] };
	error?: string;
}