import { Mastra } from "@mastra/core/mastra";
import { berkshireAgent } from "./agents/berkshire-agent";

export const mastra = new Mastra({
  agents: { berkshireAgent }
});