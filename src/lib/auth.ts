import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { emailOTP } from "better-auth/plugins";
import { db } from "@/lib/db";

export const auth = betterAuth({
    database: prismaAdapter(db, {
        provider: "postgresql",
    }),
    plugins: [
        emailOTP({
            async sendVerificationOTP({ email, otp, type }) {
                // MOCK EMAIL SENDING FOR DEVELOPMENT
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