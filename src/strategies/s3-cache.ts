import { S3 } from "aws-sdk";
import * as crypto from "crypto";
import * as debug from "debug";
import * as path from "path";

import * as Strategy from "./base";

type KeyMapper = (url: string) => string;

export interface S3CacheStrategyOptions {
  Bucket: string;
  KeyPrefix?: string;
  ExpiresInSeconds?: number;
  keyMapper?: KeyMapper;
}

export class S3CacheStrategy implements Strategy.StrategyLifeCycle {
  private readonly BUCKET: string;
  private readonly KEY_PREFIX: string;
  private readonly EXPIRES_IN_MS: number;

  private readonly LOG_TAG = "serverless-prerender:S3CacheStrategy";
  private readonly log = debug(this.LOG_TAG);

  private readonly s3 = new S3();
  private readonly keyMapper: KeyMapper;

  constructor(options: S3CacheStrategyOptions) {
    this.BUCKET = options.Bucket;
    this.KEY_PREFIX = options.KeyPrefix || "";
    this.EXPIRES_IN_MS = options.ExpiresInSeconds ?
      (options.ExpiresInSeconds * 1000) :
      (60 * 60 * 24 * 1000); // defaults to 1 day
    this.keyMapper = options.keyMapper || this.defaultKeyMapper;
  }

  public async before(request: Strategy.Request) {
    const key = path.join(this.KEY_PREFIX, this.keyMapper(request.url));

    try {
      this.log("looking for cached data (%s/%s)", this.BUCKET, key);
      const { Body } = await this.s3.getObject({
        Bucket: this.BUCKET,
        Key: key,
      }).promise();

      const cached = Buffer.isBuffer(Body) ?
        (Body as Buffer).toString("utf8") as string :
        Body as string;

      this.log("found cache from s3, parsing response...");

      return JSON.parse(cached) as Strategy.Response;
    } catch (e) {
      if (e.code === "NoSuchKey" || e.code === "AccessDenied") {
        this.log("there are no cached data (code: %s)", e.code);
        return;
      }

      throw e;
    }

  }

  public async after(request: Strategy.Request, response: Strategy.Response) {
    const key = path.join(this.KEY_PREFIX, this.keyMapper(request.url));

    try {
      this.log("saving response to cache");

      const serialized = JSON.stringify(response);

      await this.s3.putObject({
        Bucket: this.BUCKET,
        Key: key,
        Body: serialized,
        Expires: new Date(Date.now() + this.EXPIRES_IN_MS),
      }).promise();

      this.log("response saved to cache");
    } catch (e) {
      this.log("failed to save response to cache");
      this.log(e.stack);
    }
  }

  private defaultKeyMapper(url: string): string {
    return crypto.createHash("sha256")
      .update(url)
      .digest("hex");
  }
}
