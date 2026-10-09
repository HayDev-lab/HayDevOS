#!/usr/bin/env node

import { createServer } from "node:http";

import {
  BROKER_PATH,
  MAX_REQUEST_BYTES,
  brokerErrorResponse,
  createBrokerReplayCache,
  handleBrokerCompletion,
  loadBrokerConfiguration,
} from "./openclaw-broker-lib.mjs";

const config = loadBrokerConfiguration();
const replayCache = createBrokerReplayCache();

function readBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let length = 0;
    request.on("data", (chunk) => {
      length += chunk.length;
      if (length > MAX_REQUEST_BYTES) {
        request.destroy();
        reject(Object.assign(new Error("REQUEST_TOO_LARGE"), { code: "REQUEST_TOO_LARGE" }));
        return;
      }
      chunks.push(chunk);
    });
    request.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    request.on("error", reject);
  });
}

function send(response, result) {
  response.writeHead(result.status, result.headers);
  response.end(result.body);
}

const server = createServer(async (request, response) => {
  if (request.method === "GET" && request.url === "/health") {
    send(response, { status: 200, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff" }, body: JSON.stringify({ status: "ok" }) });
    return;
  }
  if (request.method !== "POST" || request.url !== BROKER_PATH) {
    send(response, { status: 404, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff" }, body: JSON.stringify({ error: "NOT_FOUND" }) });
    return;
  }
  try {
    const rawBody = await readBody(request);
    send(response, await handleBrokerCompletion({ headers: request.headers, rawBody, config, replayCache }));
  } catch (error) {
    // Deliberately do not log request bodies, authentication material or model output.
    console.error(JSON.stringify({ event: "openclaw_broker_request_rejected", code: error?.code ?? "BROKER_INTERNAL_ERROR" }));
    send(response, brokerErrorResponse(error));
  }
});

server.listen(config.port, config.bindHost, () => {
  console.log(JSON.stringify({
    event: "openclaw_broker_started",
    bindHost: config.bindHost,
    port: config.port,
    gatewayTarget: config.agentTarget,
  }));
});

function stop(signal) {
  console.log(JSON.stringify({ event: "openclaw_broker_stopping", signal }));
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 30_000).unref();
}

process.on("SIGTERM", () => stop("SIGTERM"));
process.on("SIGINT", () => stop("SIGINT"));
