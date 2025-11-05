#!/usr/bin/env -S deno run --allow-read --allow-write --allow-run --allow-env
import { sh } from "@raiment-shell";

const SRC_DIR = sh.template("$REPO_ROOT/source/content/sprites-matthewsmith");
const DST_DIR = "./base/sprites";
const ATTR_FILE = `${SRC_DIR}/attribution.meta.md`;

const files = Object.fromEntries((await sh.glob(`${SRC_DIR}/*.png`)).map((path: string) => {
    const name = path.split("/").pop()!.replace(".png", "");
    return [name, `${name}.png`];
}));

async function copyFiles(dstDir: string, files: Record<string, string>) {
    sh.cprintln(`Building files for ${dstDir}...`);
    sh.mkdir(dstDir);
    for (const [name, file] of Object.entries(files)) {
        const sourcePath = `${SRC_DIR}/${file}`;
        const outputPath = `${dstDir}/${name}.png`;
        const metaOutputPath = `${dstDir}/${name}.meta.md`;
        await sh.copy(sourcePath, outputPath);
        await sh.copy(ATTR_FILE, metaOutputPath);
        sh.cprintln(
            `[:check:](green) built [${name}.png](goldenrod)`,
        );
    }
}
await copyFiles(DST_DIR, files);
