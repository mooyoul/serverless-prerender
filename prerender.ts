// HACK: hacky workaround for "No matching handler found for 'handlerName'." Error
// serverless refuses deploy if there are no "Matching Handlers".
export * from "./src";
