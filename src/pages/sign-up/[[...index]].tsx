import { SignUp } from "@clerk/nextjs"
import { FC } from "react"
import { ClerkTheme } from "../sign-in/[[...index]]"
import { NextSeo } from "next-seo"
import Page, { ServerSideProps } from "@/components/utils/page"
import { serverPropsGetter } from "@/components/utils/pageProps"
import styles from '../sign-in/connection.module.scss'

export const getServerSideProps = serverPropsGetter;

const SignUpPage: FC<{} & ServerSideProps> = ({ userCtx }) => {
    return (
        <Page userCtx={userCtx}>
            <NextSeo title="Sign Up" />

            <div className={styles.connection}>
                <SignUp appearance={ClerkTheme}/>
            </div>
        </Page>
    )
}

export default SignUpPage