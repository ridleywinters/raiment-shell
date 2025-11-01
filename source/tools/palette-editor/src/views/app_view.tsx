import * as core from "@raiment-core";
import { type ColorHexString, EventEmitter } from "@raiment-core";
import { invokeDownload, useEventListener } from "@raiment-ui";
import React, { JSX } from "react";

class Palette {
    events = new EventEmitter<{ "update": [] }>();

    base: ColorHexString[];
    colors: {
        primary: ColorHexString;
        shade: ColorHexString;
        highlight: ColorHexString;
    }[];

    constructor() {
        this.base = [];
        this.colors = [];
    }

    getBase(index: number): ColorHexString {
        return this.base[index];
    }
    setBase(index: number, color: ColorHexString): void {
        this.base[index] = color;
        this.events.emit("update");
    }

    get(row: number, flavor: "primary" | "shade" | "highlight"): ColorHexString {
        const colorSet = this.colors[row];
        if (!colorSet) {
            throw new Error(`No color set for row ${row}`);
        }
        return colorSet[flavor];
    }
    set(row: number, flavor: "primary" | "shade" | "highlight", color: ColorHexString): void {
        const colorSet = this.colors[row];
        if (!colorSet) {
            throw new Error(`No color set for row ${row}`);
        }
        colorSet[flavor] = color;
        this.events.emit("update");
    }

    moveRow(index: number, direction: "up" | "down"): void {
        if (direction === "up" && index > 0) {
            const temp = this.colors[index - 1];
            this.colors[index - 1] = this.colors[index];
            this.colors[index] = temp;
        } else if (direction === "down" && index < this.colors.length - 1) {
            const temp = this.colors[index + 1];
            this.colors[index + 1] = this.colors[index];
            this.colors[index] = temp;
        }
        this.events.emit("update");
    }

    computeAll(): ColorHexString[] {
        const all: ColorHexString[] = [];
        all.push(...this.base);
        for (let i = 0; i < this.colors.length; i++) {
            all.push(...this.computeRow(i));
        }
        return all;
    }

    computeRow(i: number): ColorHexString[] {
        const primary = this.colors[i].primary;
        const shade = this.colors[i].shade;
        const highlight = this.colors[i].highlight;
        const hslPrimary = hexToHSL(primary as string);
        const hslShade = hexToHSL(shade as string);
        const hslHighlight = hexToHSL(highlight as string);

        const colors: ColorHexString[] = [];

        // Element 0: shade
        colors.push(shade);

        // Elements 1-2: blends between shade and primary
        for (let j = 1; j <= 2; j++) {
            const a = j / 3;
            const h = Math.round(hslShade.h * (1 - a) + hslPrimary.h * a);
            const s = Math.round(hslShade.s * (1 - a) + hslPrimary.s * a);
            const l = Math.round(hslShade.l * (1 - a) + hslPrimary.l * a);
            colors.push(hslToHex(h, s, l) as ColorHexString);
        }

        // Element 3: primary
        colors.push(primary);

        // Elements 4-5: blends between primary and highlight
        for (let j = 1; j <= 2; j++) {
            const a = j / 3;
            const h = Math.round(hslPrimary.h * (1 - a) + hslHighlight.h * a);
            const s = Math.round(hslPrimary.s * (1 - a) + hslHighlight.s * a);
            const l = Math.round(hslPrimary.l * (1 - a) + hslHighlight.l * a);
            colors.push(hslToHex(h, s, l) as ColorHexString);
        }

        // Element 6: highlight
        colors.push(highlight);

        return colors;
    }
}

function convertGPLToPalette(gplColors: ColorHexString[]): Palette {
    const palette = new Palette();

    for (let i = 0; i < 7 && i < gplColors.length; i++) {
        palette.base.push(gplColors[i]);
    }
    let rows = 0;
    for (let i = 7; i < gplColors.length && rows < 15; i += 7, rows += 1) {
        const chunk = gplColors.slice(i, i + 7);
        if (chunk.length < 7) {
            chunk.push(...Array(7 - chunk.length).fill("#000000"));
        }
        palette.colors.push({
            primary: chunk[3],
            shade: chunk[0],
            highlight: chunk[6],
        });
    }
    return palette;
}

class ServerAPI {
    async readFile(path: string, format: "text" | "yaml" | "json"): Promise<string | object> {
        const resp = await fetch("/api/read-file", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ path, format }),
        });
        if (!resp.ok) {
            throw new Error(`Failed to read file: ${resp.statusText}`);
        }
        if (format === "text") {
            return await resp.text();
        } else if (format === "yaml" || format === "json") {
            return await resp.json();
        } else {
            throw new Error(`Unsupported format: ${format}`);
        }
    }

    async writeFile(
        path: string,
        content: string,
        format: "text" | "yaml" | "json",
    ): Promise<void> {
        const resp = await fetch("/api/write-file", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                path,
                content,
                format,
            }),
        });
        if (!resp.ok) {
            throw new Error(`Failed to write file: ${resp.statusText}`);
        }
    }
}

const serverAPI = new ServerAPI();

export function AppView(): JSX.Element {
    const [palette, setPalette] = React.useState<Palette | null>(null);

    React.useEffect(() => {
        const go = async () => {
            const gplContent = await serverAPI.readFile("palette/palette.gpl", "text") as string;
            const colors = core.parseGIMPPalette(gplContent);
            const pal = convertGPLToPalette(colors ?? []);
            setPalette(pal);
        };
        go();
    }, []);

    if (!palette) {
        return <div>Loading palette...</div>;
    }

    return <AppView2 palette={palette} />;
}

function AppView2({ palette }: { palette: Palette }): JSX.Element {
    useEventListener(palette.events, "update");

    const exportGPL = React.useCallback(() => {
        const colors = palette.computeAll();
        const gplContent = core.stringifyGIMPPalette(colors);
        invokeDownload("palette.gpl", gplContent, "text/plain");
    }, [palette]);

    const savePalette = React.useCallback(async () => {
        const colors = palette.computeAll();
        const gplContent = core.stringifyGIMPPalette(colors);
        await serverAPI.writeFile("palette/palette.gpl", gplContent, "text");
        alert("Palette saved successfully.");
    }, [palette]);

    return (
        <div style={{ margin: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                <h1>Palette Editor v0.1</h1>
                <button
                    type="button"
                    onClick={exportGPL}
                    style={{
                        padding: "8px 16px",
                        fontSize: "14px",
                        cursor: "pointer",
                        backgroundColor: "#4CAF50",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                    }}
                >
                    Export Palette
                </button>

                <button
                    type="button"
                    onClick={savePalette}
                    style={{
                        padding: "8px 16px",
                        fontSize: "14px",
                        cursor: "pointer",
                        backgroundColor: "#4CAF50",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                    }}
                >
                    Save Palette
                </button>
            </div>

            <div style={{ display: "flex", flexDirection: "row", gap: "32px" }}>
                <div>
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "row",
                            gap: "8px",
                            marginBottom: "16px",
                        }}
                    >
                        {palette.base.map((_color, idx) => (
                            <ColorPicker
                                key={idx}
                                value={palette.getBase(idx)}
                                onChange={(newColor) => {
                                    palette.setBase(idx, newColor);
                                }}
                            />
                        ))}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", marginBottom: "16px" }}>
                        {palette.colors.map((colorSet, idx) => (
                            <div
                                key={idx}
                                style={{
                                    display: "flex",
                                    flexDirection: "row",
                                    gap: "8px",
                                    marginBottom: "4px",
                                }}
                            >
                                <ColorPicker
                                    value={palette.get(idx, "primary")}
                                    onChange={(newColor) => {
                                        palette.set(idx, "primary", newColor);
                                    }}
                                />
                                <div style={{ width: "12px" }} />
                                <ColorPicker
                                    value={palette.get(idx, "shade")}
                                    onChange={(newColor) => {
                                        palette.set(idx, "shade", newColor);
                                    }}
                                />
                                <ColorPicker
                                    value={palette.get(idx, "highlight")}
                                    onChange={(newColor) => {
                                        palette.set(idx, "highlight", newColor);
                                    }}
                                />
                                <div style={{ width: "24px" }} />
                                {palette.computeRow(idx).map((color, cidx) => (
                                    <div
                                        key={cidx}
                                        style={{
                                            width: "32px",
                                            height: "32px",
                                            backgroundColor: color,
                                            border: "1px solid #444",
                                            cursor: "pointer",
                                        }}
                                        onClick={async () => {
                                            try {
                                                await navigator.clipboard.writeText(color);
                                                console.log(`Copied ${color} to clipboard`);
                                            } catch (err) {
                                                console.error(
                                                    "Failed to copy color to clipboard:",
                                                    err,
                                                );
                                            }
                                        }}
                                    />
                                ))}
                                <button
                                    type="button"
                                    onClick={() => palette.moveRow(idx, "up")}
                                    style={{
                                        padding: "4px 8px",
                                        cursor: "pointer",
                                        border: "none",
                                        background: "transparent",
                                        color: "#555",
                                    }}
                                >
                                    ▲
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
                <div>
                    {/* Placeholder for additional data */}
                </div>
            </div>
            <div>
                Color count: {palette.computeAll().length}
            </div>
        </div>
    );
}

function ColorPicker({
    value,
    onChange,
}: {
    value: ColorHexString;
    onChange: (newColor: ColorHexString) => void;
}): JSX.Element {
    const timeoutRef = React.useRef<number | null>(null);
    const handleChange = React.useCallback((evt: React.ChangeEvent<HTMLInputElement>) => {
        const newColor = evt.target.value as ColorHexString;
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => {
            onChange(newColor);
        }, 200);
    }, [onChange]);

    return (
        <div>
            <input
                type="color"
                value={value}
                onChange={handleChange}
            />
        </div>
    );
}

/**
 * Converts HSL values to a hex color string
 * @param h - Hue (0-360)
 * @param s - Saturation (0-100)
 * @param l - Lightness (0-100)
 * @returns Hex color string with # prefix
 */
function hslToHex(h: number, s: number, l: number): string {
    // Normalize values
    h = h / 360;
    s = s / 100;
    l = l / 100;

    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs((h * 6) % 2 - 1));
    const m = l - c / 2;

    let r = 0, g = 0, b = 0;

    if (0 <= h && h < 1 / 6) {
        r = c;
        g = x;
        b = 0;
    } else if (1 / 6 <= h && h < 2 / 6) {
        r = x;
        g = c;
        b = 0;
    } else if (2 / 6 <= h && h < 3 / 6) {
        r = 0;
        g = c;
        b = x;
    } else if (3 / 6 <= h && h < 4 / 6) {
        r = 0;
        g = x;
        b = c;
    } else if (4 / 6 <= h && h < 5 / 6) {
        r = x;
        g = 0;
        b = c;
    } else if (5 / 6 <= h && h < 1) {
        r = c;
        g = 0;
        b = x;
    }

    // Convert to 0-255 range and round
    r = Math.round((r + m) * 255);
    g = Math.round((g + m) * 255);
    b = Math.round((b + m) * 255);

    // Convert to hex and pad with zeros if needed
    const toHex = (n: number) => n.toString(16).padStart(2, "0");

    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Converts a hex color string to HSL values
 * @param hex - Hex color string (with or without #)
 * @returns Object with h (0-360), s (0-100), l (0-100) values
 */
function hexToHSL(hex: string): { h: number; s: number; l: number } {
    // Remove the hash if present
    hex = hex.replace("#", "");

    // Parse hex to RGB
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const diff = max - min;

    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (diff !== 0) {
        s = l > 0.5 ? diff / (2 - max - min) : diff / (max + min);

        switch (max) {
            case r:
                h = ((g - b) / diff + (g < b ? 6 : 0)) / 6;
                break;
            case g:
                h = ((b - r) / diff + 2) / 6;
                break;
            case b:
                h = ((r - g) / diff + 4) / 6;
                break;
        }
    }

    return {
        h: Math.round(h * 360),
        s: Math.round(s * 100),
        l: Math.round(l * 100),
    };
}
