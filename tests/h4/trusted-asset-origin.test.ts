import {describe,expect,it} from "vitest";
import {isLoopbackHostname,resolveTrustedAssetBaseUrl} from "@/lib/server/trusted-asset-origin";

describe("H4 trusted asset origin",()=>{
  it("accepts only literal loopback hostnames by default",()=>{
    expect(isLoopbackHostname("localhost")).toBe(true);
    expect(isLoopbackHostname("localhost.")).toBe(true);
    expect(isLoopbackHostname("127.0.0.1")).toBe(true);
    expect(isLoopbackHostname("127.42.0.9")).toBe(true);
    expect(isLoopbackHostname("[::1]")).toBe(true);
    expect(isLoopbackHostname("192.168.1.20")).toBe(false);
    expect(isLoopbackHostname("localhost.example.com")).toBe(false);
  });

  it("defaults internal assets to loopback and respects an explicit local PORT",()=>{
    expect(resolveTrustedAssetBaseUrl({})).toBe("http://127.0.0.1:3000");
    expect(resolveTrustedAssetBaseUrl({PORT:"4312"})).toBe("http://127.0.0.1:4312");
  });

  it("accepts explicit loopback origins and rejects attacker-shaped origins",()=>{
    expect(resolveTrustedAssetBaseUrl({VIDEO_OS_ASSET_BASE_URL:"http://localhost:4100"})).toBe("http://localhost:4100");
    expect(resolveTrustedAssetBaseUrl({VIDEO_OS_ASSET_BASE_URL:"http://127.8.9.10:4200"})).toBe("http://127.8.9.10:4200");
    expect(()=>resolveTrustedAssetBaseUrl({VIDEO_OS_ASSET_BASE_URL:"ftp://127.0.0.1:3000"})).toThrow(/http or https/u);
    expect(()=>resolveTrustedAssetBaseUrl({VIDEO_OS_ASSET_BASE_URL:"http://user:pass@127.0.0.1:3000"})).toThrow(/credentials/u);
    expect(()=>resolveTrustedAssetBaseUrl({VIDEO_OS_ASSET_BASE_URL:"http://127.0.0.1:3000/api"})).toThrow(/origin only/u);
    expect(()=>resolveTrustedAssetBaseUrl({VIDEO_OS_ASSET_BASE_URL:"http://127.0.0.1:3000/?x=1"})).toThrow(/origin only/u);
  });

  it("blocks remote asset origins unless the dedicated opt-in flag is enabled",()=>{
    expect(()=>resolveTrustedAssetBaseUrl({VIDEO_OS_ASSET_BASE_URL:"http://192.168.1.20:3000"})).toThrow(/blocked by default/u);
    expect(()=>resolveTrustedAssetBaseUrl({VIDEO_OS_ASSET_BASE_URL:"https://renderer.example.test:8443"})).toThrow(/blocked by default/u);
    expect(resolveTrustedAssetBaseUrl({VIDEO_OS_ASSET_BASE_URL:"https://renderer.example.test:8443",VIDEO_OS_ALLOW_REMOTE_ASSET_ORIGIN:"1"})).toBe("https://renderer.example.test:8443");
  });

  it("fails closed for an invalid fallback PORT",()=>{
    expect(()=>resolveTrustedAssetBaseUrl({PORT:"0"})).toThrow(/Invalid PORT/u);
    expect(()=>resolveTrustedAssetBaseUrl({PORT:"70000"})).toThrow(/Invalid PORT/u);
    expect(()=>resolveTrustedAssetBaseUrl({PORT:"not-a-port"})).toThrow(/Invalid PORT/u);
  });
});
