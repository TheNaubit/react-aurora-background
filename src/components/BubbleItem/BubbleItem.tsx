import React, { useMemo } from 'react'
import { BUBBLE_MAX_RANDOM_HEIGHT, BUBBLE_MAX_RANDOM_WIDTH, BUBBLE_MIN_RANDOM_HEIGHT, BUBBLE_MIN_RANDOM_WIDTH } from '../../lib/constants'
import { getRandomArbitrary } from '../../lib/utils'
import { Color } from '../../types'
import styles from './BubbleItem.module.css'

/**
 * It's a React component that renders a div with a background color and some animation properties.
 * @param  - index - the index of the bubble item
 */
export function BubbleItem({ index, color, animDuration, useRandomness, blurAmount }: { blurAmount: number | string, index: number, color: Color, animDuration: number, useRandomness: boolean }) {

    const animationDirection = useMemo(() => index % 2 === 0 ? "alternate-reverse" : "alternate", [index])

    const _randomnessStyles = useMemo(() => {
        if (useRandomness === false) return {};

        const _rndWidth = getRandomArbitrary(BUBBLE_MIN_RANDOM_WIDTH, BUBBLE_MAX_RANDOM_WIDTH);
        const _rndHeight = getRandomArbitrary(BUBBLE_MIN_RANDOM_HEIGHT, BUBBLE_MAX_RANDOM_HEIGHT);

        const _rndAnimDuration = animDuration + getRandomArbitrary(-0.8, 0.8)
        const _rndDelay = getRandomArbitrary(-0.8, 0.8)

        return {
            width: `${_rndWidth}%`,
            height: `${_rndHeight}%`,
            animationDuration: `${_rndAnimDuration}s`,
            animationDelay: `${_rndDelay}s`
        }

    }, [useRandomness])

    /* It's a hook that is used to memoize the blurAmount. */
    const _blurAmount = useMemo(() => {
        if (typeof blurAmount === "number") return `${blurAmount}px`

        return blurAmount
    }, [blurAmount])

    return (
        <div className={styles.bubbleItem} style={{
            animationDirection,
            backgroundColor: color,
            animationDuration: `${animDuration}s`,
            filter: `blur(${_blurAmount})`,
            WebkitFilter: `blur(${_blurAmount})`,
            ..._randomnessStyles
        }}></div>
    )
}