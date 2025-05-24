import { SecretsManager } from "@chainlink/functions-toolkit";
import { ethers } from "ethers";
import dotenv from "dotenv";
import fs from "fs";

// Load environment variables from a .env file into process.env.
// This allows us to securely manage sensitive information like API keys and private keys.
dotenv.config();

/**
 * Retrieve an environment variable by key. If not found, throw an error.
 * This ensures the application fails fast when essential configuration is missing.
 */
function getEnvVar(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`${key} not provided - check your environment variables`);
  }
  return value;
}

/**
 * Save important metadata about the encrypted secrets to a local file.
 * This file will act as a reference for debugging or later reuse of uploaded secrets.
 */
function saveSecretsInfo(version: number, slotId: number, expiration: number): void {
  const data = {
    donHostedSecretsVersion: version.toString(),
    slotId: slotId.toString(),
    expirationTimeMinutes: expiration.toString(),
  };

  // Write the information as a formatted JSON to a local file for persistence and traceability.
  fs.writeFileSync("donSecretsInfo.txt", JSON.stringify(data, null, 2));
}

/**
 * Upload the given secrets to Chainlink's decentralized oracle network (DON).
 * It first encrypts the secrets, then uploads them to multiple gateway URLs.
 */
async function uploadSecrets(signer: ethers.Signer, secrets: Record<string, string>) {
  const routerAddress = "0xb83E47C2bC239B3bf370bc41e1459A34b41238D0";
  const donId = "fun-ethereum-sepolia-1";
  const gatewayUrls = [
    "https://01.functions-gateway.testnet.chain.link/",
    "https://02.functions-gateway.testnet.chain.link/",
  ];
  const slotId = 0;
  const expiration = 1440;

  // Initialize the SecretsManager which handles encryption and secure uploading.
  const secretsManager = new SecretsManager({
    signer,
    functionsRouterAddress: routerAddress,
    donId,
  });

  // Perform necessary setup before using the secrets manager.
  await secretsManager.initialize();

  // Encrypt the secrets using the secrets manager. This ensures data confidentiality before upload.
  const encryptedSecretsObj = await secretsManager.encryptSecrets(secrets);

  console.log(`Uploading encrypted secrets to gateways. Slot ID: ${slotId}, Expiration: ${expiration} minutes`);

  // Upload the encrypted secrets to specified Chainlink function gateways.
  const uploadResult = await secretsManager.uploadEncryptedSecretsToDON({
    encryptedSecretsHexstring: encryptedSecretsObj.encryptedSecrets,
    gatewayUrls,
    slotId,
    minutesUntilExpiration: expiration,
  });

  // Validate the result. If upload fails, throw an error to halt the process.
  if (!uploadResult.success) {
    throw new Error(`Encrypted secrets not uploaded to ${gatewayUrls}`);
  }

  console.log(`✅ Secrets uploaded to gateways! Response:`, uploadResult);

  // Extract the version returned by the gateway to reference the uploaded secrets later.
  const version = parseInt(uploadResult.version);

  // Save this metadata locally so it can be reused if needed without re-uploading.
  saveSecretsInfo(version, slotId, expiration);

  console.log(`donHostedSecretsVersion is ${version}, info saved to donSecretsInfo.txt`);
}

/**
 * Main function to orchestrate the request process on Sepolia testnet.
 * It loads environment configuration, initializes provider and signer,
 * and calls the function to handle secret encryption and upload.
 */
async function makeRequestSepolia(): Promise<void> {
  // Load essential configuration from environment variables for RPC and secrets.
  const rpcUrl = getEnvVar("SEPOLIA_RPC_URL");
  const apiKey = getEnvVar("SUPABASE_API_KEY");
  const privateKey = getEnvVar("EVM_PRIVATE_KEY");

  // Set up Ethereum provider and signer to enable blockchain interactions.
  const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
  const signer = new ethers.Wallet(privateKey, provider);

  // The secrets object holds sensitive API keys that will be encrypted and uploaded.
  const secrets = { apikey: apiKey };

  console.log("\nMaking request...");

  // Encrypt and upload secrets using Chainlink Functions infrastructure.
  await uploadSecrets(signer, secrets);
}

// Entry point of the script. If an error occurs, log it and exit the process.
makeRequestSepolia().catch((error) => {
  console.error("❌ Error:", error.message);
  process.exit(1);
});
