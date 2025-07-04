import {
  Character,
  Clients,
  defaultCharacter,
  ModelProviderName,
} from "@elizaos/core";
import getGiftPlugin from "./custom-plugins/index.ts";

export const character: Character = {
  ...defaultCharacter,
  // name: "Eliza",
  plugins: [getGiftPlugin],
  clients: [Clients.TWITTER],
  modelProvider: ModelProviderName.OPENROUTER,
  settings: {
    secrets: {},
    voice: {
      model: "en_US-hfc_female-medium",
    },
    chains: {
      evm: ["sepolia"],
    },
  },
};
