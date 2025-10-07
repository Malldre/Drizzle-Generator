/**
 * Converts a string from camelCase/PascalCase to snake_case.
 */
export function SnakeCase(str: string): string {
	if (!str) return "";

	return str.replace(/([A-Z])/g, (match, p1, offset) => {
		return (offset > 0 ? "_" : "") + p1.toLowerCase();
	});
}
