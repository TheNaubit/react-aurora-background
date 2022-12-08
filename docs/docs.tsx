import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AuroraBackgroundProvider } from "../src/index";
import GithubCorner from 'react-github-corner';
// @ts-ignore
import styles from './docs.module.css';

const Example = () => {

    return (
        <AuroraBackgroundProvider useRandomness={true} animDuration={20}>
            <GithubCorner ariaLabel="Open React Aurora Background GitHub project" octoColor="#000" bannerColor="#fff" href="https://github.com/username/repo" />
            <div className={styles.container}>
                <div className={styles.card}>
                    <div className={styles.cardImageContainer}>
                        <img src="https://i.redd.it/b3esnz5ra34y.jpg" className={styles.cardImage} />
                    </div>
                    <div className={styles.cardTitleContainer}>
                        <span className={styles.cardTitleEmoji}>🌌</span>
                        <span className={styles.cardTitle}>React Aurora Background</span>
                    </div>
                </div>
            </div>
        </AuroraBackgroundProvider>
    );
};

const container = document.getElementById("root");
const root = createRoot(container!);

root.render(
    <StrictMode>
        <Example />
    </StrictMode>
);
