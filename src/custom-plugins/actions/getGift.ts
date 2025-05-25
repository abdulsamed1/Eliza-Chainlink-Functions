/**
 * @fileoverview Main gift request action following SOLID principles and clean architecture
 */

import {
    Action,
    HandlerCallback,
    type IAgentRuntime,
    type Memory,
    type State,
} from "@elizaos/core";

import { initWalletProvider } from "../providers/wallet.ts";
import { GiftRequestOrchestratorFactory } from "./gift/orchestrators/GiftRequestOrchestrator.ts";
import { ParameterBuilder } from "./gift/utils/ParameterBuilder.ts";
import { ResponseHandler } from "./gift/utils/ResponseHandler.ts";



/**
 * Main gift request action handler
 */
export const getGiftAction: Action = {
    name: "get gift",
    description: "Process gift requests by extracting wallet address and gift code, then calling the Functions Consumer Smart Contract",

    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state?: State,
        _options?: any,
        callback?: HandlerCallback
    ) => {
        try {
            const currentState = state || (await runtime.composeState(message)) as State;
            const updatedState = await runtime.updateRecentMessageState(currentState);

            console.log("Gift request handler initiated");

            const orchestrator = await GiftRequestOrchestratorFactory.create(runtime);
            const walletProvider = await initWalletProvider(runtime);

            const giftParams = await ParameterBuilder.buildGiftParams(
                updatedState,
                runtime,
                walletProvider
            );

            const transaction = await orchestrator.processGiftRequest(giftParams);

            ResponseHandler.handleSuccess(callback, giftParams, transaction);
            return true;

        } catch (error) {
            ResponseHandler.handleError(callback, error);
            return false;
        }
    },

    validate: async (runtime: IAgentRuntime) => {
        const privateKey = runtime.getSetting("EVM_PRIVATE_KEY");
        return typeof privateKey === "string" && privateKey.startsWith("0x");
    },

    examples: [
        [
            {
                user: "assistant",
                content: {
                    text: "I'll help you process your gift request",
                    action: "GET_GIFT",
                },
            },
            {
                user: "user",
                content: {
                    text: "Send gift to address 0x1234567890123456789012345678901234567890, gift ID is 1010",
                    action: "GET_GIFT",
                },
            },
            {
                user: "user",
                content: {
                    text: "Process gift request for address 0x1234567890123456789012345678901234567890, my gift code is 898770",
                    action: "GET_GIFT",
                },
            },
        ],
    ],

    similes: ["GET_GIFT", "GIFT_GIVE", "SEND_GIFT"],
};
