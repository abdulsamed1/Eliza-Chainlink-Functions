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
        const contractAddress: `0x${string}` = "0x29EeD516E36f1b71D2a176C64bA0A287e2EaA3E0";
        const donHostedSecretsSlotID = 0;
        const donHostedSecretsVersion = Number(process.env.DON_HOSTED_SECRETS_VERSION) || Infinity;
        const subscriptionId = Number(process.env.SUBSCRIPTION_ID) || Infinity;

        return {
            contractAddress,
            donHostedSecretsSlotID,
            donHostedSecretsVersion,
            subscriptionId,
            chainName: "sepolia",
        };
    }
}



export class ConfigValidator {
    static validateConfig(config: GiftContractConfig): void {
        const { contractAddress, donHostedSecretsSlotID, donHostedSecretsVersion, subscriptionId } = config;

        if (contractAddress === "0x00") {
            throw new Error("Contract address is not configured");
        }

        if (donHostedSecretsSlotID === Infinity) {
            throw new Error("DON hosted secrets slot ID is not configured");
        }

        if (donHostedSecretsVersion === Infinity) {
            throw new Error("DON hosted secrets version is not configured");
        }

        if (subscriptionId === Infinity) {
            throw new Error("Chainlink subscription ID is not configured");
        }
    }
}