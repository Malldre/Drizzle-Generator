import { describe, it, expect } from "vitest";
import { PascalCase } from "../../src/utils/PascalCase.js";

describe("PascalCase", () => {
	it("should convert empty string to empty string", () => {
		expect(PascalCase("")).toBe("");
	});

	it("should convert snake_case to PascalCase", () => {
		expect(PascalCase("user_name")).toBe("UserName");
		expect(PascalCase("first_name")).toBe("FirstName");
		expect(PascalCase("user_profile_data")).toBe("UserProfileData");
	});

	it("should convert kebab-case to PascalCase", () => {
		expect(PascalCase("user-name")).toBe("UserName");
		expect(PascalCase("first-name")).toBe("FirstName");
		expect(PascalCase("user-profile-data")).toBe("UserProfileData");
	});

	it("should handle mixed separators", () => {
		expect(PascalCase("user_name-data")).toBe("UserNameData");
		expect(PascalCase("first-name_last")).toBe("FirstNameLast");
	});

	it("should handle single words", () => {
		expect(PascalCase("user")).toBe("User");
		expect(PascalCase("data")).toBe("Data");
	});

	it("should handle words with spaces", () => {
		expect(PascalCase("user name")).toBe("User Name");
		expect(PascalCase("first name")).toBe("First Name");
	});

	it("should handle already PascalCase strings", () => {
		expect(PascalCase("UserName")).toBe("Username");
		expect(PascalCase("FirstName")).toBe("Firstname");
	});

	it("should handle numbers", () => {
		expect(PascalCase("user_1_name")).toBe("User1Name");
		expect(PascalCase("api-2-response")).toBe("Api2Response");
	});

	it("should handle special cases", () => {
		expect(PascalCase("a")).toBe("A");
		expect(PascalCase("a_b")).toBe("AB");
		expect(PascalCase("a-b-c")).toBe("ABC");
	});
});
