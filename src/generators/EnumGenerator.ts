import { type EnumDefinition, EnumGeneratorResult } from "../definitions/index.js";
import { SnakeCase, PascalCase } from "../utils/index.js";

/**
 * Converts an Enum definition to Drizzle pgEnum code.
 */
export function EnumGenerator(definition: EnumDefinition): EnumGeneratorResult {
	const { name, values } = definition;

	const result: EnumGeneratorResult = {
		enumCode: "",
		imports: {},
	};

	if (!name || values.length === 0) {
		result.error = "Enum name and values are mandatory.";
		return result;
	}

	result.imports["drizzle-orm/pg-core"] = ["pgEnum"];

	const formattedValues = values.map((v) => `'${PascalCase(v)}'`).join(", ");

	result.enumCode = `export const ${name} = pgEnum('${SnakeCase(name)}', [${formattedValues}] as const);`;

	return result;
}
