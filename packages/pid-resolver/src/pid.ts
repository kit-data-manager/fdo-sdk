const PID_PATTERN = /^([0-9A-Za-z])+.([0-9A-Za-z])+\/([!-~])+$/

export function isPID(text: string): boolean {
    return PID_PATTERN.test(text)
}

export function splitPID(
    pid: string,
): { prefix: string; suffix: string } | undefined {
    if (!isPID(pid)) return undefined
    const firstSlash = pid.indexOf("/")
    return {
        prefix: pid.substring(0, firstSlash),
        suffix: pid.substring(firstSlash + 1),
    }
}
