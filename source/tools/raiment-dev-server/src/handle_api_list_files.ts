import { isSubdirectory } from "./is_subdirectory.ts";
import { cprintln } from "@raiment-shell";

export type APIListFilesRequest = {
    path: string;
    recursive?: boolean;
};

type ListFileEntry = {
    directory: string;
    filepath: string;
    filename: string;
    basename: string;
    extension: string;
};

export type APIListFilesResponse = {
    entries: ListFileEntry[];
};

type APIListFilesOptions = {
    baseDir: string;
    stripPrefix?: string;
};

export async function handleAPIListFiles(
    req: Request,
    options: APIListFilesOptions,
): Promise<Response> {
    let rawRequest: any = null;
    try {
        rawRequest = await req.json();
        let { path, recursive }: APIListFilesRequest = rawRequest;

        if (typeof path !== "string") {
            console.error("Invalid path:", path);
            return new Response("Invalid path", { status: 400 });
        }

        if (options.stripPrefix && path.startsWith(options.stripPrefix)) {
            path = path.substring(options.stripPrefix.length);
        }
        const dirpath = `${options.baseDir}/${path}`;
        if (!isSubdirectory(options.baseDir, dirpath)) {
            console.error("Directory traversal attempt:", dirpath);
            return new Response("Invalid directory path", { status: 400 });
        }

        // Check if directory exists
        try {
            const stat = await Deno.stat(dirpath);
            if (!stat.isDirectory) {
                console.error("Not a directory:", dirpath);
                return new Response("Path is not a directory", { status: 400 });
            }
        } catch (error) {
            if (error instanceof Deno.errors.NotFound) {
                console.error("Directory not found:", dirpath);
                return new Response("Directory not found", { status: 404 });
            }
            throw error;
        }

        const entries = await buildFileEntries(dirpath, path, recursive);
        const resp: APIListFilesResponse = {
            entries,
        };
        cprintln("#555", `Listing [${dirpath}](filename) [${entries.length}](number) files`);
        return new Response(JSON.stringify(resp), {
            headers: { "Content-Type": "application/json" },
        });
    } catch (error) {
        console.log("Request:", rawRequest);
        console.error(error);
        return new Response("Error listing files", { status: 500 });
    }
}

async function buildFileEntries(
    dirpath: string,
    basePath: string,
    recursive = false,
): Promise<ListFileEntry[]> {
    const entries: ListFileEntry[] = [];
    for await (const entry of Deno.readDir(dirpath)) {
        if (entry.isFile) {
            const directory = basePath;
            const filepath = `${basePath}/${entry.name}`;
            const filename = entry.name;
            const extensionIndex = entry.name.indexOf(".");
            const [basename, extension] = extensionIndex !== -1
                ? [
                    entry.name.substring(0, extensionIndex),
                    entry.name.substring(extensionIndex + 1),
                ]
                : [entry.name, ""];
            entries.push({ directory, filepath, filename, basename, extension });
        } else if (recursive && entry.isDirectory) {
            const subdirpath = `${dirpath}/${entry.name}`;
            const subBasePath = basePath ? `${basePath}/${entry.name}` : entry.name;
            const subEntries = await buildFileEntries(subdirpath, subBasePath, recursive);
            entries.push(...subEntries);
        }
    }
    return entries;
}
