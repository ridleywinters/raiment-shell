import { JSX } from "react";
import { Anchor, Div } from "@raiment-ui";

export function NavigationBar(): JSX.Element {
    return (
        <Div
            data-component="NavigationBar"
            sl="flex-row-center px16 py4 bg-gray-10"
            style={{
                borderBottom: "1px solid #555",
                boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
                lineHeight: 1.0,
            }}
        >
            <Div sl="bold">
                <a href="/" style={{ color: "white" }}>Raiment Tools</a>
            </Div>
            <Div
                sl="height-100% ml12 mr24 width-0 height-16"
                style={{
                    borderRight: "4px dotted #ccc",
                }}
            />
            <Div sl="flex-row-center gap-8">
                <Anchor href="/" sl="fg-#ddd fg-hover-#5af">
                    Home
                </Anchor>
            </Div>
        </Div>
    );
}
