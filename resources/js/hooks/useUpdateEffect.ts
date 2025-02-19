import { DependencyList, EffectCallback, useEffect, useRef } from "react";

/**
 * Custom React hook that triggers an effect only on component updates,
 * not on the initial mount. This hook is similar to useEffect, but it skips
 * the effect on the first render, making it useful for effects that you only
 * want to run in response to changes in dependencies.
 *
 * @param effect The effect function to be run on updates.
 * @param deps An optional array of dependencies that, when changed,
 * will trigger the effect.
 */

export const useUpdateEffect: (
    effect: EffectCallback,
    deps?: DependencyList
) => void = (effect, deps) => {
    const isInitialMount = useRef(true);

    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
        } else {
            return effect();
        }
    }, deps);
};
