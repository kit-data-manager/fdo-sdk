import type { FlavorAdapter } from "../../interfaces/index.js"
import {
    type FDORecord,
    ConcreteRecord,
    type LocalID,
} from "@fdo-sdk/primitives"

export type HandleRecord = {
    pid?: string | undefined
    values: HandleValue[]
}

export type HandleValue = {
    index: number
    type: string
    data: string
    ttl: number
    timestamp: number
}

export class HandleFlavor implements FlavorAdapter<HandleRecord> {
    async serializeRecord(input: HandleRecord): Promise<FDORecord> {
        // TODO Properly extract local ID
        const extractedLocalID = input.values.find(
            (value) => value.type === "LOCAL_ID",
        )
        let localID: LocalID

        if (
            extractedLocalID?.data === undefined ||
            !/LOCAL\/.*/.test(extractedLocalID.data)
        ) {
            localID = `EXTERNAL/${input.pid}` as LocalID
        } else {
            localID = extractedLocalID.data as LocalID
        }

        const record = new ConcreteRecord(localID, input.pid)

        for (const value of input.values) {
            if (!HandleFlavor.isValidPID(value.type)) continue
            record.set(value.type, value.data)
        }

        return record
    }

    async deserializeRecord(input: FDORecord): Promise<HandleRecord> {
        const handleRecord: HandleRecord = {
            pid: input.PID,
            values: [],
        }

        const entries = input.getAll().entries()
        let internalIndex = 1
        for (const entry of entries) {
            if (Array.isArray(entry[1])) {
                for (const value of entry[1]) {
                    handleRecord.values.push({
                        index: internalIndex++,
                        data: value,
                        type: entry[0],
                        // TODO handle timestamp and ttl
                        timestamp: Date.now(),
                        ttl: 0,
                    })
                }
            } else {
                handleRecord.values.push({
                    index: internalIndex++,
                    data: entry[1],
                    type: entry[0],
                    // TODO handle timestamp and ttl
                    timestamp: Date.now(),
                    ttl: 0,
                })
            }
        }

        return handleRecord
    }

    static isValidPID(text: string) {
        return RegExp("^([0-9A-Za-z])+.([0-9A-Za-z])+/([!-~])+$").test(text)
    }
}
