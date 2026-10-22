import { NextRequest, NextResponse } from "next/server";
import { send2FAEmail } from "@/lib/email";

export async function GET(req: NextRequest) {
    const to = req.nextUrl.searchParams.get("to") || "iamyash.200@gmail.com";
    const gmailUser = process.env.GMAIL_USER;
    const hasPass = Boolean(process.env.GMAIL_APP_PASSWORD);
    const hasResend = Boolean(process.env.RESEND_API_KEY);

    console.log(`[API /test-email] Request to send email to: ${to}`);
    console.log(`[API /test-email] GMAIL_USER present: ${Boolean(gmailUser)} (${gmailUser || "none"})`);
    console.log(`[API /test-email] GMAIL_APP_PASSWORD present: ${hasPass}`);
    console.log(`[API /test-email] RESEND_API_KEY present: ${hasResend}`);

    const result = await send2FAEmail({
        to,
        userName: "Sentinel Tester",
        otp: Math.floor(100000 + Math.random() * 900000).toString(),
        type: "2fa",
    });

    return NextResponse.json({
        to,
        env: {
            GMAIL_USER: gmailUser ? `${gmailUser.slice(0, 4)}***@gmail.com` : null,
            hasGmailPass: hasPass,
            hasResendKey: hasResend,
            nodeEnv: process.env.NODE_ENV,
        },
        result,
    });
}
