import { describe, it, expect } from "vitest";
import { SnakeCase } from "../../src/utils/SnakeCase.js";

describe("SnakeCase", () => {
	it("should convert empty string to empty string", () => {
		expect(SnakeCase("")).toBe("");
	});

	it("should convert PascalCase to snake_case", () => {
		expect(SnakeCase("UserName")).toBe("user_name");
		expect(SnakeCase("FirstName")).toBe("first_name");
		expect(SnakeCase("UserProfileData")).toBe("user_profile_data");
	});

	it("should convert camelCase to snake_case", () => {
		expect(SnakeCase("userName")).toBe("user_name");
		expect(SnakeCase("firstName")).toBe("first_name");
		expect(SnakeCase("userProfileData")).toBe("user_profile_data");
	});

	it("should handle single words", () => {
		expect(SnakeCase("user")).toBe("user");
		expect(SnakeCase("User")).toBe("user");
		expect(SnakeCase("DATA")).toBe("d_a_t_a");
	});

	it("should handle consecutive uppercase letters", () => {
		expect(SnakeCase("XMLParser")).toBe("x_m_l_parser");
		expect(SnakeCase("HTMLElement")).toBe("h_t_m_l_element");
	});

	it("should handle numbers in the string", () => {
		expect(SnakeCase("User1Name")).toBe("user1_name");
		expect(SnakeCase("API2Response")).toBe("a_p_i2_response");
	});

	it("should handle special cases", () => {
		expect(SnakeCase("A")).toBe("a");
		expect(SnakeCase("AB")).toBe("a_b");
		expect(SnakeCase("ABC")).toBe("a_b_c");
	});
});
