import React, { useCallback, useMemo } from "react"
import { COLOR_DODGER_BLUE_2 } from "../../lib/colors"
import { DEFAULT_CONFIG } from "../../lib/constants"
import { AuroraBackgroundConfig } from "../../types"
import { BubbleItem } from "../BubbleItem"
import styles from './AuroraBackground.module.css'

/**
 * It creates a bunch of bubbles, each with a different color, and animates them
 * @param {AuroraBackgroundConfig}  - bgColor - the background color of the gradient
 * @returns A React component.
 */
export function AuroraBackground({ bgColor, colors, numBubbles, animDuration, blurAmount, useRandomness }: AuroraBackgroundConfig) {

    const _bgColor = useMemo(() => bgColor ?? DEFAULT_CONFIG.bgColor!, [bgColor])
    const _animDuration = useMemo(() => animDuration ?? DEFAULT_CONFIG.animDuration!, [animDuration])
    const _blurAmount = useMemo(() => blurAmount ?? DEFAULT_CONFIG.blurAmount!, [blurAmount])
    const _useRandomness = useMemo(() => useRandomness ?? DEFAULT_CONFIG.useRandomness!, [useRandomness])

    /* A function that returns a color based on the index. */
    const _getColorByIndex = useCallback((index: number) => {
        const _arrColors = colors ?? DEFAULT_CONFIG.colors!;

        let _fixedIndex = index

        if (index >= _arrColors.length) _fixedIndex = Math.floor(index % _arrColors.length)
        if (index <= -_arrColors.length) _fixedIndex = -1 * Math.floor(index % _arrColors.length)
        if (index <= 0 && index > -_arrColors.length) _fixedIndex = -1 * index;

        return _arrColors[_fixedIndex] ?? COLOR_DODGER_BLUE_2;

    }, [colors])

    /* Creating an array of BubbleItem components. */
    const bubbleItems = useMemo(() => {
        const _amountBubbles = numBubbles ?? DEFAULT_CONFIG.numBubbles!;

        return new Array(_amountBubbles).fill(0).map((_v, index) => {
            const _bubbleColor = _getColorByIndex(index);

            return <BubbleItem blurAmount={_blurAmount} key={`aurora-bubble-item-${index}`} index={index} color={_bubbleColor} animDuration={_animDuration} useRandomness={_useRandomness} />
        })

    }, [numBubbles])


    return (
        <div className={styles.container}>
            <div className={styles.gradientWrapper} style={{
                background: _bgColor
            }}>
                {bubbleItems}
            </div>
        </div>
    )
}