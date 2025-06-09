const { SecretsManager, createGist } = require("@chainlink/functions-toolkit");
const ethers = require("ethers");
require("dotenv").config();

/**
 * Ensures that all required environment variables are defined.
 * This helps avoid runtime errors due to missing sensitive credentials.
 */
function validateEnvironmentVariables() {
  const requiredVars = [
    "SEPOLIA_RPC_URL",
    "EVM_PRIVATE_KEY",
    "SUPABASE_API_KEY",
    "GITHUB_API_TOKEN",
  ];

  requiredVars.forEach((varName) => {
    if (!process.env[varName]) {
      throw new Error(`${varName} not provided - check your environment variables`);
    }
  });
}

/**
 * Initializes the Ethers signer and provider using the Sepolia RPC and private key.
 * These are necessary to sign transactions and interact with smart contracts on-chain.
 */
function initializeSigner(rpcUrl, privateKey) {
  const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
  const signer = new ethers.Wallet(privateKey, provider);
  return signer;
}

/**
 * Encrypts the provided secrets using the Chainlink Functions SecretsManager,
 * then stores the encrypted data inside a GitHub Gist for off-chain reference.
 * Returns the encrypted URL to be used later on-chain.
 */
async function encryptAndUploadSecretsToGist(secrets, signer, config) {
  const secretsManager = new SecretsManager({
    signer,
    functionsRouterAddress: config.routerAddress,
    donId: config.donId,
  });

  await secretsManager.initialize();

  // Encrypt secrets using the SecretsManager abstraction from Chainlink toolkit.
  const encryptedSecretsObj = await secretsManager.encryptSecrets(secrets);

  console.log(`Creating Gist to store encrypted secrets...`);

  const gistURL = await createGist(
    process.env.GITHUB_API_TOKEN,
    JSON.stringify(encryptedSecretsObj)
  );

  console.log(`✅ Gist created successfully at: ${gistURL}`);
  console.log(`Encrypting Gist URL to be used by DON...`);

  // Encrypt the gist URL so it can be securely referenced in a Chainlink Function.
  const encryptedSecretsUrls = await secretsManager.encryptSecretsUrls([gistURL]);

  console.log(`✅ Encrypted secret URLs ready:`, encryptedSecretsUrls);
  return encryptedSecretsUrls;
}

/**
 * The main function orchestrates the flow: validate config, initialize signer,
 * encrypt and upload secrets, then print result. Errors are caught at the end.
 */
const makeRequestSepolia = async () => {
  // Step 1: Ensure all required configuration is in place
  validateEnvironmentVariables();

  // Step 2: Load necessary values from env
  const rpcUrl = process.env.SEPOLIA_RPC_URL;
  const privateKey = process.env.EVM_PRIVATE_KEY;
  const secrets = { apikey: process.env.SUPABASE_API_KEY };

  // Step 3: Chainlink Functions configuration
  const config = {
    routerAddress: "0xb83E47C2bC239B3bf370bc41e1459A34b41238D0",
    linkTokenAddress: "0x779877a7b0d9e8603169ddbd7836e478b4624789",
    donId: "fun-ethereum-sepolia-1",
  };

  // Step 4: Set up the signer for sending transactions and authorizing secrets
  const signer = initializeSigner(rpcUrl, privateKey);

  console.log("\n🔐 Starting secrets encryption and upload process...");

  // Step 5: Perform encryption and upload to Gist
  const encryptedUrls = await encryptAndUploadSecretsToGist(secrets, signer, config);

  console.log(`✅ Final Encrypted URLs ready for DON consumption:`, encryptedUrls);
};

// Catch any unhandled errors and exit the process cleanly
makeRequestSepolia().catch((err) => {
  console.error("❌ Error in makeRequestSepolia:", err);
  process.exit(1);
});
