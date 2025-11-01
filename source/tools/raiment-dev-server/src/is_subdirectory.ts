import { isAbsolute, relative, resolve } from "@std/path";

export function isSubdirectory(base: string, target: string): boolean {
    const basePath = resolve(base);
    const targetPath = resolve(target);

    const rel = relative(basePath, targetPath);
    return !!rel && !rel.startsWith("..") && !isAbsolute(rel);
}
