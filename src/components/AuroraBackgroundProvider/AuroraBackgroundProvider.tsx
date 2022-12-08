import React from 'react';
import { IAuroraBackgroundProvider } from '../../types';
import { AuroraBackground } from '../AuroraBackground/AuroraBackground';
import { ChildrenContainer } from '../ChildrenContainer';

import styles from './AuroraBackgroundProvider.module.css';

/**
 * AuroraBackgroundProvider is a function that returns a div with a className of auroraHolder. Inside
 * the div is a component called AuroraBackground and a component called ChildrenContainer
 * @param {IAuroraBackgroundProvider}  - IAuroraBackgroundProvider
 * @returns A div with a className of auroraHolder.
 */
export function AuroraBackgroundProvider({
    children,
    colors,
    numBubbles,
    animDuration,
    blurAmount,
    bgColor,
    useRandomness
}: IAuroraBackgroundProvider) {

    return (
        <div className={styles.auroraHolder}>
            <AuroraBackground useRandomness={useRandomness} colors={colors} numBubbles={numBubbles} animDuration={animDuration} blurAmount={blurAmount} bgColor={bgColor} />
            <ChildrenContainer>{children}</ChildrenContainer>
        </div>
    );
}
