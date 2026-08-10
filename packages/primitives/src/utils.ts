export function toArray<T>(val: T | T[]): T[] {
    if (Array.isArray(val)) {
        return val
    } else {
        return [val]
    }
}
