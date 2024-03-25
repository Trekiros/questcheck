import { MutableUser } from "@/model/user";
import { Permissions } from "@/server/routers/users";
import { FC, ReactNode, createContext, useContext } from "react";
import NavBar from "./navbar";
import { UserReview } from "@/model/reviews";

export type ServerSideProps = {
    userCtx: { 
        user: MutableUser, 
        permissions: Permissions,
        userId: string,
        reviews: (UserReview & { author: string })[]
    } | null,
}

// Client side (hte props are those given by getServerSideProps)
const UserCtx = createContext<ServerSideProps['userCtx']>(null)

export function useUserCtx() {
    return useContext(UserCtx)
}

const Page: FC<ServerSideProps & { children: ReactNode }> = ({ userCtx, children }) => {
    return (
        <UserCtx.Provider value={userCtx}>
            <NavBar />
            <main>
                {children}
            </main>
        </UserCtx.Provider>
    )
}

export default Page