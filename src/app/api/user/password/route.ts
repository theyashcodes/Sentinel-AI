import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword } from "better-auth/crypto";

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { currentPassword, newPassword, revokeOtherSessions } = body;

    if (!newPassword || typeof newPassword !== "string" || newPassword.length < 8) {
      return NextResponse.json(
        { error: "New password must be at least 8 characters long." },
        { status: 400 }
      );
    }

    // Find the user's accounts
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      include: {
        accounts: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const credentialAccount = user.accounts.find(
      (a) => a.providerId === "credential"
    );

    // If an existing password exists, verify current password
    if (credentialAccount && credentialAccount.password) {
      if (!currentPassword) {
        return NextResponse.json(
          { error: "Current password is required to change password." },
          { status: 400 }
        );
      }

      const isCurrentValid = await verifyPassword({
        hash: credentialAccount.password,
        password: currentPassword,
      });

      if (!isCurrentValid) {
        return NextResponse.json(
          { error: "Current password does not match records." },
          { status: 400 }
        );
      }
    }

    // Hash the new password using Better-Auth's built-in cryptographic hasher
    const newPasswordHash = await hashPassword(newPassword);

    if (credentialAccount) {
      await db.account.update({
        where: { id: credentialAccount.id },
        data: {
          password: newPasswordHash,
          updatedAt: new Date(),
        },
      });
    } else {
      // User signed up with Google/OAuth and is setting up a password for the first time
      await db.account.create({
        data: {
          userId: user.id,
          providerId: "credential",
          accountId: user.email,
          password: newPasswordHash,
        },
      });
    }

    // Revoke other sessions if requested
    if (revokeOtherSessions) {
      try {
        const currentToken = session.session?.token;
        if (currentToken) {
          await db.session.deleteMany({
            where: {
              userId: user.id,
              NOT: { token: currentToken },
            },
          });
        }
      } catch (sessionErr) {
        console.warn("Failed to purge other sessions:", sessionErr);
      }
    }

    // Security audit log
    try {
      await db.auditLog.create({
        data: {
          userId: user.id,
          action: "USER_PASSWORD_CHANGE",
          entityType: "Account",
          entityId: credentialAccount?.id || user.id,
          newData: { revokeOtherSessions: Boolean(revokeOtherSessions) },
          ipAddress: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "127.0.0.1",
        },
      });
    } catch (auditErr) {
      console.warn("Audit log creation skipped:", auditErr);
    }

    return NextResponse.json({
      success: true,
      message: credentialAccount?.password
        ? "Password changed successfully."
        : "Password created successfully. You can now also sign in with email & password.",
    });
  } catch (error) {
    console.error("Error in password change handler:", error);
    return NextResponse.json(
      { error: "Failed to update password. Please try again." },
      { status: 500 }
    );
  }
}
