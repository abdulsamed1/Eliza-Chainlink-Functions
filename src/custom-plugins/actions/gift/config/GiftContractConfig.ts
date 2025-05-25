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
        const contractAddress: `0x${string}` = "0x00"; // TODO: Set actual contract address
        const donHostedSecretsSlotID = Infinity; // TODO: Set actual slot ID
        const donHostedSecretsVersion = Infinity; // TODO: Set actual version
        const subscriptionId = Infinity; // TODO: Set actual subscription ID
        
        return {
            contractAddress,
            donHostedSecretsSlotID,
            donHostedSecretsVersion,
            subscriptionId,
            chainName: "avalancheFuji"
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