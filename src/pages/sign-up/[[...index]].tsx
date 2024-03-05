import { SignUp } from "@clerk/nextjs"
import { FC } from "react"
import { ClerkTheme } from "../sign-in/[[...index]]"
import { NextSeo } from "next-seo"

const SignUpPage: FC<{}> = () => {
    return (
        <div>
            <NextSeo title="Sign Up" />

            <SignUp appearance={ClerkTheme}/>
        </div>
    )
}

export default SignUpPage