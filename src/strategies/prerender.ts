import * as debug from "debug";

import * as Strategy from "./base";

export interface PrerenderStrategyOptions {
  waitForPrerenderReady?: boolean;
  stripScripts?: boolean;
  timeout?: number;
}

export class PrerenderStrategy implements Strategy.StrategyLifeCycle {
  private readonly LOG_TAG = "serverless-prerender:PrerenderStrategy";
  private readonly log = debug(this.LOG_TAG);

  private readonly waitForPrerenderReady: boolean;
  private readonly stripScripts: boolean;
  private readonly timeout?: number;

  constructor(options: PrerenderStrategyOptions = {}) {
    this.waitForPrerenderReady = options.waitForPrerenderReady || false;
    this.stripScripts = options.stripScripts || true;
    this.timeout = options.timeout;
  }

  public async setup(request: Strategy.Request, page: Strategy.Page) {
    // setup request interceptor
    await page.setRequestInterception(true);

    page.on("request", (interceptedRequest) => {
      switch (interceptedRequest.resourceType) {
        case "image":
        case "media":
        case "font": {
          interceptedRequest.abort();
          break;
        }
        default: {
          interceptedRequest.continue();
          break;
        }
      }
    });

    page.on("dialog", async (dialog) => {
      this.log("got dialog (type: %s, message: %s)", dialog.type, dialog.message());
      await dialog.dismiss();
    });
  }

  public async render(request: Strategy.Request, page: Strategy.Page) {
    this.log("navigating to ", request.url);

    await page.goto(request.url, { timeout: this.timeout });

    this.log("page loaded, got window load event");

    if (this.waitForPrerenderReady) {
      this.log("waiting for prerenderReady flag");
      await page.waitForFunction("window.prerenderReady === true");
    }

    if (this.stripScripts) {
      this.log("stripping scripts");

      await page.$$eval("script", (scripts) => {
        scripts.forEach((el) => {
          const type = el.getAttribute("type");

          if (type !== "application/ld+json") {
            el.remove();
          }
        });
      });

      await page.$$eval("link[rel='preload']", (links) => {
        links.forEach((el) => {
          const as = el.getAttribute("as");

          if (as === "script") {
            el.remove();
          }
        });
      });
    }

    return {
      statusCode: (await this.findStatusCode(page)) || 200,
      headers: (await this.findHeaders(page)) || {},
      body: await page.content(),
    };
  }

  private async findStatusCode(page: Strategy.Page) {
    this.log("finding prerender-status-code meta element");

    try {
      const content = await page.$eval(
        "meta[name='prerender-status-code']",
        (el) => el.getAttribute("content"),
      ) as string | null;

      this.log("found status code : ", content);

      if (!content) {
        return null;
      }

      return parseInt(content, 10) || null;
    } catch (e) {
      return null;
    }
  }

  private async findHeaders(page: Strategy.Page) {
    try {
      const headerStrings = await page.$$eval(
        "meta[name='prerender-header']",
        (els) => Array.prototype.map.call(els, (el: Element) => el.getAttribute("content")),
      ) as string[];

      return headerStrings.reduce((hash, v) => {
        const [ key, value ] = v.split(":");

        hash[key] = value;

        return hash;
      }, {} as { [key: string]: string });
    } catch (e) {
      return null;
    }
  }
}
