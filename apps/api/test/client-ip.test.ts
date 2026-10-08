import { describe, expect, it } from "vitest";
import { getClientIp } from "../src/lib/client-ip.ts";

describe("getClientIp", () => {
  it("trusts CF-Connecting-IP behind cloudflare", () => {
    const ip = getClientIp({
      headers: new Headers({ "CF-Connecting-IP": "203.0.113.7" }),
      remoteAddress: "10.0.0.1",
      trustProxy: "cloudflare",
    });
    expect(ip).toBe("203.0.113.7");
  });

  it("accepts IPv6 from the trusted header", () => {
    const ip = getClientIp({
      headers: new Headers({ "CF-Connecting-IP": "2001:db8::1" }),
      remoteAddress: "10.0.0.1",
      trustProxy: "cloudflare",
    });
    expect(ip).toBe("2001:db8::1");
  });

  it("ignores all forwarding headers when not trusted", () => {
    const ip = getClientIp({
      headers: new Headers({
        "CF-Connecting-IP": "203.0.113.7",
        "X-Forwarded-For": "198.51.100.9, 203.0.113.7",
      }),
      remoteAddress: "10.0.0.1",
      trustProxy: "none",
    });
    expect(ip).toBe("10.0.0.1");
  });

  it("falls back to the socket address when the trusted header is missing or invalid", () => {
    expect(
      getClientIp({ headers: new Headers(), remoteAddress: "10.0.0.1", trustProxy: "cloudflare" }),
    ).toBe("10.0.0.1");
    expect(
      getClientIp({
        headers: new Headers({ "CF-Connecting-IP": "not-an-ip" }),
        remoteAddress: "10.0.0.1",
        trustProxy: "cloudflare",
      }),
    ).toBe("10.0.0.1");
  });

  it("returns unknown when nothing usable is present", () => {
    expect(
      getClientIp({ headers: new Headers(), remoteAddress: undefined, trustProxy: "none" }),
    ).toBe("unknown");
    expect(
      getClientIp({ headers: new Headers(), remoteAddress: "not-an-ip", trustProxy: "none" }),
    ).toBe("unknown");
  });
});
