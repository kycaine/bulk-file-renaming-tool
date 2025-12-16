export function parseDateFromName(name) {
    const regex = /(\d{4})[-_](\d{2})[-_](\d{2})/;

    const match = name.match(regex);
    if (!match) return null;

    return {
        year: match[1],
        month: match[2],
        day: match[3],
        full: match[0]
    };
}
export function parseParams(filename, delimiter) {
    let nameOnly = filename.substring(0, filename.lastIndexOf("."));
    return nameOnly.split(delimiter);
}

