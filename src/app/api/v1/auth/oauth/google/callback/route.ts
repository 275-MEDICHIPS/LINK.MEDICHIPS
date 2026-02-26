import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import {
  signAccessToken,
  signRefreshToken,
  generateCsrfToken,
  setAuthCookies,
} from "@/lib/auth/session";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

interface GoogleTokenResponse {
  access_token: string;
  id_token: string;
}

interface GoogleUserInfo {
  sub: string;
  email: string;
  name: string;
  picture?: string;
  email_verified?: boolean;
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("redirect") || req.nextUrl.searchParams.get("state") || "/";

  if (!code) {
    return NextResponse.redirect(new URL(`/login?error=no_code`, req.url));
  }

  try {
    const redirectUri = `${APP_URL}/api/v1/auth/oauth/google/callback`;

    // Exchange code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      return NextResponse.redirect(new URL(`/login?error=token_failed`, req.url));
    }

    const tokenData: GoogleTokenResponse = await tokenRes.json();

    // Get user info
    const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!userInfoRes.ok) {
      return NextResponse.redirect(new URL(`/login?error=userinfo_failed`, req.url));
    }

    const googleUser: GoogleUserInfo = await userInfoRes.json();

    // Find or create user
    let userAuth = await prisma.userAuth.findFirst({
      where: {
        method: "OAUTH_GOOGLE",
        identifier: googleUser.email,
        isActive: true,
      },
      include: {
        user: {
          include: {
            memberships: { where: { isActive: true }, take: 1 },
          },
        },
      },
    });

    if (!userAuth) {
      // Auto-register: create user + auth + default org membership
      let defaultOrg = await prisma.organization.findFirst({
        where: { deletedAt: null },
        orderBy: { createdAt: "asc" },
      });

      if (!defaultOrg) {
        defaultOrg = await prisma.organization.create({
          data: { name: "MEDICHIPS-LINK", slug: "medichips-link" },
        });
      }

      const newUser = await prisma.user.create({
        data: {
          name: googleUser.name,
          email: googleUser.email,
          avatarUrl: googleUser.picture || null,
          preferredLocale: "ko",
          memberships: {
            create: {
              organizationId: defaultOrg.id,
              role: "LEARNER",
            },
          },
          authMethods: {
            create: {
              method: "OAUTH_GOOGLE",
              identifier: googleUser.email,
              credential: googleUser.sub,
            },
          },
        },
        include: {
          authMethods: { where: { method: "OAUTH_GOOGLE" } },
          memberships: { where: { isActive: true }, take: 1 },
        },
      });

      userAuth = {
        ...newUser.authMethods[0],
        user: {
          ...newUser,
          memberships: newUser.memberships,
        },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any;
    } else {
      // Update avatar/name if changed
      if (googleUser.picture && googleUser.picture !== userAuth.user.avatarUrl) {
        await prisma.user.update({
          where: { id: userAuth.user.id },
          data: { avatarUrl: googleUser.picture },
        });
      }
    }

    const user = userAuth!.user;
    const orgId = user.memberships[0]?.organizationId || "";
    const role = user.memberships[0]?.role || "LEARNER";

    // Create tokens
    const accessToken = signAccessToken({ userId: user.id, role, orgId });
    const refreshToken = signRefreshToken(user.id);
    const csrfToken = generateCsrfToken();

    // Store session
    await prisma.userSession.create({
      data: {
        userId: user.id,
        deviceInfo: { userAgent: req.headers.get("user-agent") || "unknown", provider: "google" },
        ipAddress: req.headers.get("x-forwarded-for") || "unknown",
        csrfToken,
        refreshToken,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    await setAuthCookies(accessToken, refreshToken, csrfToken);

    await prisma.user.update({
      where: { id: user.id },
      data: { lastActiveAt: new Date() },
    });

    // Redirect with user data in a temporary cookie (client reads & stores in Zustand)
    const userData = JSON.stringify({
      id: user.id,
      name: user.name,
      email: user.email,
      role,
      orgId,
      avatarUrl: user.avatarUrl,
      locale: user.preferredLocale || "ko",
    });

    const response = NextResponse.redirect(new URL(state, req.url));
    response.cookies.set("oauth_user", userData, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60, // 1 minute — consumed on client
    });

    return response;
  } catch (error) {
    console.error("Google OAuth error:", error);
    return NextResponse.redirect(new URL(`/login?error=oauth_failed`, req.url));
  }
}
