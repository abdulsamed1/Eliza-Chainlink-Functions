/**
 * @fileoverview Configuration interfaces and factories for gift contract interactions
 */

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
        const donHostedSecretsVersion = 1748121443;
        const subscriptionId = 4820;

        return {
            contractAddress,
            donHostedSecretsSlotID,
            donHostedSecretsVersion,
            subscriptionId,
            chainName: "fun-ethereum-sepolia-1"
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