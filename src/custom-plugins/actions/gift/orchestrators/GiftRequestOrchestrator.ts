/**
 * @fileoverview Orchestrator for gift request operations
 */

import type { IAgentRuntime } from "@elizaos/core";
import { initWalletProvider } from "../../../providers/wallet.ts";
import type { GetGiftParams, Transaction } from "../../../types/index.ts";
import { ConfigValidator, GiftContractConfigFactory } from "../config/GiftContractConfig.ts";
import { GiftContractService } from "../services/GiftContractService.ts";

export class GiftRequestOrchestrator {
    constructor(private readonly contractService: GiftContractService) {}

    async processGiftRequest(params: GetGiftParams): Promise<Transaction> {
        console.log(`Processing gift request - Code: ${params.code}, Address: ${params.address}`);
        
        return await this.contractService.sendGiftRequest(params);
    }
}

export class GiftRequestOrchestratorFactory {
    static async create(runtime: IAgentRuntime): Promise<GiftRequestOrchestrator> {
        const walletProvider = await initWalletProvider(runtime);
        const config = GiftContractConfigFactory.createSepoliaConfig();
        
        ConfigValidator.validateConfig(config);
        
        const contractService = new GiftContractService(walletProvider, config);
        return new GiftRequestOrchestrator(contractService);
    }
}