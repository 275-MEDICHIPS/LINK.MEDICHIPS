#!/usr/bin/env tsx
/**
 * Generate VAPID keys for Web Push notifications.
 * Usage: npx tsx scripts/generate-vapid-keys.ts
 */
import * as crypto from "crypto";

function generateVapidKeys() {
  const ecdh = crypto.createECDH("prime256v1");
  ecdh.generateKeys();

  const publicKey = ecdh.getPublicKey("base64url");
  const privateKey = ecdh.getPrivateKey("base64url");

  console.log("VAPID Keys Generated:");
  console.log("=====================");
  console.log(`VAPID_PUBLIC_KEY=${publicKey}`);
  console.log(`VAPID_PRIVATE_KEY=${privateKey}`);
  console.log("");
  console.log("Add these to your .env file.");
}

generateVapidKeys();
