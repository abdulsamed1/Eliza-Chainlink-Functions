/**
 * @fileoverview Configuration interfaces and factories for gift contract interactions
 */

// Add process import to access environment variables
import process from 'process';

export interface GiftContractConfig {
    readonly contractAddress: `0x${string}`;
    readonly donHostedSecretsSlotID: number;
    readonly donHostedSecretsVersion: number;
    readonly subscriptionId: number;
    readonly chainName: string;
}

export class GiftContractConfigFactory {
    static createSepoliaConfig(): GiftContractConfig {
        const contractAddress: `0x${string}` = process.env.CONTRACT_ADDRESS as `0x${string}` || "0x29EeD516E36f1b71D2a176C64bA0A287e2EaA3E0";
        const donHostedSecretsSlotID = 0; // This is fixed as per the contract call
        
        // Parse version and subscription ID with validation
        const donHostedSecretsVersion = process.env.DON_HOSTED_SECRETS_VERSION ? 
            parseInt(process.env.DON_HOSTED_SECRETS_VERSION, 10) : Infinity;
        const subscriptionId = process.env.SUBSCRIPTION_ID ? 
            parseInt(process.env.SUBSCRIPTION_ID, 10) : Infinity;

        // Create config
        const config: GiftContractConfig = {
            contractAddress,
            donHostedSecretsSlotID,
            donHostedSecretsVersion,
            subscriptionId,
            chainName: "sepolia",
        };

        // Validate before returning
        ConfigValidator.validateConfig(config);
        return config;
    }
}

export class ConfigValidator {
    static validateConfig(config: GiftContractConfig): void {
        const { contractAddress, donHostedSecretsSlotID, donHostedSecretsVersion, subscriptionId } = config;

        if (!contractAddress || contractAddress === "0x00") {
            throw new Error("Contract address is not configured");
        }

        if (donHostedSecretsSlotID === Infinity) {
            throw new Error("DON hosted secrets slot ID is not configured");
        }

        if (donHostedSecretsVersion === Infinity || isNaN(donHostedSecretsVersion)) {
            throw new Error("DON hosted secrets version is not configured or invalid");
        }

        if (subscriptionId === Infinity || isNaN(subscriptionId)) {
            throw new Error("Chainlink subscription ID is not configured or invalid");
        }
    }
}