import { isAbsolute, relative, resolve } from "@std/path";

export function isSubdirectory(base: string, target: string): boolean {
    const basePath = resolve(base);
    const targetPath = resolve(target);

    if (basePath === targetPath) {
        return true;
    }

    const rel = relative(basePath, targetPath);
    const isSubDir = !!rel && !rel.startsWith("..") && !isAbsolute(rel);
    return isSubDir;
}
