import {
  type IAgentRuntime,
  type ICacheManager,
  type Memory,
  type Provider,
  type State,
  elizaLogger,
} from "@elizaos/core";
import NodeCache from "node-cache";
import * as path from "path";
import type {
  Account,
  Address,
  Chain,
  HttpTransport,
  PrivateKeyAccount,
  PublicClient,
  WalletClient,
} from "viem";
import {
  createPublicClient,
  createWalletClient,
  formatUnits,
  http,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import * as viemChains from "viem/chains";

import type { SupportedChain } from "../types/index.ts";

export class WalletProvider {
  private cache: NodeCache;
  private cacheKey: string = "evm/wallet";
  private currentChain: SupportedChain = "sepolia";
  private CACHE_EXPIRY_SEC = 5;
  chains: Record<string, Chain> = {};
  account: PrivateKeyAccount;

  constructor(
    accountOrPrivateKey: PrivateKeyAccount | `0x${string}`,
    private cacheManager: ICacheManager,
    chains?: Record<string, Chain>
  ) {
    if (typeof accountOrPrivateKey === "string") {
      this.account = privateKeyToAccount(accountOrPrivateKey);
    } else {
      this.account = accountOrPrivateKey;
    }
    // this.setAccount(accountOrPrivateKey);
    this.setChains(chains);

    if (chains && Object.keys(chains).length > 0) {
      this.setCurrentChain(Object.keys(chains)[0] as SupportedChain);
    }

    this.cache = new NodeCache({ stdTTL: this.CACHE_EXPIRY_SEC });
  }

  getAddress(): Address {
    return this.account.address;
  }

  getCurrentChain(): Chain {
    return this.chains[this.currentChain];
  }

  getPublicClient(
    chainName: SupportedChain
  ): PublicClient<HttpTransport, Chain, Account | undefined> {
    const transport = this.createHttpTransport(chainName);
    if (!this.chains[chainName]) {
      throw new Error(`Chain ${chainName} is not supported`);
    }
    const publicClient = createPublicClient({
      chain: this.chains[chainName],
      transport,
    });

    return publicClient;
  }

  getWalletClient(chainName: SupportedChain): WalletClient {
    const transport = this.createHttpTransport(chainName);
    if (!this.chains[chainName]) {
      throw new Error(`Chain ${chainName} is not supported`);
    }
    const walletClient = createWalletClient({
      chain: this.chains[chainName],
      transport,
      account: this.account,
    });

    return walletClient;
  }

  getChainConfigs(chainName: SupportedChain): Chain {
    const chain = viemChains[chainName];
    if (!this.chains[chainName]) {
      throw new Error(`Chain ${chainName} is not supported`);
    }
    if (!chain?.id) {
      throw new Error("Invalid chain name");
    }

    return chain;
  }

  async getWalletBalance(): Promise<string | null> {
    const cacheKey = "walletBalance_" + this.currentChain;
    const cachedData = await this.getCachedData<string>(cacheKey);
    if (cachedData) {
      elizaLogger.log(
        "Returning cached wallet balance for chain: " + this.currentChain
      );
      return cachedData;
    }

    try {
      const client = this.getPublicClient(this.currentChain);
      const balance = await client.getBalance({
        address: this.account.address,
      });
      const balanceFormatted = formatUnits(balance, 18);
      this.setCachedData<string>(cacheKey, balanceFormatted);
      elizaLogger.log("Wallet balance cached for chain: ", this.currentChain);
      return balanceFormatted;
    } catch (error) {
      console.error("Error getting wallet balance:", error);
      return null;
    }
  }

  async getWalletBalanceForChain(
    chainName: SupportedChain
  ): Promise<string | null> {
    try {
      const client = this.getPublicClient(chainName);
      const balance = await client.getBalance({
        address: this.account.address,
      });
      return formatUnits(balance, 18);
    } catch (error) {
      console.error("Error getting wallet balance:", error);
      return null;
    }
  }

  addChain(chain: Record<string, Chain>) {
    this.setChains(chain);
  }

  switchChain(chainName: SupportedChain, customRpcUrl?: string) {
    if (!this.chains[chainName]) {
      const chain = WalletProvider.genChainFromName(chainName, customRpcUrl);
      this.addChain({ [chainName]: chain });
    }
    this.setCurrentChain(chainName);
  }

  private async readFromCache<T>(key: string): Promise<T | null> {
    const cached = await this.cacheManager.get<T>(
      path.join(this.cacheKey, key)
    );
    return cached ?? null;
  }

  private async writeToCache<T>(key: string, data: T): Promise<void> {
    await this.cacheManager.set(path.join(this.cacheKey, key), data, {
      expires: Date.now() + this.CACHE_EXPIRY_SEC * 1000,
    });
  }

  private async getCachedData<T>(key: string): Promise<T | null> {
    // Check in-memory cache first
    const cachedData = this.cache.get<T>(key);
    if (cachedData) {
      return cachedData;
    }

    // Check file-based cache
    const fileCachedData = await this.readFromCache<T>(key);
    if (fileCachedData) {
      // Populate in-memory cache
      this.cache.set(key, fileCachedData);
      return fileCachedData;
    }

    return null;
  }

  private async setCachedData<T>(cacheKey: string, data: T): Promise<void> {
    // Set in-memory cache
    this.cache.set(cacheKey, data);

    // Write to file-based cache
    await this.writeToCache(cacheKey, data);
  }

  private setAccount = (
    accountOrPrivateKey: PrivateKeyAccount | `0x${string}`
  ) => {
    if (typeof accountOrPrivateKey === "string") {
      this.account = privateKeyToAccount(accountOrPrivateKey);
    } else {
      this.account = accountOrPrivateKey;
    }
  };

  private setChains = (chains?: Record<string, Chain>) => {
    if (!chains) {
      return;
    }
    Object.keys(chains).forEach((chain: string) => {
      this.chains[chain] = chains[chain];
    });
  };

  private setCurrentChain = (chain: SupportedChain) => {
    this.currentChain = chain;
  };

  private createHttpTransport = (chainName: SupportedChain) => {
    const chain = this.chains[chainName];

    if (chain.rpcUrls.custom) {
      return http(chain.rpcUrls.custom.http[0]);
    }
    return http(chain.rpcUrls.default.http[0]);
  };

  static genChainFromName(
    chainName: string,
    customRpcUrl?: string | null
  ): Chain {
    const baseChain = viemChains[chainName];

    if (!baseChain?.id) {
      throw new Error("Invalid chain name");
    }

    const viemChain: Chain = customRpcUrl
      ? {
          ...baseChain,
          rpcUrls: {
            ...baseChain.rpcUrls,
            custom: {
              http: [customRpcUrl],
            },
          },
        }
      : baseChain;

    return viemChain;
  }
}

const genChainsFromRuntime = (
  runtime: IAgentRuntime
): Record<string, Chain> => {
  const chainNames =
    (runtime.character.settings?.chains?.evm as SupportedChain[]) || [];
  const chains = {};

  chainNames.forEach((chainName) => {
    const rpcUrl = runtime.getSetting(
      chainName.toUpperCase() + "_RPC_URL"
    );
    const chain = WalletProvider.genChainFromName(chainName, rpcUrl);
    chains[chainName] = chain;
  });

  // Ensure Sepolia RPC URL is set
  if (!chains["sepolia"]) {
    const sepoliaRpcUrl = runtime.getSetting("SEPOLIA_RPC_URL");
    if (sepoliaRpcUrl) {
      const chain = WalletProvider.genChainFromName("sepolia", sepoliaRpcUrl);
      chains["sepolia"] = chain;
    }
  }

  return chains;
};

export const initWalletProvider = async (runtime: IAgentRuntime) => {
  const chains = genChainsFromRuntime(runtime);

  const privateKey = runtime.getSetting("EVM_PRIVATE_KEY") as `0x${string}`;
  if (!privateKey) {
    throw new Error("EVM_PRIVATE_KEY is missing");
  }

  if (!privateKey.startsWith("0x")) {
    throw new Error("EVM_PRIVATE_KEY must start with 0x");
  }

  return new WalletProvider(privateKey, runtime.cacheManager, chains);
};

export const evmWalletProvider: Provider = {
  async get(
    runtime: IAgentRuntime,
    _message: Memory,
    state?: State
  ): Promise<string | null> {
    try {
      const walletProvider = await initWalletProvider(runtime);
      const address = walletProvider.getAddress();
      const balance = await walletProvider.getWalletBalance();
      const chain = walletProvider.getCurrentChain();
      const agentName = state?.agentName || "The agent";
      return `${agentName}'s EVM Wallet Address: ${address}\nBalance: ${balance} ${chain.nativeCurrency.symbol}\nChain ID: ${chain.id}, Name: ${chain.name}`;
    } catch (error) {
      console.error("Error in EVM wallet provider:", error);
      return null;
    }
  },
};
