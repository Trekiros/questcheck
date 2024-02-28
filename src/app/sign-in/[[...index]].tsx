import { SignIn } from "@clerk/nextjs"
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

const SignInPage: FC<{}> = () => {
    return (
        <div>
            <SignIn appearance={ClerkTheme}/>
        </div>
    )
}

export default SignInPage