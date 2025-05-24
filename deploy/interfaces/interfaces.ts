export interface IWebsite {
  type: string;
  name: string;
  prefix: string;
  folder: string;
  weight?: number;
}

export interface IWebsiteList extends Array<IWebsite>{};