export const routingPolicyType = {
  simple: "simple",
  weighted: "weighted"
} as const;

export type RoutingPolicyType = typeof routingPolicyType[keyof typeof routingPolicyType];

export interface IWebsite {
  name: string;
  folder: string;
  weight?: number;
}

export interface IWebsiteSet {
  routingPolicyType: RoutingPolicyType;
  websites: Array<IWebsite>;
}