// deno run -A render.tsx
import React, { JSX } from "react";
import satori from "https://esm.sh/satori@0.10.13";
import { render as svgToPng } from "https://deno.land/x/resvg_wasm@0.2.0/mod.ts";

type SatoriFont = {
    name: string;
    data: ArrayBuffer;
    weight: number; // e.g., 400, 700
    style: "normal" | "italic";
};

const NOTO_TTF_SOURCES: Array<{
    name: string;
    weight: number;
    style: "normal" | "italic";
    url: string;
}> = [
    // Noto Sans
    {
        name: "Noto Sans",
        weight: 400,
        style: "normal",
        url: "https://raw.githubusercontent.com/googlefonts/noto-fonts/main/hinted/ttf/NotoSans/NotoSans-Regular.ttf",
    },
    {
        name: "Noto Sans",
        weight: 700,
        style: "normal",
        url: "https://raw.githubusercontent.com/googlefonts/noto-fonts/main/hinted/ttf/NotoSans/NotoSans-Bold.ttf",
    },
    {
        name: "Noto Sans",
        weight: 400,
        style: "italic",
        url: "https://raw.githubusercontent.com/googlefonts/noto-fonts/main/hinted/ttf/NotoSans/NotoSans-Italic.ttf",
    },
    {
        name: "Noto Sans",
        weight: 700,
        style: "italic",
        url: "https://raw.githubusercontent.com/googlefonts/noto-fonts/main/hinted/ttf/NotoSans/NotoSans-BoldItalic.ttf",
    },

    // Noto Serif
    {
        name: "Noto Serif",
        weight: 400,
        style: "normal",
        url: "https://raw.githubusercontent.com/googlefonts/noto-fonts/main/hinted/ttf/NotoSerif/NotoSerif-Regular.ttf",
    },
    {
        name: "Noto Serif",
        weight: 700,
        style: "normal",
        url: "https://raw.githubusercontent.com/googlefonts/noto-fonts/main/hinted/ttf/NotoSerif/NotoSerif-Bold.ttf",
    },
    {
        name: "Noto Serif",
        weight: 400,
        style: "italic",
        url: "https://raw.githubusercontent.com/googlefonts/noto-fonts/main/hinted/ttf/NotoSerif/NotoSerif-Italic.ttf",
    },
    {
        name: "Noto Serif",
        weight: 700,
        style: "italic",
        url: "https://raw.githubusercontent.com/googlefonts/noto-fonts/main/hinted/ttf/NotoSerif/NotoSerif-BoldItalic.ttf",
    },

    // Noto Sans Mono (no italic in the upstream set)
    {
        name: "Noto Sans Mono",
        weight: 400,
        style: "normal",
        url: "https://raw.githubusercontent.com/googlefonts/noto-fonts/main/hinted/ttf/NotoSansMono/NotoSansMono-Regular.ttf",
    },
    {
        name: "Noto Sans Mono",
        weight: 700,
        style: "normal",
        url: "https://raw.githubusercontent.com/googlefonts/noto-fonts/main/hinted/ttf/NotoSansMono/NotoSansMono-Bold.ttf",
    },
    // Faculty Glyphic (display, no italics)
    {
        name: "Faculty Glyphic",
        weight: 400,
        style: "normal",
        url: "https://raw.githubusercontent.com/google/fonts/main/ofl/facultyglyphic/FacultyGlyphic-Regular.ttf",
    },

    // Quintessential (calligraphic)
    {
        name: "Quintessential",
        weight: 400,
        style: "normal",
        url: "https://raw.githubusercontent.com/google/fonts/main/ofl/quintessential/Quintessential-Regular.ttf",
    },
];

async function fetchTTF(url: string): Promise<ArrayBuffer> {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch font: ${url} (${res.status})`);
    return await res.arrayBuffer();
}

/** Load Noto (TTF) for Satori’s `fonts` option. */
export async function loadNotoFonts(): Promise<SatoriFont[]> {
    const entries = await Promise.all(
        NOTO_TTF_SOURCES.map(async (f) => ({
            name: f.name,
            weight: f.weight,
            style: f.style,
            data: await fetchTTF(f.url),
        })),
    );
    return entries;
}

const el: JSX.Element = (
    <div
        style={{
            width: 1920,
            maxWidth: 1920,
            height: 1080,
            maxHeight: 1080,
            display: "flex",
            background: "white",
            color: "black",
            fontFamily: "Noto Sans",
            fontSize: "32px",
        }}
    >
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                gap: 16,
                margin: "0 32px",
            }}
        >
            <h1 style={{ fontFamily: "Quintessential", textAlign: "center" }}>Hello World!</h1>
            <h2 style={{ fontFamily: "Faculty Glyphic", textAlign: "center" }}>Hello world</h2>
            <h3 style={{ fontFamily: "Noto Serif", textAlign: "center" }}>Hello world</h3>
            <p>
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor
                incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud
                exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute
                irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla
                pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia
                deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error
                sit voluptatem accusantium doloremque laudantium, totam rem aperiam eaque ipsa quae
                ab illo inventore veritatis.
            </p>
        </div>
    </div>
);

const svg = await satori(el, {
    width: 1920,
    height: 1080,
    fonts: [...(await loadNotoFonts())] as any,
}); // add fonts if needed
const png = await svgToPng(svg); // Uint8Array (PNG)
await Deno.writeFile("out.png", png);
console.log("Wrote out.png");
