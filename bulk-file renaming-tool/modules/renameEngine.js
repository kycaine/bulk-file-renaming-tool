import { parseDateFromName } from "../utils/dateParser.js";
export function applyRename(files, template) {
    return files.map((file, index) => {
        const original = file.name;

        const base = original.substring(0, original.lastIndexOf(".")) || original;
        const ext = original.substring(original.lastIndexOf(".")) || "";

        const parts = base.split(/[-_ ]+/);

        const params = {};

        parts.forEach((p, i) => {
            params[`param${i+1}`] = p;
        });

        params.counter = String(index + 1).padStart(3, "0");

const newName = template.replace(/@param(\d+)/g, (_, n) => {
            return params[`param${n}`] || "";
        }).replace(/@counter/g, params.counter);

        return {
            old: original,
            new: newName + ext
        };
    });
}



function getExtension(name) {
    return name.substring(name.lastIndexOf("."));
}
