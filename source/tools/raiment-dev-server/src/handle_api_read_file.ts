import * as core from "@raiment-core";
import { isSubdirectory } from "./is_subdirectory.ts";

type APIReadFileOptions = {
    baseDir: string;
};

export type APIReadFileRequest = {
    path: string;
    format:
        | "text" // Return contents as plain string
        | "json" // Parse contents as JSON and return as JSON object
        | "yaml"; // Parse contents as YAML and return as JSON object
};

export type APIReadFileResponse = string;

export async function handleAPIReadFile(
    req: Request,
    options: APIReadFileOptions,
): Promise<Response> {
    try {
        const { path, format }: APIReadFileRequest = await req.json();

        const filepath = `${options.baseDir}/${path}`;
        if (!isSubdirectory(options.baseDir, filepath)) {
            return new Response("Invalid file path", { status: 400 });
        }
        try {
            await Deno.stat(filepath);
        } catch (e) {
            if (e instanceof Deno.errors.NotFound) {
                return new Response("File not found", { status: 404 });
            }
            throw e;
        }

        const content = await Deno.readTextFile(filepath);

        let transformed: APIReadFileResponse = content;
        let contentType = "text/plain";

        switch (format) {
            case "text":
                transformed = content;
                contentType = "text/plain";
                break;
            case "json":
                transformed = JSON.stringify(JSON.parse(content));
                contentType = "application/json";
                break;
            case "yaml":
                transformed = JSON.stringify(core.parseYAML(content));
                contentType = "application/json";
                break;
        }

        return new Response(transformed, {
            headers: { "Content-Type": contentType },
        });
    } catch (error) {
        console.error(error);
        return new Response("Failed to load file", { status: 500 });
    }
}
