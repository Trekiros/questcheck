"use client";

import { DefaultSearchParams } from "@/model/playtest";
import { FC, useState } from "react";
import styles from './browser.module.scss'
import SearchParams from "./searchParams";
import SearchResults from "./searchResults";

const PlaytestBrowser: FC<{}> = ({}) => {
    const [searchParams, setSearchParams] = useState(DefaultSearchParams)

    return (
        <div className={styles.browser}>
            <SearchParams value={searchParams} onChange={setSearchParams} />

            <SearchResults search={searchParams} />
        </div>
    )
}

export default PlaytestBrowser