/**
 * @fileoverview Response handling utilities for gift requests
 */

import type { HandlerCallback } from "@elizaos/core";
import { formatEther } from "viem";
import type { GetGiftParams, Transaction } from "../../../types/index.js";

export class ResponseHandler {
    static handleSuccess(
        callback: HandlerCallback | undefined,
        params: GetGiftParams,
        transaction: Transaction
    ): void {
        if (!callback) return;
        
        callback({
            text: `Gift request successful! Code: ${params.code}, Address: ${params.address}\nTransaction Hash: ${transaction.hash}`,
            content: {
                success: true,
                hash: transaction.hash,
                amount: formatEther(transaction.value),
                recipient: transaction.to,
                chain: "sepolia",
            },
        });
    }

    static handleError(
        callback: HandlerCallback | undefined,
        error: unknown
    ): void {
        console.error("Gift request error:", error);
        
        if (!callback) return;
        
        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
        
        callback({
            text: `Gift request failed: ${errorMessage}`,
            content: { error: errorMessage },
        });
    }
}