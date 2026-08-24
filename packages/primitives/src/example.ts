import type { ProfileDefinition } from "./interfaces/index.js"
import { ConcreteProfile, ConcreteRecord } from "./impl/index.js"

const record = new ConcreteRecord("LOCAL/1")

type HMCProfileAttributes = {
    /** The name of the dataset described by this FDO */
    datasetName: string
    /** The authors of the work described by this FDO */
    authors: string | string[]
    /** Description for dateCreated */
    dateCreated?: string
}

const HMCProfileDefinition: ProfileDefinition<HMCProfileAttributes> = {
    pid: "jfisodf/gkfpgfk",
    readableName: "HMC Profile",
    mapping: {
        datasetName: "some/pid1",
        authors: "some/pid2",
        dateCreated: "some/pid3",
    },
}

const HMCProfile = new ConcreteProfile(HMCProfileDefinition)

record.addProfile(HMCProfile, {
    datasetName: "My Dataset",
    authors: ["orcid1", "orcid2"],
})
