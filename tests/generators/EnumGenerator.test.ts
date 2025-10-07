import { describe, it, expect } from "vitest";
import { EnumGenerator } from "../../src/generators/EnumGenerator.js";
import type { EnumDefinition } from "../../src/definitions/index.js";

describe("EnumGenerator", () => {
	it("should generate a simple enum", () => {
		const definition: EnumDefinition = {
			name: "UserStatus",
			values: ["active", "inactive", "pending"],
		};

		const result = EnumGenerator(definition);

		expect(result.error).toBeUndefined();
		expect(result.enumCode).toBe("export const UserStatus = pgEnum('user_status', ['Active', 'Inactive', 'Pending'] as const);");
		expect(result.imports).toEqual({
			"drizzle-orm/pg-core": ["pgEnum"],
		});
	});

	it("should handle enum with single value", () => {
		const definition: EnumDefinition = {
			name: "Color",
			values: ["red"],
		};

		const result = EnumGenerator(definition);

		expect(result.error).toBeUndefined();
		expect(result.enumCode).toBe("export const Color = pgEnum('color', ['Red'] as const);");
		expect(result.imports).toEqual({
			"drizzle-orm/pg-core": ["pgEnum"],
		});
	});

	it("should convert values to PascalCase", () => {
		const definition: EnumDefinition = {
			name: "TaskStatus",
			values: ["to_do", "in_progress", "done"],
		};

		const result = EnumGenerator(definition);

		expect(result.error).toBeUndefined();
		expect(result.enumCode).toBe("export const TaskStatus = pgEnum('task_status', ['ToDo', 'InProgress', 'Done'] as const);");
	});

	it("should convert enum name to snake_case for database name", () => {
		const definition: EnumDefinition = {
			name: "UserAccountType",
			values: ["admin", "user"],
		};

		const result = EnumGenerator(definition);

		expect(result.error).toBeUndefined();
		expect(result.enumCode).toBe("export const UserAccountType = pgEnum('user_account_type', ['Admin', 'User'] as const);");
	});

	it("should return error for empty name", () => {
		const definition: EnumDefinition = {
			name: "",
			values: ["active", "inactive"],
		};

		const result = EnumGenerator(definition);

		expect(result.error).toBe("Enum name and values are mandatory.");
		expect(result.enumCode).toBe("");
		expect(result.imports).toEqual({});
	});

	it("should return error for empty values", () => {
		const definition: EnumDefinition = {
			name: "UserStatus",
			values: [],
		};

		const result = EnumGenerator(definition);

		expect(result.error).toBe("Enum name and values are mandatory.");
		expect(result.enumCode).toBe("");
		expect(result.imports).toEqual({});
	});

	it("should handle complex enum values", () => {
		const definition: EnumDefinition = {
			name: "OrderStatus",
			values: ["pending_payment", "processing_order", "shipped_out", "delivered_successfully"],
		};

		const result = EnumGenerator(definition);

		expect(result.error).toBeUndefined();
		expect(result.enumCode).toBe("export const OrderStatus = pgEnum('order_status', ['PendingPayment', 'ProcessingOrder', 'ShippedOut', 'DeliveredSuccessfully'] as const);");
	});
});
