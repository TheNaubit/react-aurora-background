import React from "react";
import styles from "./ChildrenContainer.module.css"

/**
 * This function takes in a ReactNode and returns a div with the childrenContainer className and the
 * children prop.
 * @param  - { children: React.ReactNode }
 * @returns A React component that renders a div with the className of childrenContainer.
 */
export function ChildrenContainer({ children }: { children: React.ReactNode }) {
    return (
        <div className={styles.childrenContainer}>
            {children}
        </div>
    )
}