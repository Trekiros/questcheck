import Page, { ServerSideProps } from "@/components/utils/page";
import { serverPropsGetter } from "@/components/utils/pageProps";
import { SignIn } from "@clerk/nextjs"
import { NextSeo } from "next-seo"
import { FC } from "react"
import styles from './connection.module.scss'

export const ClerkTheme: NonNullable<React.ComponentProps<typeof SignIn>['appearance']> = {
    elements: {
      footerActionLink: { color: '#ccc', "&:hover": { color: 'white' } },
      profileSectionPrimaryButton: { color: '#fff' },
      socialButtonsIconButton: { background: '#fff', "$:hover": { background: "#fff8"} },
      badge: { color: '#fff' },
    },
    layout: {
      privacyPageUrl: '/privacy',
      shimmer: true,
    },
    variables: {
        colorBackground: '#15171f',
        colorText: 'white',
        colorTextSecondary: '#aaa',
        colorInputText: 'white',
        colorShimmer: 'white',
        colorPrimary: '#282a3a',
        colorDanger: '#f88',
        colorSuccess: '#8f8',
        colorWarning: '#8aa',
        colorInputBackground: '#fff1',
        borderRadius: '8px',
        spacingUnit: '1em',
        colorTextOnPrimaryBackground: 'white',
    }
}

export const getServerSideProps = serverPropsGetter;

const SignInPage: FC<{} & ServerSideProps> = ({ userCtx }) => {
    return (
        <Page userCtx={userCtx}>
            <NextSeo title="Sign In" />

            <div className={styles.connection}>
                <SignIn appearance={ClerkTheme}/>
            </div>
        </Page>
    )
}

export default SignInPage