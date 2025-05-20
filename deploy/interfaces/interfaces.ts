export interface IWebsite {
  name: string;
  prefix: string;
  folder: string;
}

export interface IWebsiteList extends Array<IWebsite>{};