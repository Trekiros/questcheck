import { authMiddleware } from "@clerk/nextjs";

// Clerk middleware setup
export default authMiddleware({
    publicRoutes: [
        '/',

        // Playtests
        '/playtest/:id',
        '/api/trpc/playtests.getCharacterById',
        '/api/trpc/playtests.search',
    ],
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
