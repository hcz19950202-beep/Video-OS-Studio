const address = process.env.C4_MCP_ADDRESS;
const token = process.env.C4_MCP_TOKEN;
const protocolVersion = process.env.C4_MCP_PROTOCOL_VERSION;
const projectId = process.env.C4_MCP_PROJECT_ID;

if (!address || !token || !protocolVersion || !projectId) {
  throw new Error("Missing C4 MCP external-client test configuration.");
}

const call = async (method, params = {}, toolName) => {
  const response = await fetch(address, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "MCP-Protocol-Version": protocolVersion,
      "Mcp-Method": method,
      ...(toolName ? { "Mcp-Name": toolName } : {}),
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: `${method}-external-client`,
      method,
      params: {
        ...params,
        _meta: {
          "io.modelcontextprotocol/protocolVersion": protocolVersion,
          "io.modelcontextprotocol/clientInfo": {
            name: "video-os-c4-external-process-proof",
            version: "1.0.0",
          },
        },
      },
    }),
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(`External MCP request ${method} failed: ${response.status}`);
  }
  return payload;
};

const discovered = await call("server/discover");
if (!discovered.result?.supportedVersions?.includes(protocolVersion)) {
  throw new Error("External MCP client did not discover the expected protocol version.");
}

const listed = await call("tools/list");
const names = listed.result?.tools?.map((tool) => tool.name) ?? [];
if (!names.includes("read_project_summary") || names.some((name) => name.includes("write"))) {
  throw new Error("External MCP client observed an invalid read catalog.");
}

const read = await call(
  "tools/call",
  { name: "read_project_summary", arguments: {} },
  "read_project_summary",
);
if (read.result?.structuredContent?.projectId !== projectId || read.result?.isError !== false) {
  throw new Error("External MCP client did not read the controller-bound active Project.");
}

process.stdout.write(
  JSON.stringify({
    discovered: true,
    toolCount: names.length,
    projectId: read.result.structuredContent.projectId,
  }),
);