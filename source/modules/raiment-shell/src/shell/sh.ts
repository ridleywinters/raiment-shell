import { cprintln } from "./cprintln.ts";
import { exec } from "./exec.ts";
import { expandEnvVars } from "./expand_env_vars.ts";
import { glob } from "./glob.ts";
import { mkdir } from "./mkdir.ts";
import { template } from "./template.ts";

async function copy(source: string, destination: string): Promise<void> {
    return await Deno.copyFile(source, destination);
}

export const sh = {
    // String utilities
    expandEnvVars,

    template,

    // Console
    cprintln,

    // Commands
    exec,

    // Filesystem
    mkdir,
    glob,
    copy,
};
