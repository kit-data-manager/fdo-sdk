import { ConcreteProfile } from "@fdo-sdk/primitives"
import type { Profile, ProfileDefinition } from "@fdo-sdk/primitives"
import { FDO_PROFILES, FDO_TYPES } from "./identifiers.js"

export type CoreProfileAttributes = {
    profile: string
    owner: string
    helmholtzResearchField: string
}

export type DataObjectProfileAttributes = {
    profile: string
    dataObjectLocation: string
    dataObjectLicense: string
    mimeType: string
}

export type SoftwareProfileAttributes = {
    profile: string
    softwareRepositoryType: string
    softwareLocation: string
    softwareLicense: string
    readmeLocation: string
}

export type PublicationProfileAttributes = {
    profile: string
    doi: string
    publicationTitle: string
    publicationCreator: string | string[]
}

const coreProfileDefinition: ProfileDefinition<CoreProfileAttributes> = {
    pid: FDO_PROFILES.CORE,
    readableName: "Simple Core Profile",
    mapping: {
        profile: FDO_TYPES.PROFILE,
        owner: FDO_TYPES.OWNER,
        helmholtzResearchField: FDO_TYPES.HELMHOLTZ_RESEARCH_FIELD,
    },
}

const dataObjectProfileDefinition: ProfileDefinition<DataObjectProfileAttributes> =
    {
        pid: FDO_PROFILES.DATA_OBJECT,
        readableName: "Simple Data Object Profile",
        mapping: {
            profile: FDO_TYPES.PROFILE,
            dataObjectLocation: FDO_TYPES.DATA_OBJECT_LOCATION,
            dataObjectLicense: FDO_TYPES.DATA_OBJECT_LICENSE,
            mimeType: FDO_TYPES.MIME_TYPE,
        },
    }

const softwareProfileDefinition: ProfileDefinition<SoftwareProfileAttributes> =
    {
        pid: FDO_PROFILES.SOFTWARE,
        readableName: "Simple Software Profile",
        mapping: {
            profile: FDO_TYPES.PROFILE,
            softwareRepositoryType: FDO_TYPES.SOFTWARE_REPOSITORY_TYPE,
            softwareLocation: FDO_TYPES.SOFTWARE_LOCATION,
            softwareLicense: FDO_TYPES.SOFTWARE_LICENSE,
            readmeLocation: FDO_TYPES.README_LOCATION,
        },
    }

const publicationProfileDefinition: ProfileDefinition<PublicationProfileAttributes> =
    {
        pid: FDO_PROFILES.PUBLICATION,
        readableName: "Simple Publication Profile",
        mapping: {
            profile: FDO_TYPES.PROFILE,
            doi: FDO_TYPES.DOI,
            publicationTitle: FDO_TYPES.PUBLICATION_TITLE,
            publicationCreator: FDO_TYPES.PUBLICATION_CREATOR,
        },
    }

export const SIMPLE_PROFILES: {
    readonly CORE: Profile<CoreProfileAttributes>
    readonly DATA_OBJECT: Profile<DataObjectProfileAttributes>
    readonly SOFTWARE: Profile<SoftwareProfileAttributes>
    readonly PUBLICATION: Profile<PublicationProfileAttributes>
} = {
    CORE: new ConcreteProfile(coreProfileDefinition),
    DATA_OBJECT: new ConcreteProfile(dataObjectProfileDefinition),
    SOFTWARE: new ConcreteProfile(softwareProfileDefinition),
    PUBLICATION: new ConcreteProfile(publicationProfileDefinition),
}
