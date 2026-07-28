import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { emailOTP } from "better-auth/plugins";
import { db } from "@/lib/db";

const baseURL =
    process.env.BETTER_AUTH_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

export const auth = betterAuth({
    baseURL,
    trustedOrigins: [baseURL],
    database: prismaAdapter(db, {
        provider: "postgresql",
    }),
    plugins: [
        emailOTP({
            async sendVerificationOTP({ email, otp, type }) {
                if (process.env.NODE_ENV === "production") {
                    throw new Error("Email delivery is not configured for this environment.");
                }

                // Local development only: avoid sending a real email while making
                // the one-time password available to the developer.
                console.log(`\n\n========================================`);
                console.log(`🔒 EMAIL OTP MOCK`);
                console.log(`To: ${email}`);
                console.log(`Type: ${type}`);
                console.log(`OTP Code: ${otp}`);
                console.log(`========================================\n\n`);
            },
        })
    ],
    emailAndPassword: {
        enabled: true,
    },
    advanced: {
        database: {
            generateId: "uuid"
        }
    }
});
