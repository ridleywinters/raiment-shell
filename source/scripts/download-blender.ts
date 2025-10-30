#!/usr/bin/env -S deno run --allow-net=download.blender.org --allow-write --allow-read --allow-run=hdiutil,cp
/**
 * Options:
 *   -n, --dry-run        Print detected latest version and URL; do not download
 *   -d, --dir DIR        Download directory (default: .)
 *       --print-url      Print only the final download URL
 *       --series X.Y     Pin to a specific major.minor series (e.g., 4.4)
 *   -h, --help           Show help
 *
 * Example:
 *   deno run --allow-net=download.blender.org --allow-write --allow-read --allow-run blender-latest.ts -n
 *   deno run --allow-net=download.blender.org --allow-write --allow-read --allow-run blender-latest.ts -d ./tools
 *   deno run --allow-net=download.blender.org --allow-write --allow-read --allow-run blender-latest.ts --series 4.4 --print-url
 */

const RELEASE_ROOT = "https://download.blender.org/release";

type Options = {
    dryRun: boolean;
    outDir: string;
    printUrl: boolean;
    pinSeries: string | null;
};

function usage(): string {
    return `\
blender-latest.ts [-n|--dry-run] [-d DIR|--dir DIR] [--print-url] [--series X.Y]
  -n, --dry-run     Print the detected latest version and URL but do not download
  -d, --dir DIR     Directory to download into (created if missing). Default: .
      --print-url   Print only the final download URL
      --series X.Y  Pin to a specific major.minor series (e.g., 4.4)
  -h, --help        Show this help
`;
}

function parseArgs(argv: string[]): Options {
    const opts: Options = {
        dryRun: false,
        outDir: ".",
        printUrl: false,
        pinSeries: null,
    };
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        switch (a) {
            case "-n":
            case "--dry-run":
                opts.dryRun = true;
                break;
            case "-d":
            case "--dir":
                if (i + 1 >= argv.length) {
                    throw new Error("Missing value for --dir");
                }
                opts.outDir = argv[++i];
                break;
            case "--print-url":
                opts.printUrl = true;
                break;
            case "--series":
                if (i + 1 >= argv.length) {
                    throw new Error("Missing value for --series");
                }
                opts.pinSeries = argv[++i];
                break;
            case "-h":
            case "--help":
                console.log(usage());
                Deno.exit(0);
            default:
                throw new Error(`Unknown option: ${a}`);
        }
    }
    return opts;
}

/** Platform mapping to Blender artifact tags and preferred extensions. */
function detectPlatform(): { tag: string; extensions: string[] } {
    const os = Deno.build.os; // "linux" | "darwin" | "windows"
    const arch = Deno.build.arch; // "x86_64" | "aarch64" | others

    if (os === "linux") {
        const tag = (arch === "aarch64") ? "linux-aarch64" : "linux-x64";
        return { tag, extensions: ["tar.xz"] };
    }
    if (os === "darwin") {
        const tag = (arch === "aarch64") ? "macos-arm64" : "macos-x64";
        return { tag, extensions: ["dmg", "zip"] };
    }
    if (os === "windows") {
        return { tag: "windows-x64", extensions: ["zip", "msi", "msix"] };
    }
    throw new Error(`Unsupported OS: ${os} ${arch}`);
}

/** Semantic version compare: returns negative/zero/positive like strcmp. */
function cmpSemver(a: string, b: string): number {
    const pa = a.split(".").map(Number);
    const pb = b.split(".").map(Number);
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
        const ai = pa[i] ?? 0, bi = pb[i] ?? 0;
        if (ai !== bi) return ai - bi;
    }
    return 0;
}

/** Fetch text with basic error handling. */
async function fetchText(url: string): Promise<string> {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`HTTP ${r.status} for ${url}`);
    return await r.text();
}

/** HEAD check for candidate artifact existence. */
async function urlExists(url: string): Promise<boolean> {
    const r = await fetch(url, { method: "HEAD" });
    return r.ok;
}

/** Find the latest available major.minor series (e.g., "4.5"). */
async function latestSeries(): Promise<string> {
    const html = await fetchText(`${RELEASE_ROOT}/`);
    // Matches "Blender4.5/" etc.
    const series = [...html.matchAll(/Blender(\d+\.\d+)\//g)].map((m) => m[1]);
    if (series.length === 0) {
        throw new Error("No series found in release index.");
    }
    series.sort((a, b) => cmpSemver(a, b));
    return series[series.length - 1];
}

/** Find latest X.Y.Z in a given series (X.Y). */
async function latestVersionInSeries(series: string): Promise<string> {
    const html = await fetchText(`${RELEASE_ROOT}/Blender${series}/`);
    // Matches file stems like "blender-4.5.2-"
    const versions = [...html.matchAll(/blender-((\d+\.\d+)\.\d+)-/g)]
        .map((m) => m[1])
        .filter((v) => v.startsWith(series + "."));
    if (versions.length === 0) {
        throw new Error(`No versions found for series ${series}.`);
    }
    versions.sort((a, b) => cmpSemver(a, b));
    return versions[versions.length - 1];
}

/** Resolve artifact URL for version and platform; try preferred extensions. */
async function resolveArtifactUrl(
    version: string,
    series: string,
    tag: string,
    exts: string[],
): Promise<string> {
    const base = `${RELEASE_ROOT}/Blender${series}/`;
    for (const ext of exts) {
        const candidate = `${base}blender-${version}-${tag}.${ext}`;
        if (await urlExists(candidate)) return candidate;
    }
    throw new Error(
        `No artifact found for ${version} (${tag}) with extensions [${
            exts.join(", ")
        }].`,
    );
}

/** Execute a shell command and return the result. */
async function execCommand(
    cmd: string[],
): Promise<{ success: boolean; stdout: string; stderr: string }> {
    const process = new Deno.Command(cmd[0], {
        args: cmd.slice(1),
        stdout: "piped",
        stderr: "piped",
    });

    const result = await process.output();
    const stdout = new TextDecoder().decode(result.stdout);
    const stderr = new TextDecoder().decode(result.stderr);

    return {
        success: result.code === 0,
        stdout,
        stderr,
    };
}

/** Expand a DMG file on macOS and copy Blender.app to the output directory. */
async function expandDmg(dmgPath: string, outDir: string): Promise<string> {
    console.log(`Expanding DMG: ${dmgPath}`);

    // Attach the DMG
    const attachResult = await execCommand(["hdiutil", "attach", dmgPath]);
    if (!attachResult.success) {
        throw new Error(`Failed to attach DMG: ${attachResult.stderr}`);
    }

    try {
        // Copy Blender.app to the output directory
        const blenderAppPath = `${outDir}/Blender.app`;
        const copyResult = await execCommand([
            "cp",
            "-R",
            "/Volumes/Blender/Blender.app",
            blenderAppPath,
        ]);

        if (!copyResult.success) {
            throw new Error(`Failed to copy Blender.app: ${copyResult.stderr}`);
        }

        console.log(`Blender.app copied to: ${blenderAppPath}`);

        // Create a bash wrapper script to run Blender
        const scriptPath = `${outDir}/blender`;
        const scriptContent = `#!/bin/bash
"${blenderAppPath}/Contents/MacOS/Blender" "$@"
`;
        await Deno.writeTextFile(scriptPath, scriptContent, { mode: 0o755 });
        console.log(`Created launcher script: ${scriptPath}`);

        return blenderAppPath;
    } finally {
        // Detach the DMG
        const detachResult = await execCommand([
            "hdiutil",
            "detach",
            "/Volumes/Blender",
        ]);
        if (!detachResult.success) {
            console.warn(
                `Warning: Failed to detach DMG: ${detachResult.stderr}`,
            );
        }
    }
}

/** Download file to outDir using streaming. */
async function downloadTo(url: string, outDir: string): Promise<string> {
    await Deno.mkdir(outDir, { recursive: true });
    const filename = url.split("/").pop()!;
    const outPath = outDir.endsWith("/")
        ? (outDir + filename)
        : `${outDir}/${filename}`;

    const r = await fetch(url);
    if (!r.ok || !r.body) {
        throw new Error(`Download failed: HTTP ${r.status} for ${url}`);
    }

    const file = await Deno.open(outPath, {
        write: true,
        create: true,
        truncate: true,
    });

    await r.body.pipeTo(file.writable);

    return outPath;
}

async function main() {
    try {
        const opts = parseArgs(Deno.args);
        const { tag, extensions } = detectPlatform();

        const series = opts.pinSeries ?? await latestSeries();
        const version = await latestVersionInSeries(series);
        const url = await resolveArtifactUrl(version, series, tag, extensions);

        if (opts.printUrl) {
            console.log(url);
            return;
        }

        console.log(`Latest Blender series: ${series}`);
        console.log(`Latest Blender version: ${version}`);
        console.log(`Platform: ${tag}`);
        console.log(`URL: ${url}`);

        if (opts.dryRun) {
            return;
        }

        const path = await downloadTo(url, opts.outDir);
        console.log(`Downloaded: ${path}`);

        // If on macOS and the downloaded file is a DMG, expand it
        if (Deno.build.os === "darwin" && path.endsWith(".dmg")) {
            const expandedPath = await expandDmg(path, opts.outDir);
            console.log(`Expanded DMG to: ${expandedPath}`);
        }
    } catch (err) {
        console.error(
            `Error: ${err instanceof Error ? err.message : String(err)}`,
        );
        console.error(usage());
        Deno.exit(1);
    }
}

if (import.meta.main) {
    await main();
}
