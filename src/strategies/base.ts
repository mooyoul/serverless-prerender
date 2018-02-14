import { Page } from "puppeteer";

export type Page = Page;

export interface Request {
  url: string;
}

export interface Response {
  statusCode?: number;
  headers?: {
    [key: string]: string;
  };
  body: string;
}

export interface StrategyLifeCycle {
  before?: (request: Request) => Promise<Response | void>;
  setup?: (request: Request, page: Page) => Promise<void>;
  render?: (request: Request, page: Page) => Promise<Response>;
  after?: (request: Request, response: Response) => Promise<Response | void>;
}
