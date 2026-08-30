import { randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import http from "node:http";
import { basename } from "node:path";

const baseUrl = new URL(process.env.VIDEO_OS_HTTP_GATE_BASE_URL ?? "http://127.0.0.1:31582");
const sourcePath = process.env.VIDEO_OS_HTTP_GATE_SOURCE;
const spoofedHost = process.env.VIDEO_OS_HTTP_GATE_HOST ?? "attacker.example:3456";

if (!sourcePath) throw new Error("VIDEO_OS_HTTP_GATE_SOURCE is required.");
if (baseUrl.protocol !== "http:") throw new Error("The V2.4.1 HTTP gate only supports local HTTP.");
if (!["127.0.0.1", "localhost", "::1"].includes(baseUrl.hostname)) {
  throw new Error("The V2.4.1 HTTP gate only connects to a loopback host.");
}

const port = Number(baseUrl.port || 80);
if (!Number.isInteger(port) || port <= 0 || port > 65535) throw new Error("Invalid local HTTP gate port.");

const requestBuffer = ({ method, path, headers = {}, body }) =>
  new Promise((resolve, reject) => {
    const request = http.request(
      {
        hostname: baseUrl.hostname,
        port,
        method,
        path,
        headers: {
          Host: spoofedHost,
          "X-Forwarded-Host": spoofedHost,
          Connection: "close",
          ...headers,
        },
      },
      (response) => {
        const chunks = [];
        response.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
        response.on("end", () =>
          resolve({
            status: response.statusCode ?? 0,
            headers: response.headers,
            body: Buffer.concat(chunks).toString("utf8"),
          }),
        );
      },
    );
    request.on("socket", (socket) => {
      socket.once("connect", () => {
        console.log(`HTTP_GATE_SOCKET=CONNECTED ${socket.localAddress}:${socket.localPort}`);
      });
    });
    request.on("error", (error) => {
      reject(
        new Error(
          `HTTP gate transport failed before a response: ${error.code ?? "UNKNOWN"} ${error.message}`,
          { cause: error },
        ),
      );
    });
    request.setTimeout(180_000, () => request.destroy(new Error("HTTP gate request timed out.")));
    if (body) request.end(body);
    else request.end();
  });

const requestFile = ({ method, path, headers, filePath }) =>
  new Promise((resolve, reject) => {
    const request = http.request(
      {
        hostname: baseUrl.hostname,
        port,
        method,
        path,
        headers: {
          Host: spoofedHost,
          "X-Forwarded-Host": spoofedHost,
          Connection: "close",
          ...headers,
        },
      },
      (response) => {
        const chunks = [];
        response.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
        response.on("end", () =>
          resolve({
            status: response.statusCode ?? 0,
            headers: response.headers,
            body: Buffer.concat(chunks).toString("utf8"),
          }),
        );
      },
    );
    request.on("socket", (socket) => {
      socket.once("connect", () => {
        console.log(`HTTP_GATE_UPLOAD_SOCKET=CONNECTED ${socket.localAddress}:${socket.localPort}`);
      });
    });
    request.on("error", (error) => {
      reject(
        new Error(
          `HTTP upload transport failed before a response: ${error.code ?? "UNKNOWN"} ${error.message}`,
          { cause: error },
        ),
      );
    });
    request.setTimeout(10 * 60_000, () => request.destroy(new Error("HTTP upload timed out.")));
    const source = createReadStream(filePath);
    source.on("error", (error) => request.destroy(error));
    source.pipe(request);
  });

const projectPayload = JSON.stringify({ name: `V2.4.1 HTTP Gate ${Date.now()}` });
const createResponse = await requestBuffer({
  method: "POST",
  path: "/api/projects",
  headers: {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(projectPayload),
  },
  body: projectPayload,
});
console.log(`HTTP_GATE_CREATE_STATUS=${createResponse.status}`);
if (createResponse.status !== 201) {
  throw new Error(`Project creation failed: HTTP ${createResponse.status} ${createResponse.body}`);
}

const created = JSON.parse(createResponse.body);
const projectId = created?.project?.project?.id;
const expectedRevision = created?.project?.project?.revision;
if (typeof projectId !== "string" || !Number.isInteger(expectedRevision)) {
  throw new Error("Project creation returned an invalid Project payload.");
}

const sourceInfo = await stat(sourcePath);
if (!sourceInfo.isFile() || sourceInfo.size <= 0) throw new Error("VIDEO_OS_HTTP_GATE_SOURCE must be a non-empty file.");
const fileName = basename(sourcePath);
const operationId = randomUUID();
const uploadPath =
  `/api/projects/${encodeURIComponent(projectId)}/media?` +
  new URLSearchParams({
    fileName,
    expectedRevision: String(expectedRevision),
    operationId,
  }).toString();

console.log(`HTTP_GATE_PROJECT_ID=${projectId}`);
console.log(`HTTP_GATE_SOURCE_BYTES=${sourceInfo.size}`);
console.log(`HTTP_GATE_SPOOFED_HOST=${spoofedHost}`);

const uploadResponse = await requestFile({
  method: "POST",
  path: uploadPath,
  headers: {
    "Content-Type": "video/mp4",
    "Content-Length": sourceInfo.size,
  },
  filePath: sourcePath,
});
console.log(`HTTP_GATE_UPLOAD_STATUS=${uploadResponse.status}`);
if (uploadResponse.status < 200 || uploadResponse.status >= 300) {
  throw new Error(`Media upload failed: HTTP ${uploadResponse.status} ${uploadResponse.body}`);
}

const uploaded = JSON.parse(uploadResponse.body);
const uploadedProject = uploaded?.project;
const videoAsset = uploadedProject?.assets?.find?.((asset) => asset?.kind === "video");
if (!videoAsset?.id) throw new Error("Media upload completed without a durable video asset.");

console.log(`HTTP_GATE_ASSET_ID=${videoAsset.id}`);
console.log(`HTTP_GATE_PROJECT_REVISION=${uploadedProject.project.revision}`);
console.log("HTTP_GATE_UPLOAD=PASS");
