import { describe, it, expect, vi, afterEach } from "vitest"
import { isPID, splitPID, PIDResolver } from "../src/index.js"
import type { Fetch } from "../src/resolver.js"

const handleResponse = () => ({
    responseCode: 1,
    handle: "21.T11981/be908bd1",
    values: [
        {
            index: 1,
            type: "URL",
            data: { format: "string", value: "https://example.com/data" },
            ttl: 86400,
            timestamp: "2024-01-01T00:00:00Z",
        },
        {
            index: 2,
            type: "21.T11148/076759916209e5d62bd5",
            data: {
                format: "string",
                value: "21.T11148/301c6f04763a16f0f72a",
            },
            ttl: 86400,
            timestamp: "2024-01-01T00:00:00Z",
        },
    ],
})

const ok = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
        status,
        headers: { "Content-Type": "application/json" },
    })

describe("isPID", () => {
    it("accepts a Handle-style PID", () => {
        expect(isPID("21.T11981/be908bd1")).toBe(true)
    })

    it("accepts a prefix without a dot", () => {
        expect(isPID("12855/f8df1e25-159e-4be1-aa55-a68f347c63e4")).toBe(true)
    })

    it("rejects strings that are not PIDs", () => {
        expect(isPID("")).toBe(false)
        expect(isPID("hello world")).toBe(false)
        expect(isPID("be908bd1")).toBe(false)
    })
})

describe("splitPID", () => {
    it("splits a PID at the first slash", () => {
        expect(splitPID("21.T11981/be908bd1")).toEqual({
            prefix: "21.T11981",
            suffix: "be908bd1",
        })
    })

    it("keeps a slash in the suffix", () => {
        expect(splitPID("12855/41/abc")).toEqual({
            prefix: "12855",
            suffix: "41/abc",
        })
    })

    it("returns undefined for a string that is not a PID", () => {
        expect(splitPID("not a pid")).toBeUndefined()
    })
})

describe("PIDResolver", () => {
    afterEach(() => {
        vi.restoreAllMocks()
    })

    it("resolves a PID to a Profile with the PID as its definition pid", async () => {
        const fetch: Fetch = vi.fn().mockResolvedValue(ok(handleResponse()))
        const resolver = new PIDResolver(fetch)
        const profile = await resolver.resolveProfile("21.T11981/be908bd1")
        expect(profile).toBeDefined()
        expect(profile!.def.pid).toBe("21.T11981/be908bd1")
        expect(fetch).toHaveBeenCalledWith(
            "https://hdl.handle.net/api/handles/21.T11981/be908bd1#resolve",
        )
    })

    it("maps PID-typed handle values and skips non-PID types", async () => {
        const resolver = new PIDResolver(
            vi.fn().mockResolvedValue(ok(handleResponse())),
        )
        const profile = await resolver.resolveProfile("21.T11981/be908bd1")
        expect(profile!.def.mapping).toEqual({
            "21.T11148/076759916209e5d62bd5": "21.T11148/076759916209e5d62bd5",
        })
    })

    it("maps attribute names to PIDs", async () => {
        const resolver = new PIDResolver(
            vi.fn().mockResolvedValue(ok(handleResponse())),
        )
        const profile = await resolver.resolveProfile("21.T11981/be908bd1")
        const mapped = profile!.mapAttributeNamesToPIDs({
            "21.T11148/076759916209e5d62bd5": "21.T11148/301c6f04763a16f0f72a",
        })
        expect(mapped.get("21.T11148/076759916209e5d62bd5")).toBe(
            "21.T11148/301c6f04763a16f0f72a",
        )
    })

    it("returns undefined for an invalid PID without fetching", async () => {
        const fetch = vi.fn()
        const resolver = new PIDResolver(fetch)
        await expect(
            resolver.resolveProfile("not a pid"),
        ).resolves.toBeUndefined()
        expect(fetch).not.toHaveBeenCalled()
    })

    it("caches resolved profiles per resolver instance", async () => {
        const fetch = vi.fn().mockResolvedValue(ok(handleResponse()))
        const resolver = new PIDResolver(fetch)
        await resolver.resolveProfile("21.T11981/be908bd1")
        const second = await resolver.resolveProfile("21.T11981/be908bd1")
        expect(fetch).toHaveBeenCalledTimes(1)
        expect(second).toBeDefined()
    })

    it("returns undefined when the handle API responds with an error", async () => {
        const resolver = new PIDResolver(vi.fn().mockResolvedValue(ok({}, 404)))
        await expect(
            resolver.resolveProfile("21.T11981/be908bd1"),
        ).resolves.toBeUndefined()
    })

    it("does not refetch a PID that failed to resolve", async () => {
        const fetch = vi.fn().mockResolvedValue(ok({}, 404))
        const resolver = new PIDResolver(fetch)
        await resolver.resolveProfile("21.T11981/be908bd1")
        await resolver.resolveProfile("21.T11981/be908bd1")
        expect(fetch).toHaveBeenCalledTimes(1)
    })

    it("returns undefined when fetching throws", async () => {
        const resolver = new PIDResolver(
            vi.fn().mockRejectedValue(new Error("network down")),
        )
        await expect(
            resolver.resolveProfile("21.T11981/be908bd1"),
        ).resolves.toBeUndefined()
    })

    it("returns undefined when the response contains no values", async () => {
        const resolver = new PIDResolver(
            vi.fn().mockResolvedValue(ok({ responseCode: 100 })),
        )
        await expect(
            resolver.resolveProfile("21.T11981/be908bd1"),
        ).resolves.toBeUndefined()
    })

    it("returns undefined when the response body is not JSON", async () => {
        const resolver = new PIDResolver(
            vi.fn().mockResolvedValue(
                new Response("<html>gateway</html>", {
                    status: 200,
                    headers: { "Content-Type": "text/html" },
                }),
            ),
        )
        await expect(
            resolver.resolveProfile("21.T11981/be908bd1"),
        ).resolves.toBeUndefined()
    })
})
