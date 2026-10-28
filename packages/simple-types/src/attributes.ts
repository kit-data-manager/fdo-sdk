import type { Attribute } from "@fdo-sdk/primitives"
import { FDO_TYPES, LEGACY_TYPE_KEYS } from "./identifiers.js"

export const SIMPLE_ATTRIBUTES: {
    readonly OWNER: Attribute<string>
    readonly HELMHOLTZ_RESEARCH_FIELD: Attribute<string>
    readonly PROFILE: Attribute<string>
    readonly SOFTWARE_REPOSITORY_TYPE: Attribute<string>
    readonly SOFTWARE_LOCATION: Attribute<string>
    readonly SOFTWARE_LICENSE: Attribute<string>
    readonly README_LOCATION: Attribute<string>
    readonly DATA_OBJECT_LOCATION: Attribute<string>
    readonly DATA_OBJECT_LICENSE: Attribute<string>
    readonly MIME_TYPE: Attribute<string>
    readonly DOI: Attribute<string>
    readonly PUBLICATION_TITLE: Attribute<string>
    readonly PUBLICATION_CREATOR: Attribute<string | string[]>
    readonly VERSION: Attribute<string>
    readonly PUBLICATION_DATE: Attribute<string>
    readonly CREATION_DATE: Attribute<string>
    readonly IS_PART_OF: Attribute<string | string[]>
    readonly HAS_PART: Attribute<string>
    readonly CREATED_WITH_SOFTWARE: Attribute<string | string[]>
} = {
    OWNER: { pid: FDO_TYPES.OWNER, readableName: "Owner" },
    HELMHOLTZ_RESEARCH_FIELD: {
        pid: FDO_TYPES.HELMHOLTZ_RESEARCH_FIELD,
        readableName: "Helmholtz Research Field",
    },
    PROFILE: { pid: FDO_TYPES.PROFILE, readableName: "Profile" },
    SOFTWARE_REPOSITORY_TYPE: {
        pid: FDO_TYPES.SOFTWARE_REPOSITORY_TYPE,
        readableName: "Software Repository Type",
    },
    SOFTWARE_LOCATION: {
        pid: FDO_TYPES.SOFTWARE_LOCATION,
        readableName: "Software Location",
    },
    SOFTWARE_LICENSE: {
        pid: FDO_TYPES.SOFTWARE_LICENSE,
        readableName: "Software License",
    },
    README_LOCATION: {
        pid: FDO_TYPES.README_LOCATION,
        readableName: "README Location",
    },
    DATA_OBJECT_LOCATION: {
        pid: FDO_TYPES.DATA_OBJECT_LOCATION,
        readableName: "Data Object Location",
    },
    DATA_OBJECT_LICENSE: {
        pid: FDO_TYPES.DATA_OBJECT_LICENSE,
        readableName: "Data Object License",
    },
    MIME_TYPE: { pid: FDO_TYPES.MIME_TYPE, readableName: "MIME Type" },
    DOI: { pid: FDO_TYPES.DOI, readableName: "DOI" },
    PUBLICATION_TITLE: {
        pid: FDO_TYPES.PUBLICATION_TITLE,
        readableName: "Publication Title",
    },
    PUBLICATION_CREATOR: {
        pid: FDO_TYPES.PUBLICATION_CREATOR,
        readableName: "Publication Creator",
    },
    VERSION: { pid: LEGACY_TYPE_KEYS.VERSION, readableName: "Version" },
    PUBLICATION_DATE: {
        pid: LEGACY_TYPE_KEYS.PUBLICATION_DATE,
        readableName: "Publication Date",
    },
    CREATION_DATE: {
        pid: LEGACY_TYPE_KEYS.CREATION_DATE,
        readableName: "Creation Date",
    },
    IS_PART_OF: {
        pid: FDO_TYPES.IS_PART_OF,
        readableName: "Is Part Of",
    },
    HAS_PART: {
        pid: FDO_TYPES.HAS_PART,
        readableName: "Has Part",
    },
    CREATED_WITH_SOFTWARE: {
        pid: FDO_TYPES.CREATED_WITH_SOFTWARE,
        readableName: "Created with Software",
    },
}
