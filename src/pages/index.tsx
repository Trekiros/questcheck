import { DefaultSearchParams } from "@/model/playtest";
import { FC, useState } from "react";
import SearchParams from "@/components/playtest/searchParams";
import SearchResults from "@/components/playtest/searchResults";
import styles from './index.module.scss'

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