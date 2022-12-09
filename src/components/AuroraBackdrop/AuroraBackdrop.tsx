import React, { useMemo } from 'react';
import styles from './AuroraBackdrop.module.css';

/**
 * AuroraBackdrop is a function that takes a blurAmount prop and returns a div with a backdropFilter
 * style set to blur the blurAmount.
 * @param  - blurAmount - The amount of blur to apply to the backdrop.
 * @returns A div with a className of auroraBackdrop and some custom style
 */
export function AuroraBackdrop({ blurAmount }: { blurAmount: number | string }) {

    /* It's a hook that is used to memoize the blurAmount. */
    const _blurAmount = useMemo(() => {
        if (typeof blurAmount === "number") return `${blurAmount}px`

        return blurAmount
    }, [blurAmount])

    return (
        <div
            className={styles.auroraBackdrop}
            style={{
                backdropFilter: `blur(${_blurAmount})`,
            }}
        >
        </div>
    );
}
