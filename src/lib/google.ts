import { prisma } from "@/lib/db";

export async function getGoogleAccessToken(userId: string): Promise<string | null> {
  const account = await prisma.account.findFirst({
    where: { userId, provider: "google" },
  });

  if (!account) return null;

  // Check if token is expired
  if (account.expires_at && account.expires_at * 1000 < Date.now()) {
    // Refresh the token
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.AUTH_GOOGLE_ID!,
        client_secret: process.env.AUTH_GOOGLE_SECRET!,
        grant_type: "refresh_token",
        refresh_token: account.refresh_token!,
      }),
    });

    const tokens = await response.json();

    if (!response.ok) {
      console.error("Failed to refresh Google token:", tokens);
      return null;
    }

    // Update the stored token
    await prisma.account.update({
      where: { id: account.id },
      data: {
        access_token: tokens.access_token,
        expires_at: Math.floor(Date.now() / 1000) + tokens.expires_in,
      },
    });

    return tokens.access_token;
  }

  return account.access_token;
}
