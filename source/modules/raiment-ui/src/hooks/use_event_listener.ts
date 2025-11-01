import { EventEmitter } from "@raiment-core";
import React from "react";

export function useEventListener<S extends Record<string, any>>(
    emitter: EventEmitter<S> | undefined,
    eventNamesParam: keyof S | (keyof S)[],
    callback?: () => void,
): number {
    const [generation, setGeneration] = React.useState<number>(0);
    React.useEffect(() => {
        if (!emitter) {
            return;
        }
        const listener = () => {
            setGeneration((gen: number) => gen + 1);
            callback?.();
        };
        const eventNames = Array.isArray(eventNamesParam) ? eventNamesParam : [eventNamesParam];
        for (const event of eventNames) {
            emitter.on(event, listener);
        }
        return () => {
            for (const event of eventNames) {
                emitter.off(event, listener);
            }
        };
    }, [emitter, eventNamesParam]);
    return generation;
}
