/**
 * @fileoverview Parameter building utilities for gift requests
 */

import {
    composeContext,
    generateObjectDeprecated,
    ModelClass,
    type IAgentRuntime,
    type State,
} from "@elizaos/core";
import { WalletProvider } from "../../../providers/wallet.js";
import { getGiftTemplate } from "../../../templates/index.js";
import type { GetGiftParams } from "../../../types/index.js";

export class ParameterBuilder {
    static async buildGiftParams(
        state: State,
        runtime: IAgentRuntime,
        walletProvider: WalletProvider
    ): Promise<GetGiftParams> {
        const chains = Object.keys(walletProvider.chains);
        state.supportedChains = chains.map((item) => `"${item}"`).join("|");

        const context = composeContext({
            state,
            template: getGiftTemplate,
        });

        return (await generateObjectDeprecated({
            runtime,
            context,
            modelClass: ModelClass.SMALL,
        })) as GetGiftParams;
    }
}