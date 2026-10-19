const NODE_24_ACTIONS = ["actions/checkout", "actions/setup-node"];

Deno.test("CI runner actions use Node.js 24 runtime versions", async () => {
    const workflow = await Deno.readTextFile(
        new URL("../.github/workflows/ci.yml", import.meta.url),
    );
    const refs = [...workflow.matchAll(/^\s*-?\s*uses:\s*(\S+)/gm)].map((match) => match[1]);

    for (const action of NODE_24_ACTIONS) {
        const ref = refs.find((value) => value.startsWith(`${action}@`));
        if (!ref) {
            throw new Error(`CI does not use ${action}`);
        }
        const version = ref.slice(action.length + 1);
        const major = Number(version.replace(/^v/, ""));
        if (!Number.isInteger(major) || major < 5) {
            throw new Error(`${action}@${version} targets Node.js 20; use v5 or newer`);
        }
    }
});
