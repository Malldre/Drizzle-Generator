/**
 * Converts a string to PascalCase.
 */
export function PascalCase(value: string): string {
	return value
		.split(/[_-]+/)
		.map((word) =>
			word
				.split(" ")
				.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
				.join(" ")
		)
		.join("");
}
