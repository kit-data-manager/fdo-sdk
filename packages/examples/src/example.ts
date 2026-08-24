import { Attribute } from "@fdo-sdk/primitives"
import { ConcreteRecord } from "@fdo-sdk/primitives"

const testAttr: Attribute<string> = {
    pid: "test/testAttr",
} as const

const record = new ConcreteRecord("LOCAL/testing")

record.addAttribute(testAttr, "test")
