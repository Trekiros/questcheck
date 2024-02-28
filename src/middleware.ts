import { authMiddleware } from "@clerk/nextjs";

// Clerk middleware setup
export default authMiddleware({
    publicRoutes: [
        '/',
    ],
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
