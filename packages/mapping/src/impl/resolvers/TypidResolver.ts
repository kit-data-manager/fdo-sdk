import {
    ConcreteFDORecord,
    PublishedFDOGraph,
    type PID,
    type PublishedFDORecord,
    type PublishedLocalFDORecord,
    type ReadOnlyFDOGraph,
    type ResolveAdapter,
} from "@fdo-sdk/primitives"
import { TypidClient, type TypidRecord } from "../clients/typid/TypidClient.js"

const typidClient = new TypidClient()

export class TypidResolver implements ResolveAdapter {
    async resolveMappingRecords(
        mappingPID: PID,
    ): Promise<ReadOnlyFDOGraph<PublishedLocalFDORecord>> {
        const graph = new PublishedFDOGraph<PublishedLocalFDORecord>()

        const rootRecord = await this.resolveRecord(mappingPID)
        if (!rootRecord) {
            throw new Error("Mapping record not found")
        }

        return graph
    }

    async resolveRecord(
        recordPID: PID,
    ): Promise<PublishedFDORecord | undefined> {
        let typidRecord
        try {
            typidRecord = await typidClient.fetchRecord(recordPID)
        } catch (e) {
            throw new Error("Could not fetch record", { cause: e })
        }

        if (typidRecord) {
            return this.typidRecordToPIDRecord(typidRecord)
        } else {
            return undefined
        }
    }

    private typidRecordToPIDRecord(
        typidRecord: TypidRecord,
    ): PublishedFDORecord {
        const record = new ConcreteFDORecord(
            typidRecord.pid,
        ) as PublishedFDORecord

        const attributes = Object.values(typidRecord.entries)
            .filter((entry) => entry.length > 0)
            .map((entry) => {
                const values = entry.map((value) => value.value)
                return { key: entry[0]!.key, value: values }
            })

        for (const attribute of attributes) {
            record.addAttribute(attribute.key, attribute.value)
        }

        return record
    }
}
