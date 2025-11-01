import * as core from "@raiment-core";
import { cprintln } from "@raiment-shell";
import { isSubdirectory } from "./is_subdirectory.ts";

type APIWriteFileOptions = {
    baseDir: string;
};

export type APIWriteFileRequest = {
    path: string;
    content: string;
    format: "text" | "yaml" | "dataURL";
};

function errorResp(status: number, message: string): Response {
    cprintln("#c55", `[ERROR](#c00): ${message}`);
    return new Response(
        JSON.stringify({
            message,
        }),
        {
            status,
            statusText: "ERROR",
            headers: {
                "Content-Type": "application/json",
            },
        },
    );
}

export async function handleAPIWriteFile(
    req: Request,
    options: APIWriteFileOptions,
): Promise<Response> {
    try {
        // Get the request and compute some initial derived values
        const params = (await req.json()) as APIWriteFileRequest;

        const filepath = `${options.baseDir}/${params.path}`;
        const dirpath = filepath.substring(0, filepath.lastIndexOf("/"));

        cprintln("#555", `Writing [${params.path}](filename)`);

        // Basic error checking and validation of the request
        if (params.content === undefined) {
            return errorResp(400, "No content provided");
        }
        const errResp = validatePath(filepath, options);
        if (errResp) {
            return errResp;
        }

        // Transform the content based on the format
        let transformed: string | Uint8Array = params.content;
        switch (params.format) {
            case "text":
                transformed = params.content;
                break;
            case "yaml":
                transformed = core.stringifyYAML(params.content, {
                    lineWidth: 120,
                    indent: 2,
                    condenseFlow: true,
                });
                break;
            case "dataURL": {
                // Assume the content is the result of a toDataURL call
                const base64Data = params.content.split(",")[1];
                const binaryData = atob(base64Data);
                const len = binaryData.length;
                const bytes = new Uint8Array(len);
                for (let i = 0; i < len; i++) {
                    bytes[i] = binaryData.charCodeAt(i);
                }
                transformed = bytes;
                break;
            }
        }

        // Write the file to disk
        await Deno.mkdir(dirpath, { recursive: true });
        if (transformed instanceof Uint8Array) {
            await Deno.writeFile(filepath, transformed);
        } else {
            await Deno.writeTextFile(filepath, transformed);
        }

        return new Response(JSON.stringify({ message: "File saved successfully" }), {
            status: 200,
        });
    } catch (error) {
        return errorResp(500, `Failed to save file: ${error}`);
    }
}

// WARNING: this is not robust or secure.
function validatePath(filepath: string, { baseDir }: { baseDir: string }): Response | null {
    if (!isSubdirectory(baseDir, filepath)) {
        return errorResp(400, `Invalid file path: ${filepath}`);
    }
    if (filepath.match(/[^a-zA-Z0-9_.\-/]/)) {
        return errorResp(400, `Invalid characters in filename: ${filepath}`);
    }
    if (filepath.length > 1024) {
        return errorResp(400, `File path too long: ${filepath.length} characters`);
    }
    const filename = filepath.substring(filepath.lastIndexOf("/") + 1);
    if (filename.length > 255) {
        return errorResp(400, `File name too long: ${filename.length} characters`);
    }
    return null;
}
