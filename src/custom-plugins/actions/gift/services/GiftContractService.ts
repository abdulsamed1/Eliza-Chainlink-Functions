/**
 * @fileoverview Smart contract service for gift request interactions
 */

import { getContract, parseEther, type Address, type Hash, type WalletClient } from "viem";
import getGiftJson from "../../../artifacts/GetGift.json" with { type: "json" };
import { WalletProvider } from "../../../providers/wallet.ts";
import type { GetGiftParams, SupportedChain, Transaction } from "../../../types/index.ts";
import type { GiftContractConfig } from "../config/GiftContractConfig.ts";

export class GiftContractService {
    constructor(
        private readonly walletProvider: WalletProvider,
        private readonly config: GiftContractConfig
    ) {}

    async sendGiftRequest(params: GetGiftParams): Promise<Transaction> {
        if (!params.code || !params.address) {
            throw new Error("Invalid parameters: code and address are required");
        }

        await this.walletProvider.switchChain(this.config.chainName as SupportedChain);
        const walletClient = this.walletProvider.getWalletClient(this.config.chainName as SupportedChain);
        
        if (!walletClient.account) {
            throw new Error("Wallet account not found");
        }
        
        try {
            const contract = this.createContract(walletClient);
            const hash = await this.executeContractCall(contract, params);
            
            return this.createTransactionResult(hash, walletClient.account.address);
        } catch (error) {
            throw this.handleContractError(error);
        }
    }

    private createContract(walletClient: WalletClient) {
        const contractData = getGiftJson["contracts"]?.["GetGift.sol:GetGift"];
        
        if (!contractData?.abi) {
            throw new Error("Contract ABI not found in artifacts");
        }
        
        const { abi } = contractData;
        
        return getContract({
            address: this.config.contractAddress,
            abi,
            client: walletClient
        });
    }

    private async executeContractCall(contract: any, params: GetGiftParams): Promise<Hash> {
        const args = [params.code];
        
        try {
            return await contract.write.sendRequest([
                BigInt(this.config.donHostedSecretsSlotID),
                BigInt(this.config.donHostedSecretsVersion),
                args,
                BigInt(this.config.subscriptionId),
                params.address
            ]);
        } catch (error) {
            if (error instanceof Error) {
                throw new Error(`Contract call failed: ${error.message}`);
            }
            throw new Error("Contract call failed: Unknown error");
        }
    }

    private createTransactionResult(hash: Hash, fromAddress: Address): Transaction {
        return {
            hash,
            from: fromAddress,
            to: this.config.contractAddress,
            value: parseEther("0"),
            data: "0x" as `0x${string}`,
        };
    }

    private handleContractError(error: unknown): Error {
        if (error instanceof Error) {
            // Check for specific contract errors
            if (error.message.includes("insufficient funds")) {
                return new Error("Insufficient funds for transaction");
            }
            if (error.message.includes("user rejected")) {
                return new Error("Transaction was rejected by user");
            }
            if (error.message.includes("nonce")) {
                return new Error("Transaction nonce error - please try again");
            }
            return new Error(`Gift request failed: ${error.message}`);
        }
        return new Error("Gift request failed: Unknown error occurred");
    }
}