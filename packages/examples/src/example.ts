import {
    BaseProfile,
    CreepExperimentProfile,
    DataResourceProfile,
    creepExperimentAttributes,
} from "./generated/creepProfiles.js"
import { createMapping } from "@fdo-sdk/primitives"
import type { FDORecord } from "@fdo-sdk/primitives"
import { reference } from "@fdo-sdk/primitives"
import { skip } from "@fdo-sdk/primitives"
import experimentsData from "../assets/creep-experiments.json" with { type: "json" }

type Experiment = (typeof experimentsData)["creepExperiments"][number]
type DataFile = Experiment["dataResources"][number]

const context = createMapping("TEST/creep-experiments")

function addDataResource(record: FDORecord, file: DataFile) {
    record.addProfile(DataResourceProfile, {
        mimeType: file.mimeType,
        dataObjectLocation: file.dataObjectLocation,
        spdxLicense: file.spdxLicense,
        checksum: file.checksum,
    })
}

function addCreepExperiment(record: FDORecord, experiment: Experiment) {
    record.addProfile(BaseProfile, {
        FDO_profile: experiment.FDO_profile,
        creator: experiment.creator,
        creatorAffiliation: experiment.creatorAffiliation,
        dateCreated: experiment.dateCreated,
        dateModified: experiment.dateModified,
        keyword: experiment.keyword,
        name: experiment.name,
        description: experiment.description,
    })

    record.addProfile(CreepExperimentProfile, {
        applicableStandard: experiment.applicableStandard,
        testID: experiment.testID,
        specifiedTemperature: experiment.specifiedTemperature,
        initialStress: experiment.initialStress,
        testDuration: experiment.testDuration,
        percentageCreepExtension: experiment.percentageCreepExtension,
        SingleCrystalOrientation: experiment.SingleCrystalOrientation,
        hasData: experiment.dataResources.map((file) =>
            reference(
                creepExperimentAttributes.hasMetadata,
                `LOCAL/${file.id}`,
            ),
        ),
        hasMetadata: skip(),
        usesMaterial: experiment.usesMaterial,
    })
}

for (const experiment of experimentsData.creepExperiments) {
    for (const file of experiment.dataResources) {
        addDataResource(context.newRecord(`LOCAL/${file.id}`), file)
    }

    addCreepExperiment(context.newRecord(`LOCAL/${experiment.id}`), experiment)
}

for (const record of context.localGraph.getRecords()) {
    console.log(
        record.localID,
        "->",
        record
            .getProfiles()
            .map((profile) => profile.def.readableName)
            .join(", "),
    )
}
