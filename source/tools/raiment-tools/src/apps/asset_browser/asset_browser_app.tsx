import React, { JSX } from "react";
import { Div } from "@raiment-ui";
import { ToolAppFrame } from "@/components/tool_app_frame.tsx";
import { serverAPI } from "../../util/server_api.tsx";

type FileEntry = {
    directory: string;
    filepath: string;
    filename: string;
    extension: string;
};

export function AssetBrowserApp(): JSX.Element {
    const [assets, setAssets] = React.useState<Record<string, FileEntry[]> | null>(null);
    React.useEffect(() => {
        const go = async () => {
            const json: any = await serverAPI.listFiles("assets/base", { recursive: true });

            const groups: Record<string, FileEntry[]> = {};
            for (const itemRaw of json.entries) {
                const item: FileEntry = itemRaw as FileEntry;
                const directory: string = item.directory;
                groups[directory] ??= [];
                groups[directory].push(item);
            }

            setAssets(groups);
        };
        go();
    }, []);

    const groupKeys = assets ? Object.keys(assets) : [];

    return (
        <ToolAppFrame>
            <Div sl="p32">
                <Div sl="bold mb32">
                    Asset Browser
                </Div>

                <Div>
                    {assets &&
                        groupKeys.map((groupKey) => (
                            <AssetsListView
                                key={groupKey}
                                group={groupKey}
                                assets={assets[groupKey]}
                            />
                        ))}
                </Div>
            </Div>
        </ToolAppFrame>
    );
}

function AssetsListView(
    { group, assets }: { group: string; assets: FileEntry[] },
): JSX.Element | null {
    const filtered = assets.filter((asset) =>
        asset.extension !== "meta.md" && !asset.filename.startsWith(".")
    ).sort((a, b) => a.filename.localeCompare(b.filename));
    if (filtered.length === 0) {
        return null;
    }

    return (
        <Div sl="mb64">
            <Div sl="bold mb16" style={{ borderBottom: "solid 1px #bbb" }}>{group}</Div>
            <Div sl="flex-row-center flex-wrap gap-16 mb16">
                {filtered
                    .filter((asset) =>
                        asset.extension !== "meta.md" && !asset.filename.startsWith(".")
                    )
                    .map((asset) => (
                        <Div key={asset.filename}>
                            {asset.extension === "png" ? <PNGView asset={asset} /> : asset.filename}
                        </Div>
                    ))}
            </Div>
        </Div>
    );
}

function PNGView({ asset }: { asset: FileEntry }): JSX.Element {
    const [dimensions, setDimensions] = React.useState<{ width: number; height: number } | null>(
        null,
    );
    const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>): void => {
        const img = e.currentTarget;
        setDimensions({
            width: img.naturalWidth,
            height: img.naturalHeight,
        });
    };

    let imageWidth = 64;
    let imageHeight = 64;

    if (dimensions) {
        const { width, height } = dimensions;
        if (width <= 32 && height <= 32) {
            // Small images: use 2x scale
            imageWidth = width * 2;
            imageHeight = height * 2;
        } else if (width <= 64 && height <= 64) {
            // Medium images: use original dimensions
            imageWidth = width;
            imageHeight = height;
        } else {
            // Large images: clamp to 128px max
            const aspectRatio = width / height;
            if (width > height) {
                imageWidth = Math.min(width, 128);
                imageHeight = imageWidth / aspectRatio;
            } else {
                imageHeight = Math.min(height, 128);
                imageWidth = imageHeight * aspectRatio;
            }
        }
    }

    return (
        <Div
            sl="flex-col p4"
            style={{
                border: "solid 1px #ccc",
                borderRadius: "4px",
            }}
        >
            <Div sl="mb4">
                <img
                    style={{
                        display: "block",
                        margin: "0 auto",
                        width: imageWidth,
                        height: imageHeight,
                        imageRendering: "pixelated",
                    }}
                    src={`/assets/${asset.filepath}`}
                    alt={asset.filename}
                    onLoad={handleImageLoad}
                />
            </Div>
            <Div sl="font-size-10 text-center fg-gray-30">
                <Div>{asset.filename}</Div>
                <Div>
                    {dimensions ? `${dimensions.width} x ${dimensions.height}` : "- x - "}
                </Div>
            </Div>
        </Div>
    );
}
