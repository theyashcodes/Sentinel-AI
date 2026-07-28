import { createAuthClient } from "better-auth/react";
import { emailOTPClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
    baseURL: "/api/auth",
    plugins: [
        emailOTPClient(),
    ],
});

export const {
    useSession,
    signIn,
    signUp,
    signOut,
    emailOtp,
} = authClient;
