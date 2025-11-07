#!/usr/bin/env -S deno run --allow-read --allow-write --allow-run --allow-env

import { sh } from "@raiment-shell";
import { basename, dirname, relative } from "@std/path";

const SCRIPTS = sh.template("$REPO_ROOT/source/assets/build");

type AssetTask = {
    sourceImage: string;
    sourceMeta: string;
    outputImage: string;
    outputMeta: string;
};

async function convertAsepriteImages(outputDir: string, sourceDir: string): Promise<void> {
    sh.cprintln("#555", `Building sprites from ${relative(".", sourceDir)} to ${outputDir}...`);
    await sh.mkdir(outputDir);
    const files = await sh.glob(`${sourceDir}/*.aseprite`);
    const tasks: AssetTask[] = files.map((file: string) => {
        const baseName = basename(file, ".aseprite");
        return {
            sourceImage: file,
            sourceMeta: `${dirname(file)}/attribution.meta.md`,
            outputImage: `${outputDir}/${baseName}.png`,
            outputMeta: `${outputDir}/${baseName}.meta.md`,
        };
    });

    for (const task of tasks) {
        const script = `${SCRIPTS}/aseprite_to_png.ts`;
        await sh.exec(script, ["-i", task.sourceImage, "-o", task.outputImage]);
        await Deno.copyFile(task.sourceMeta, task.outputMeta);
        sh.cprintln(
            `[:check:](green) built sprite [${relative(".", task.outputImage)}](goldenrod)`,
        );
    }
}

async function main(): Promise<void> {
    await convertAsepriteImages("./base/sprites", sh.template("$REPO_ROOT/source/content/sprites"));
    await convertAsepriteImages(
        "./base/textures",
        sh.template("$REPO_ROOT/source/content/textures"),
    );
}

main();
