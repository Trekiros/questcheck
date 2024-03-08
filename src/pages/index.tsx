import { DefaultSearchParams, PlaytestSearchParamSchema } from "@/model/playtest";
import { FC } from "react";
import SearchParams from "@/components/playtest/searchParams";
import SearchResults from "@/components/playtest/searchResults";
import styles from './index.module.scss'
import { useLocalStorageState, useURLState } from "@/model/hooks";

const PlaytestBrowser: FC<{}> = ({}) => {
    const [searchParams, setSearchParams] = useLocalStorageState("search", PlaytestSearchParamSchema, DefaultSearchParams)

    return (
        <div className={styles.browser}>
            <SearchParams value={searchParams} onChange={setSearchParams} />

            <SearchResults search={searchParams} />
        </div>
    )
}

export default PlaytestBrowser