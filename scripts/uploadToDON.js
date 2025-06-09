import { SecretsManager } from "@chainlink/functions-toolkit";
import { ethers } from "ethers";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

/**
 * Validates that required environment variables are defined.
 * Throws an error early if any required config is missing,
 * preventing the function from executing in an invalid state.
 */
function validateEnvVars() {
  const requiredVars = [
    "SEPOLIA_RPC_URL",
    "SUPABASE_API_KEY",
    "EVM_PRIVATE_KEY",
  ];
  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      throw new Error(
        `${varName} not provided - check your environment variables`
      );
    }
  }
}

/**
 * Initializes the signer and provider using the EVM private key and Sepolia RPC.
 * These are used to sign transactions and interact with Ethereum contracts on-chain.
 */
function initializeSignerAndProvider(rpcUrl, privateKey) {
  const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
  const signer = new ethers.Wallet(privateKey, provider);
  return { signer, provider };
}

/**
 * Uploads encrypted secrets to Chainlink Functions DON gateway.
 * Returns the version ID which will be used to reference the secrets on-chain.
 */
async function uploadEncryptedSecrets(signer, secrets, config) {
  const secretsManager = new SecretsManager({
    signer: signer,
    functionsRouterAddress: config.routerAddress,
    donId: config.donId,
  });

  await secretsManager.initialize();

  // Encrypt the secrets using Chainlink Functions encryption methods.
  const encryptedSecretsObj = await secretsManager.encryptSecrets(secrets);

  console.log(
    `Uploading encrypted secrets to gateways ${config.gatewayUrls}. Slot ID: ${config.slotId}, Expiry: ${config.expirationTimeMinutes} mins`
  );

  const uploadResult = await secretsManager.uploadEncryptedSecretsToDON({
    encryptedSecretsHexstring: encryptedSecretsObj.encryptedSecrets,
    gatewayUrls: config.gatewayUrls,
    slotId: config.slotId,
    minutesUntilExpiration: config.expirationTimeMinutes,
  });

  if (!uploadResult.success) {
    throw new Error(`Failed to upload secrets to: ${config.gatewayUrls}`);
  }

  console.log(`✅ Secrets uploaded successfully! DON response:`, uploadResult);

  return parseInt(uploadResult.version);
}

/**
 * Saves DON secrets info to a file for future reference.
 * This prevents data loss in case of console clears or errors.
 */
function saveSecretsMetadataToFile({ version, slotId, expiration }) {
  const metadata = {
    donHostedSecretsVersion: version.toString(),
    slotId: slotId.toString(),
    expirationTimeMinutes: expiration.toString(),
  };

  fs.writeFileSync("donSecretsInfo.txt", JSON.stringify(metadata, null, 2));

  console.log(
    `✅ Secrets metadata saved to donSecretsInfo.txt. Version: ${version}`
  );
}

/**
 * Main entry point to perform the secrets encryption and upload process.
 */
const makeRequestSepolia = async () => {
  // Step 1: Validate critical configuration from environment
  validateEnvVars();

  const rpcUrl = process.env.SEPOLIA_RPC_URL;
  const privateKey = process.env.EVM_PRIVATE_KEY;
  const secrets = { apikey: process.env.SUPABASE_API_KEY };

  // Step 2: Chainlink Functions and network configuration
  const config = {
    routerAddress: "0xb83E47C2bC239B3bf370bc41e1459A34b41238D0", // Sepolia Functions Router
    linkTokenAddress: "0x779877A7B0D9E8603169DdbD7836e478b4624789",
    donId: "fun-ethereum-sepolia-1",
    gatewayUrls: [
      "https://01.functions-gateway.testnet.chain.link/",
      "https://02.functions-gateway.testnet.chain.link/",
    ],
    slotId: 0,
    expirationTimeMinutes: 1440,
  };

  // Step 3: Initialize the signer and provider for EVM interaction
  const { signer } = initializeSignerAndProvider(rpcUrl, privateKey);

  // Step 4: Upload the secrets to the DON and retrieve the version ID
  const version = await uploadEncryptedSecrets(signer, secrets, config);

  // Step 5: Save secret metadata locally
  saveSecretsMetadataToFile({
    version,
    slotId: config.slotId,
    expiration: config.expirationTimeMinutes,
  });
};

// Execute the main function with error handling to prevent silent failures
makeRequestSepolia().catch((err) => {
  console.error("❌ Error occurred while executing makeRequestSepolia:", err);
  process.exit(1);
});
