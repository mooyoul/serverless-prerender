import * as BbPromise from "bluebird";

import { Driver } from "./driver";
import { Prerender } from "./prerender";
import { PrerenderStrategy, S3CacheStrategy } from "./strategies";

import { Context, Event, HandlerCallback } from "./interfaces/lambda-proxy";

const prerender = new Prerender(
  new Driver({
    disableServerlessChrome: !process.env.AWS_EXECUTION_ENV,
    // userAgent: "YOUR-CUSTOM-USER-AGENT",
  }),
);

prerender.use(
  // S3CacheStrategy can be optional
  new S3CacheStrategy({
    Bucket: "YOUR-BUCKET-NAMAE",
    // Bucket: "YOUR-CACHE-NAME",
    // KeyPrefix: "KEY_PREFIX/IF/YOU/WANT",
    // ExpiresInSeconds: 3600, // 1h
    // keyMapper(url: string) {
    //   return customUrlSerializer(url);
    // },
  }),
  new PrerenderStrategy({
    waitForPrerenderReady: true,
    stripScripts: true,
    // timeout: CUSTOM_NAVIGATION_TIMEOUT,
  }),
);

export function handler(event: Event, context: Context, callback: HandlerCallback) {
  BbPromise.resolve(
    prerender.handleEvent(event /*, RENDERER_TIMEOUT */),
  ).asCallback(callback);
}
