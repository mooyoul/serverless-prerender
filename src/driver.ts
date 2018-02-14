import * as BbPromise from "bluebird";
import * as debug from "debug";
import * as puppeteer from "puppeteer";
import * as request from "request";

import { launchChrome } from "./serverless-chrome";

export interface DriverOptions {
  disableServerlessChrome?: boolean;
  userAgent?: string;
}

export class Driver {
  private readonly LOG_TAG = "serverless-prerender:driver";

  // @todo Inject ServerlessPrerender/VERSION token
  private readonly userAgent?: string;
  private readonly disableServerlessChrome: boolean;

  private browser: puppeteer.Browser | null = null;
  private slsChrome: {
    kill: () => Promise<void>;
  } | null = null;

  private log = debug(this.LOG_TAG);

  constructor(options: DriverOptions) {
    this.disableServerlessChrome = options.disableServerlessChrome || false;
    this.userAgent = options.userAgent;
  }

  public async getPage(): Promise<puppeteer.Page> {
    if (!this.browser) {
      throw new Error("browser not found");
    }

    this.log("creating page");
    return await this.browser.newPage();
  }

  public async shutdown() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;

      if (!this.disableServerlessChrome && this.slsChrome) {
        await this.slsChrome.kill();
      }
    }
  }

  public async launch() {
    if (this.browser) {
      this.log("running chrome instance detected, checking availability...");

      try {
        const version = await this.browser.version();
        this.log("received chrome version %s response", version);
        return;
      } catch (e) {
        this.log("failed to receive response from instance: ", e.stack);
        this.log("re-launching...");
        await this.shutdown();
        this.slsChrome = null;
      }
    }

    const ADDITIONAL_CHROME_FLAGS = [
      this.userAgent ? `--user-agent="${this.userAgent}"` : "",
    ];

    if (this.disableServerlessChrome) { // local or test environment
      this.log("DISABLE_SERVERLESS_CHROME is set, launching bundled chrome!");
      this.browser = await puppeteer.launch({
        args: ADDITIONAL_CHROME_FLAGS,
      });
    } else { // in lambda runtime
      this.log("launching serverless-chrome instance");
      const chrome = await launchChrome({
        flags: ADDITIONAL_CHROME_FLAGS,
      });
      this.log("chrome: ", chrome);

      this.log("getting debugger url from %s", chrome.url);

      const debuggerUrl = await this.getDebuggerUrl(chrome.url);

      this.log("got debugger url: ", debuggerUrl);
      this.browser = await puppeteer.connect({
        browserWSEndpoint: debuggerUrl,
      });
      this.slsChrome = chrome;
    }

    this.log("successfully connected");
  }

  private getDebuggerUrl(baseUrl: string): BbPromise<string> {
    return new BbPromise((resolve, reject) => {
      request({
        method: "GET",
        url: `${baseUrl}/json/version`,
        json: true,
        timeout: 5000,
      }, (e, res, body) => {
        if (e) {
          return reject(e);
        }

        const debuggerUrl = body.webSocketDebuggerUrl;

        if (!debuggerUrl) {
          return reject(new Error("Couldn't find debugger url from response"));
        }

        resolve(debuggerUrl as string);
      });
    });
  }
}
