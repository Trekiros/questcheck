import Page, { ServerSideProps } from "@/components/utils/page";
import { serverPropsGetter } from "@/components/utils/pageProps";
import { SignIn } from "@clerk/nextjs"
import { NextSeo } from "next-seo"
import { FC } from "react"

export const ClerkTheme: NonNullable<React.ComponentProps<typeof SignIn>['appearance']> = {
    elements: {
      footerActionLink: { color: '#ccc', "&:hover": { color: 'white' } },
      profileSectionPrimaryButton: { color: '#fff' },
      badge: { color: '#fff' },
    },
    layout: {
      privacyPageUrl: '/privacy-policy',
      shimmer: true,
    },
    variables: {
        colorBackground: '#322',
        colorText: 'white',
        colorTextSecondary: '#aaa',
        colorInputText: 'white',
        colorShimmer: 'white',
        colorPrimary: '#433',
        colorDanger: '#f88',
        colorSuccess: '#8f8',
        colorWarning: '#8aa',
        colorAlphaShade: 'white',
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

            <SignIn appearance={ClerkTheme}/>
        </Page>
    )
}

export default SignInPage