import {
    BaseProfile,
    creepExperimentAttributes,
    CreepExperimentProfile,
    PublicationProfile,
} from "./creepProfiles"
import { createMapping } from "@fdo-sdk/primitives"
import { FDORecord } from "@fdo-sdk/primitives"
import { skip } from "@fdo-sdk/primitives"
import { keep } from "@fdo-sdk/primitives"
import { reference } from "@fdo-sdk/primitives"

const context = createMapping("TEST/mapping")

function mapping(file: File) {
    const record = context.newRecord(`LOCAL/${file.name}`)

    record.addProfile(BaseProfile, {
        creator: "orcid...",
        FDO_profile: BaseProfile.def.pid,
        creatorAffiliation: "KIT",
        dateCreated: "1.1.1970",
        name: "Test Dataset",
    })

    record.addProfile(PublicationProfile, {
        creator: keep(),
        doi: "...",
        dataCitePublicationType: "Thesis",
        datePublished: "http://...",
        publisher: "KIT Bib",
    })

    addCreepInfo(record, file)
}

function addCreepInfo(record: FDORecord, file: File) {
    record.addProfile(CreepExperimentProfile, {
        applicableStandard: "test",
        hasData: reference(
            creepExperimentAttributes.hasMetadata,
            "LOCAL/child",
        ),
        hasMetadata: skip(),
        initialStress: "10",
        percentageCreepExtension: "100%",
        SingleCrystalOrientation: "5deg",
        specifiedTemperature: "100°C",
        testDuration: "5 seconds",
        testID: "test",
        usesMaterial: "wood",
    })
}
