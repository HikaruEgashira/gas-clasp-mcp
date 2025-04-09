import { assertEquals, assertRejects } from "jsr:@std/assert";
import { claspLogout } from "../tools/clasp_logout.ts";
import { CommandExecutionError, PathValidationError } from "../tools/error.ts";

function createMockRunCommand(options: { output?: string; error?: Error }) {
    return () => {
        if (options.error) throw options.error;
        return Promise.resolve(options.output ?? "");
    };
}

Deno.test("claspLogout returns success message on empty output", async () => {
    const mockRunCommand = createMockRunCommand({});
    const result = await claspLogout({ rootDir: "." }, mockRunCommand);
    assertEquals(result, "Logged out successfully.");
});

Deno.test("claspLogout returns output string if not empty", async () => {
    const mockRunCommand = createMockRunCommand({ output: "Logout done" });
    const result = await claspLogout({ rootDir: "." }, mockRunCommand);
    assertEquals(result, "Logout done");
});

Deno.test("claspLogout throws PathValidationError for invalid rootDir", async () => {
    await assertRejects(
        () => claspLogout({ rootDir: "./nonexistent_dir" }),
        PathValidationError,
    );
});

Deno.test("claspLogout throws CommandExecutionError on clasp failure", async () => {
    const mockRunCommand = createMockRunCommand({
        error: new CommandExecutionError(1, "error", "", "clasp logout"),
    });
    await assertRejects(
        () => claspLogout({ rootDir: "." }, mockRunCommand),
        CommandExecutionError,
    );
});
