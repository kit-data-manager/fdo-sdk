import type { IProfileDefinition } from "./interfaces/index.js"
import { FDOProfile, FDORecord } from "./impl/index.js"

const record = new FDORecord("LOCAL/1")

type HMCProfileAttributes = {
    /** The name of the dataset described by this FDO */
    datasetName: string
    /** The authors of the work described by this FDO */
    authors: string | string[]
    /** Description for dateCreated */
    dateCreated?: string
}

const HMCProfileDefinition: IProfileDefinition<HMCProfileAttributes> = {
    pid: "jfisodf/gkfpgfk",
    mapping: {
        datasetName: "some/pid1",
        authors: "some/pid2",
        dateCreated: "some/pid3",
    },
}

const HMCProfile = new FDOProfile(HMCProfileDefinition)

record.addProfile(HMCProfile, {
    datasetName: "My Dataset",
    authors: ["orcid1", "orcid2"],
})
