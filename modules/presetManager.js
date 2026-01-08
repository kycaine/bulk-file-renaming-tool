export function savePreset(name, data) {
    const presets = JSON.parse(localStorage.getItem("presets") || "{}");
    presets[name] = data;
    localStorage.setItem("presets", JSON.stringify(presets));
}

export function loadPresets() {
    return JSON.parse(localStorage.getItem("presets") || "{}");
}
