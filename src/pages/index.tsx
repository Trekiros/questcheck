import { DefaultSearchParams, PlaytestSearchParamSchema } from "@/model/playtest";
import { FC } from "react";
import SearchParams from "@/components/playtest/searchParams";
import SearchResults from "@/components/playtest/searchResults";
import styles from './index.module.scss'
import { useLocalStorageState } from "@/model/hooks";
import Page, { ServerSideProps } from "@/components/utils/page";
import { serverPropsGetter } from "@/components/utils/pageProps";

export const getServerSideProps = serverPropsGetter;

const PlaytestBrowser: FC<{} & ServerSideProps> = ({ userCtx }) => {
    const [searchParams, setSearchParams] = useLocalStorageState("search", PlaytestSearchParamSchema, DefaultSearchParams)

    return (
        <Page userCtx={userCtx}>
            <div className={styles.browser}>
                <SearchParams value={searchParams} onChange={setSearchParams} />

                <SearchResults search={searchParams} />
            </div>
        </Page>
    )
}

export default PlaytestBrowser