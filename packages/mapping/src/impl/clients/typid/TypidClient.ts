const baseUrl = "https://typed-pid-maker.datamanager.kit.edu/preview"

export type TypidRecord = {
    pid: string
    entries: {
        [key: string]: {
            key: string
            name: string
            value: string
        }[]
    }
}

export class TypidClient {
    async fetchRecord(pid: string) {
        let req
        try {
            req = await fetch(`${baseUrl}/api/v1/pit/pid/${pid}`)
        } catch (error) {
            throw new Error("Unable to reach Typed PID Maker", { cause: error })
        }

        let data
        if (req.ok) {
            try {
                data = (await req.json()) as TypidRecord
            } catch (error) {
                throw new Error("Unable to fetch record, malformed response", {
                    cause: error,
                })
            }
        } else if (req.status === 404) {
            return undefined
        } else
            throw new Error(
                `Unable to fetch record, unknown status code ${req.status}`,
            )

        return data
    }

    async createRecord(
        entries: TypidRecord["entries"],
        dryrun: boolean = false,
    ) {
        let req
        try {
            req = await fetch(
                `${baseUrl}/api/v1/pit/pid/${dryrun ? "?dryrun=true" : ""}`,
                {
                    method: "POST",
                    body: JSON.stringify(entries),
                    headers: { "Content-Type": "application/json" },
                },
            )
        } catch (error) {
            throw new Error("Unable to reach Typed PID Maker", { cause: error })
        }

        let data
        if (req.ok) {
            try {
                data = (await req.json()) as TypidRecord
            } catch (error) {
                throw new Error("Unable to create record, malformed response", {
                    cause: error,
                })
            }
        } else if (req.status === 400) {
            let details
            try {
                details = await req.json()
                console.error(
                    "Unable to create record, validation failed.",
                    details,
                )
            } catch (_) {}
            throw new Error("Unable to create record, validation failed.", {
                cause: details,
            })
        } else
            throw new Error(
                `Unable to create record, unknown status code ${req.status}`,
            )

        return data
    }
}
