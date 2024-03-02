import { SignUp } from "@clerk/nextjs"
import { FC } from "react"
import { ClerkTheme } from "../sign-in/[[...index]]"

const SignUpPage: FC<{}> = () => {
    return (
        <div>
            <SignUp appearance={ClerkTheme}/>
        </div>
    )
}

export default SignUpPage