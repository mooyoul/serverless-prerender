import * as BbPromise from "bluebird";
import * as debug from "debug";
import * as qs from "querystring";

import { Driver } from "./driver";
import { Event } from "./interfaces/lambda-proxy";
import * as Strategy from "./strategies/base";
import { anySeries, isValidUrl } from "./util";

export class Prerender {
  private readonly LOG_TAG = "serverless-prerender:prerender";
  private readonly log = debug(this.LOG_TAG);

  private strategies: Strategy.StrategyLifeCycle[] = [];

  constructor(
    private driver: Driver,
  ) {}

  public use(...strategies: Strategy.StrategyLifeCycle[]) {
    Array.prototype.push.apply(this.strategies, strategies);
  }

  public async handleEvent(event: Event, timeout?: number) {
    const request = this.transformEvent(event);

    if (!request) {
      return {
        statusCode: 400,
        headers: {
          "content-type": "text/plain; charset=UTF-8",
        },
        body: "Bad Request",
      };
    }

    try {
      return await this.render(request, timeout);
    } catch (e) {
      this.log(e.stack);

      if (e instanceof BbPromise.TimeoutError) {
        return {
          statusCode: 504,
          headers: {
            "content-type": "text/plain; charset=UTF-8",
          },
          body: "Gateway Timeout",
        };
      }

      return {
        statusCode: 502,
        headers: {
          "content-type": "text/plain; charset=UTF-8",
        },
        body: "Bad Gateway",
      };
    }
  }

  public async render(request: Strategy.Request, timeout: number = 25000): Promise<Strategy.Response> {
    this.log("received request %s", request.url);

    try {
      return await BbPromise.resolve((async () => {
        this.log("executing before hooks");

        const beforeResponse = await anySeries(
          this.strategies.filter((s) => s.before),
          (s) => s.before!(request),
        );

        if (beforeResponse) {
          this.log("got response from before hook");

          return this.normalizeResponse(beforeResponse);
        }

        await this.driver.launch();

        this.log("creating page");
        const page = await this.driver.getPage();

        this.log("executing setup hooks");
        await BbPromise.mapSeries(
          this.strategies.filter((s) => s.setup),
          (s) => s.setup!(request, page),
        );

        this.log("executing render hooks");
        const renderResponse = await anySeries(
          this.strategies.filter((s) => s.render),
          (s) => s.render!(request, page),
        );

        await page.close();

        if (!renderResponse) {
          this.log("could not receive response from strategies, returning 502 bad gateway response!");

          return {
            statusCode: 502,
            headers: {
              "content-type": "text/plain; charset=UTF-8",
            },
            body: "Bad Gateway",
          };
        }

        this.log("executing after hooks");
        const afterResponse = await anySeries(
          this.strategies.filter((s) => s.after),
          (s) => s.after!(request, renderResponse),
        );

        this.log("normalizing response");
        return this.normalizeResponse(afterResponse || renderResponse);
      })()).timeout(timeout);
    } finally {
      this.log("cleanup...");
      await this.driver.shutdown();
    }
  }

  private transformEvent(event: Event): Strategy.Request | null {
    const urlWithoutQuery = event.path.slice(1);

    const builtUrl = event.queryStringParameters ?
      `${urlWithoutQuery}?${qs.stringify(event.queryStringParameters)}` :
      urlWithoutQuery;

    if (!isValidUrl(builtUrl)) {
      return null;
    }

    return { url: builtUrl };
  }

  private normalizeResponse(response: Strategy.Response): Strategy.Response {
    const defaultHeaders = {
      "content-type": "text/html; charset=UTF-8",
    };

    const normalizedHeaders = Object.keys(response.headers || {}).reduce((hash, key) => {
      hash[key.toLowerCase()] = response.headers![key];

      return hash;
    }, Object.create(null));

    return {
      statusCode: response.statusCode || 200,
      headers: {
        ...defaultHeaders,
        ...normalizedHeaders,
      },
      body: response.body,
    };
  }
}
