# serverless-prerender

[![serverless](http://public.serverless.com/badges/v3.svg)](http://www.serverless.com)

Serverless implementation of Prerender service


## Features

- Render Single Page Application for Crawlers
- Support caching via [built-in S3CacheStrategy](https://github.com/mooyoul/serverless-prerender/blob/master/src/strategies/s3-cache.ts) - [see usage](https://github.com/mooyoul/serverless-prerender/blob/d55d1b4971dc9ae057197ea9d49f02dcb4290bca/src/index.ts#L18-L26)
- Compatible with [Prerender](https://github.com/prerender/prerender) (respect prerender-specific meta elements like `prerender-status-code` or `prerender-header`)
- Customizable render Strategy via [built-in StrategyLifeCycle](https://github.com/mooyoul/serverless-prerender/blob/master/src/strategies/base.ts)


## Getting Started

```bash
$ serverless install --url https://github.com/mooyoul/serverless-prerender
$ npm install
$ serverless deploy
```


## Debugging

To see debug logs, Please set `DEBUG` environment variable to `serverless-prerender:*`.
or you can see my comments on [serverless.yml](https://github.com/mooyoul/serverless-prerender/blob/e7c45c5b2956f08449e6fec5bf357ea3ed489586/serverless.yml#L13-L15)


## Todo

- [ ] Update Documentations
- [ ] Add tests
- [ ] Add nginx configuration example
- [ ] Add Lambda@Edge middleware to handle actual crawler requests 


## Thanks

- [adieuadieu/serverless-chrome](https://github.com/adieuadieu/serverless-chrome)
  - Marco Lüthy did a great work. He created serverless-chrome project. so i was able to make this project. Thank you!
- Teammates
  - Experiences with various serverless related projects helped me a lot when making this project.
  - Take a look around our serverless related projects!
  - [balmbees/corgi](https://github.com/balmbees/corgi) - Web Framework for AWS Lambda, Typescript based, built-in router, swagger support
  - [balmbees/dynamo-typeorm](https://github.com/balmbees/dynamo-typeorm) - Object Data Mapper (ODM) for AWS DynamoDB, Typescript based, built-in GSI/DAX support


## License

[MIT](LICENSE)

See full license on [mooyoul.mit-license.org](http://mooyoul.mit-license.org/)
