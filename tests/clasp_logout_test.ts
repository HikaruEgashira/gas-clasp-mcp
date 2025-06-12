import { assertEquals, assertRejects } from "jsr:@std/assert";
import { claspLogout } from "../tools/clasp_logout.ts";
import { CommandExecutionError } from "../tools/error.ts";
import { setRootDir } from "../tools/common.ts";

function createMockRunCommand(options: { output?: string; error?: Error }) {
  return () => {
    if (options.error) throw options.error;
    return Promise.resolve(options.output ?? "");
  };
}

Deno.test("claspLogout returns success message on empty output", async () => {
  await setRootDir("/tmp");
  const mockRunCommand = createMockRunCommand({});
  const result = await claspLogout({}, mockRunCommand);
  assertEquals(result, "Logged out successfully.");
});

Deno.test("claspLogout returns output string if not empty", async () => {
  await setRootDir("/tmp");
  const mockRunCommand = createMockRunCommand({ output: "Logout done" });
  const result = await claspLogout({}, mockRunCommand);
  assertEquals(result, "Logout done");
});

Deno.test("claspLogout throws PathValidationError for invalid rootDir", async () => {
  const mockRunCommand = createMockRunCommand({
    error: new Error("clasp not found"),
  });

  await assertRejects(
    () => claspLogout({}, mockRunCommand),
    Error,
  );
});

Deno.test("claspLogout throws CommandExecutionError on clasp failure", async () => {
  await setRootDir("/tmp");
  const mockRunCommand = createMockRunCommand({
    error: new CommandExecutionError(1, "error", "", "clasp logout"),
  });
  await assertRejects(
    () => claspLogout({}, mockRunCommand),
    CommandExecutionError,
  );
});
