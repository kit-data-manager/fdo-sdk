import type {
    Completion,
    CompletionContext,
    CompletionResult,
    CompletionSource,
} from "@codemirror/autocomplete"

type MemberKind = "method" | "property"

function method(label: string, signature: string, info: string): Completion {
    return { label, type: "method", detail: signature, info }
}

function property(label: string, info: string): Completion {
    return { label, type: "property", info }
}

const RECORD_MEMBERS: Completion[] = [
    method(
        "addProfile",
        "(profile, values?)",
        "Attaches a profile to the record. The values object maps the profile's attribute names to plain values, keep()/skip() markers or reference()/referenceBidi() markers.",
    ),
    method(
        "set",
        "(attribute, value)",
        "Sets the value of an attribute, identified by its PID or attribute object.",
    ),
    method(
        "get",
        "(attribute)",
        "Returns the value of an attribute, if present.",
    ),
    method(
        "has",
        "(attribute)",
        "Whether the record holds a value for the attribute.",
    ),
    method("remove", "(attribute)", "Removes the attribute from the record."),
    method(
        "addReference",
        "(fromAttribute, toRecord)",
        "Adds a unidirectional reference to another record (by local ID, PID or record object).",
    ),
    method(
        "addReferenceBidi",
        "(fromAttribute, toAttribute, toRecord)",
        "Adds a bidirectional reference: build() writes the back-reference under toAttribute on the target record.",
    ),
    property("PID", "The PID of the record — assigned when it is published."),
    method(
        "getAll",
        "()",
        "All attributes as a Map from attribute PID to value.",
    ),
    method(
        "getProfiles",
        "()",
        "The PIDs of all profiles attached to the record.",
    ),
    method("getReferences", "()", "All reference declarations of the record."),
    method("toJSON", "()", "The record as a plain JSON object."),
    method("toString", "()", "Human-readable representation of the record."),
]

const GRAPH_MEMBERS: Completion[] = [
    method("addRecord", "(record)", "Adds a record to the graph."),
    method(
        "removeRecord",
        "(id)",
        "Removes a record from the graph by local ID or PID.",
    ),
    method("getRecord", "(id)", "Looks up a record by local ID or PID."),
    method(
        "findRecord",
        "(predicate)",
        "Returns the first record for which the predicate returns true.",
    ),
    method("getRecords", "()", "All records of the graph."),
    method(
        "build",
        "()",
        "Executes all recorded references: every target receives its back-reference.",
    ),
    method("toJSON", "()", "The graph as an array of plain JSON objects."),
    method("toString", "()", "Human-readable representation of the graph."),
]

const PROFILE_MEMBERS: Completion[] = [
    method(
        "mapPIDToAttributeName",
        "(pid)",
        "The readable attribute name a profile maps an attribute PID to.",
    ),
    method(
        "mapAttributeNameToPID",
        "(name)",
        "The attribute PID a profile maps a readable name to.",
    ),
]

const CONTEXT_MEMBERS: Completion[] = [
    method(
        "newRecord",
        "(localID)",
        "Creates a fresh record with the given local ID and adds it to the mapping's local graph.",
    ),
    method(
        "resolveRemoteGraph",
        "(resolver)",
        "Resolves the currently published records of the mapping into the context, so build() can diff against them.",
    ),
    method(
        "build",
        "()",
        "Builds the mapping result: create/update graphs and the PIDs to delete.",
    ),
    property(
        "remoteGraph",
        "The currently published records of the mapping, as a read-only graph.",
    ),
    property(
        "localGraph",
        "The local graph the mapping fills with newRecord().",
    ),
    property(
        "hasResolvedRemoteGraph",
        "Whether resolveRemoteGraph() has run for this context.",
    ),
]

const BACKEND_MEMBERS: Completion[] = [
    method(
        "publishGraph",
        "(graph)",
        "Publishes every record of the graph: PIDs are assigned, references are fixed up.",
    ),
    method(
        "publishRecord",
        "(record)",
        "Publishes a single record and returns it with its PID.",
    ),
    method(
        "publishContinuous",
        "(mappingResult)",
        "Publishes the create/update records of a mapping result, deletes the listed PIDs and maintains the high level mapping record.",
    ),
    method(
        "resolveRecord",
        "(id)",
        "Resolves a published record by PID or local ID.",
    ),
    method(
        "resolveMappingRecords",
        "(mappingPID)",
        "Resolves all published records of a mapping, highest level record first.",
    ),
    method(
        "getAllRecords",
        "()",
        "Playground only: all records the store currently holds — the state shown as the published graph.",
    ),
]

const MAPPING_RESULT_MEMBERS: Completion[] = [
    property(
        "create",
        "Graph of records that are new in the remote graph and will be published.",
    ),
    property(
        "update",
        "Graph of records that already exist in the remote graph and will be republished.",
    ),
    property(
        "delete",
        "PIDs that are no longer part of the mapping and will be deleted.",
    ),
    property(
        "mappingPID",
        "The PID of the high level FDO record of the mapping.",
    ),
]

const CLASS_MEMBERS: Record<string, Completion[]> = {
    ConcreteLocalFDORecord: RECORD_MEMBERS,
    ConcreteFDORecord: RECORD_MEMBERS,
    ConcreteProfile: PROFILE_MEMBERS,
    LocalFDOGraph: GRAPH_MEMBERS,
    PublishedFDOGraph: GRAPH_MEMBERS,
    ContinuousMappingContext: CONTEXT_MEMBERS,
    LocalTestingBackend: BACKEND_MEMBERS,
    PlaygroundBackend: BACKEND_MEMBERS,
}

const CLASS_CONSTRUCTORS: Completion[] = [
    {
        label: "ConcreteLocalFDORecord",
        type: "class",
        detail: "(localID)",
        info: "A locally created FDO record. addProfile(), set() and the addReference() methods fill it; publishing assigns its PID.",
    },
    {
        label: "ConcreteFDORecord",
        type: "class",
        detail: "(pid)",
        info: "An FDO record identified by an existing PID.",
    },
    {
        label: "ConcreteProfile",
        type: "class",
        detail: "({ pid, readableName, mapping })",
        info: 'A profile: bundles attribute PIDs under readable names, e.g. mapping: { name: "attr/name" }.',
    },
    {
        label: "LocalFDOGraph",
        type: "class",
        detail: "()",
        info: "A graph of locally created records. addRecord() collects them, build() executes their references.",
    },
    {
        label: "ContinuousMappingContext",
        type: "class",
        detail: "(mappingPID)",
        info: "The context of one continuous mapping: newRecord() fills the local graph, build() diffs it against the remote graph.",
    },
    {
        label: "LocalTestingBackend",
        type: "class",
        detail: "()",
        info: "The in-memory backend that stands in for a real PID service. All instances share one store; resetStore() clears it.",
    },
    {
        label: "PlaygroundBackend",
        type: "class",
        detail: "()",
        info: "The playground's instrumented testing backend: publishes into the shared store, tracks every record and emits store events for the log and the published graph.",
    },
]

const FUNCTION_COMPLETIONS: Completion[] = [
    {
        label: "keep",
        type: "function",
        detail: "()",
        info: "Profile value marker: keep the previous value of this attribute when updating a record.",
    },
    {
        label: "skip",
        type: "function",
        detail: "()",
        info: "Profile value marker: do not store this attribute, even though the profile declares it.",
    },
    {
        label: "reference",
        type: "function",
        detail: "(target)",
        info: "Profile value marker: stores a unidirectional reference to the target record instead of a value.",
    },
    {
        label: "referenceBidi",
        type: "function",
        detail: "(inverseAttribute, target)",
        info: "Profile value marker: stores a bidirectional reference — build() writes the back-reference under inverseAttribute on the target.",
    },
]

const MODULE_EXPORTS: Record<string, Completion[]> = {
    "@fdo-sdk/primitives": [
        ...CLASS_CONSTRUCTORS.filter((c) =>
            [
                "ConcreteLocalFDORecord",
                "ConcreteFDORecord",
                "ConcreteProfile",
                "LocalFDOGraph",
            ].includes(c.label),
        ),
        ...FUNCTION_COMPLETIONS,
    ],
    "@fdo-sdk/mapping": CLASS_CONSTRUCTORS.filter((c) =>
        ["ContinuousMappingContext", "LocalTestingBackend"].includes(c.label),
    ),
    "@fdo-sdk/playground": CLASS_CONSTRUCTORS.filter(
        (c) => c.label === "PlaygroundBackend",
    ),
}

const STATIC_PLAYGROUND_MEMBERS: Completion[] = [
    method(
        "resetStore",
        "()",
        "Removes all published records from the shared store and clears the playground's PID tracking.",
    ),
    method(
        "onStoreChange",
        "(listener)",
        "Subscribes to store events (created/updated/deleted records); returns an unsubscribe function.",
    ),
]

const STATIC_BACKEND_MEMBERS: Completion[] = [
    method(
        "resetStore",
        "()",
        "Removes all published records from the shared store, e.g. between test runs.",
    ),
]

const VALUE_TYPE_COMPLETIONS: Record<string, Completion[]> = {
    record: RECORD_MEMBERS,
    graph: GRAPH_MEMBERS,
    profile: PROFILE_MEMBERS,
    context: CONTEXT_MEMBERS,
    backend: BACKEND_MEMBERS,
    mappingResult: MAPPING_RESULT_MEMBERS,
    publishedRecord: [
        ...RECORD_MEMBERS,
        property(
            "PID",
            "The globally unique identifier of the published record.",
        ),
    ],
}

const CLASS_OF_VALUE: Record<string, string> = {
    ConcreteLocalFDORecord: "record",
    ConcreteFDORecord: "record",
    ConcreteProfile: "profile",
    LocalFDOGraph: "graph",
    PublishedFDOGraph: "graph",
    ContinuousMappingContext: "context",
    LocalTestingBackend: "backend",
    PlaygroundBackend: "backend",
}

const IDENTIFIER = "[A-Za-z_$][\\w$]*"

const VAR_PATTERNS: { pattern: RegExp; type: string }[] = [
    {
        pattern: new RegExp(
            `\\b(?:const|let|var)\\s+(${IDENTIFIER})\\s*=\\s*new\\s+(${IDENTIFIER})\\b`,
            "g",
        ),
        type: "class",
    },
    {
        pattern: new RegExp(
            `\\b(?:const|let|var)\\s+(${IDENTIFIER})\\s*=\\s*(?:await\\s+)?(${IDENTIFIER})\\.publish(?:Graph|Record|Continuous)\\(`,
            "g",
        ),
        type: "published",
    },
    {
        pattern: new RegExp(
            `\\b(?:const|let|var)\\s+(${IDENTIFIER})\\s*=\\s*(?:await\\s+)?(${IDENTIFIER})\\.resolveRecord\\(`,
            "g",
        ),
        type: "publishedRecord",
    },
    {
        pattern: new RegExp(
            `\\b(?:const|let|var)\\s+(${IDENTIFIER})\\s*=\\s*(?:await\\s+)?(${IDENTIFIER})\\.resolveMappingRecords\\(`,
            "g",
        ),
        type: "publishedRecords",
    },
    {
        pattern: new RegExp(
            `\\b(?:const|let|var)\\s+(${IDENTIFIER})\\s*=\\s*(${IDENTIFIER})\\.newRecord\\(`,
            "g",
        ),
        type: "record",
    },
    {
        pattern: new RegExp(
            `\\b(?:const|let|var)\\s+(${IDENTIFIER})\\s*=\\s*(${IDENTIFIER})\\.build\\(\\)`,
            "g",
        ),
        type: "build",
    },
]

function valueTypeOfClass(name: string): string | undefined {
    return CLASS_OF_VALUE[name]
}

function inferReceiverType(
    receiver: string,
    receiverTypes: Map<string, string>,
): string | undefined {
    const known = receiverTypes.get(receiver)
    if (known !== undefined) return known
    if (receiver === "PlaygroundBackend") return "staticPlayground"
    if (receiver === "LocalTestingBackend") return "staticBackend"
    return undefined
}

function inferVariableTypes(code: string): Map<string, string> {
    const types = new Map<string, string>()
    for (const { pattern, type } of VAR_PATTERNS) {
        pattern.lastIndex = 0
        for (const match of code.matchAll(pattern)) {
            const variable = match[1]!
            const source = match[2]!
            switch (type) {
                case "class":
                    {
                        const valueType = valueTypeOfClass(source)
                        if (valueType) types.set(variable, valueType)
                    }
                    break
                case "published":
                    types.set(
                        variable,
                        source.endsWith("publishRecord")
                            ? "publishedRecord"
                            : "graph",
                    )
                    break
                case "publishedRecord":
                    types.set(variable, "publishedRecord")
                    break
                case "publishedRecords":
                    types.set(variable, "publishedRecords")
                    break
                case "record":
                    types.set(variable, "record")
                    break
                case "build":
                    if (types.get(source) === "context") {
                        types.set(variable, "mappingResult")
                    } else if (types.get(source) === "graph") {
                        types.set(variable, "graph")
                    }
                    break
            }
        }
    }
    return types
}

function optionsFor(type: string): Completion[] {
    switch (type) {
        case "staticPlayground":
            return STATIC_PLAYGROUND_MEMBERS
        case "staticBackend":
            return STATIC_BACKEND_MEMBERS
        case "publishedRecords":
            return []
        default:
            return VALUE_TYPE_COMPLETIONS[type] ?? []
    }
}

export const sdkCompletionSource: CompletionSource = (
    context: CompletionContext,
): CompletionResult | null => {
    const before = context.matchBefore(/[\w$.]*/)
    if (!before) return null
    const text = context.state.doc.sliceString(before.from, before.to)

    const member = text.match(new RegExp(`^(${IDENTIFIER})\\.(\\w*)$`))
    if (member) {
        const code = context.state.doc.sliceString(0, before.from)
        const receiverTypes = inferVariableTypes(code)
        const type = inferReceiverType(member[1]!, receiverTypes)
        if (!type) return null
        const options = optionsFor(type)
        if (options.length === 0) return null
        return {
            from: before.to - member[2]!.length,
            options,
            validFor: /^\w*$/,
        }
    }

    if (text === "" || /^[A-Za-z_$][\w$]*$/.test(text)) {
        const code = context.state.doc.sliceString(0, before.from)
        const importSpecifiers = new Set(
            [...code.matchAll(/from\s+"(@fdo-sdk\/[\w-]+)"/g)].map(
                (match) => match[1]!,
            ),
        )
        const options = [...importSpecifiers]
            .flatMap((specifier) => MODULE_EXPORTS[specifier] ?? [])
            .concat(
                importSpecifiers.has("@fdo-sdk/playground")
                    ? STATIC_PLAYGROUND_MEMBERS.filter(
                          (member) => member.label !== "getAllRecords",
                      )
                    : [],
            )
        if (options.length === 0) return null
        return {
            from: before.to - text.length,
            options,
            validFor: /^[A-Za-z_$][\w$]*$/,
        }
    }

    return null
}
