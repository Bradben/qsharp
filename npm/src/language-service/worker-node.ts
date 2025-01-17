// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

// This module supports running the qsharp compiler in a Node.js worker thread. It should be
// used in a Node.js module in a manner similar to the below to create it with the right log level:
//
//     const worker = new Worker(join(thisDir,"worker-node.js"), {
//         workerData: {qscLogLevel: log.getLogLevel() }
//     });

import { isMainThread, parentPort, workerData } from "node:worker_threads";
import * as wasm from "../../lib/node/qsc_wasm.cjs";
import { log } from "../log.js";
import { QSharpLanguageService } from "./language-service.js";
import { createLanguageServiceDispatcher } from "./worker-proxy.js";

if (isMainThread)
  throw "Worker script should be loaded in a Worker thread only";
if (workerData && typeof workerData.qscLogLevel === "number") {
  log.setLogLevel(workerData.qscLogLevel);
}

const port = parentPort!; // eslint-disable-line @typescript-eslint/no-non-null-assertion

const postMessage = port.postMessage.bind(port);

const compiler = new QSharpLanguageService(
  wasm,
  // omit project system callback arguments as the worker doesn't support that
);
const invokeCompiler = createLanguageServiceDispatcher(postMessage, compiler);

function messageHandler(data: any) {
  if (!data.type || typeof data.type !== "string") {
    log.error(`Unrecognized msg: %O"`, data);
    return;
  }

  invokeCompiler(data);
}

port.addListener("message", messageHandler);
