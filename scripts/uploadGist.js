const { SecretsManager, createGist } = require("@chainlink/functions-toolkit");
const ethers = require("ethers");
require("dotenv").config();

/**
 * Retrieve an environment variable or throw an error if it’s missing.
 * This function ensures critical configuration values are always available.
 */
function getEnvVar(key) {
  const value = process.env[key];
  if (!value) {
    throw new Error(`${key} not provided - check your environment variables`);
  }
  return value;
}

/**
 * Initializes an Ethereum signer using the given private key and RPC URL.
 * This signer will be used to sign and send transactions on-chain securely.
 */
function initializeSigner(privateKey, rpcUrl) {
  const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
  return new ethers.Wallet(privateKey, provider);
}

/**
 * Handles the encryption of secrets and uploads them as a GitHub Gist.
 * Returns encrypted URLs that can be referenced later in the DON.
 */
async function uploadSecretsToGist(signer, secrets) {
  const routerAddress = "0xb83E47C2bC239B3bf370bc41e1459A34b41238D0";
  const donId = "fun-ethereum-sepolia-1";

  // SecretsManager provides functionality for encrypting secrets and working with Chainlink DON.
  const secretsManager = new SecretsManager({
    signer,
    functionsRouterAddress: routerAddress,
    donId,
  });

  // Initialize the secrets manager before any operations. This may load config or contracts.
  await secretsManager.initialize();

  // Encrypt secrets locally. This ensures they are secure before any upload.
  const encryptedSecretsObj = await secretsManager.encryptSecrets(secrets);

  console.log(`Creating gist...`);

  // Get the GitHub token from environment to create a Gist.
  const githubApiToken = getEnvVar("GITHUB_API_TOKEN");

  // Create a new GitHub Gist that stores the encrypted secrets JSON string.
  const gistURL = await createGist(githubApiToken, JSON.stringify(encryptedSecretsObj));
  console.log(`\n✅ Gist created at ${gistURL}. Encrypting the URLs...`);

  // Encrypt the Gist URL so it can be securely used by Chainlink Functions.
  const encryptedSecretsUrls = await secretsManager.encryptSecretsUrls([gistURL]);

  console.log(`\n✅ Secrets URLs encrypted successfully: ${encryptedSecretsUrls}`);

  return encryptedSecretsUrls;
}

/**
 * Main function to run the secret upload logic on Sepolia testnet.
 * It prepares the signer, secrets, and performs encryption and upload.
 */
async function makeRequestSepolia() {
  console.log("\n🔐 Starting secrets upload process...");

  // Retrieve critical environment variables to set up signer and secrets.
  const rpcUrl = getEnvVar("SEPOLIA_RPC_URL");
  const privateKey = getEnvVar("EVM_PRIVATE_KEY");
  const supabaseApiKey = getEnvVar("SUPABASE_API_KEY");

  // Construct the secrets object to be encrypted and uploaded.
  const secrets = { apikey: supabaseApiKey };

  // Create a signer for the Sepolia Ethereum testnet using the given private key.
  const signer = initializeSigner(privateKey, rpcUrl);

  // Encrypt secrets and upload them to a GitHub Gist, then encrypt the URLs for DON usage.
  await uploadSecretsToGist(signer, secrets);
}

// Execute the main request and handle any errors gracefully.
makeRequestSepolia().catch((error) => {
  console.error("❌ Error:", error.message);
  process.exit(1);
});
