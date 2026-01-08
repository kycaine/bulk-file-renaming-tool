import { parseDateFromName } from "../utils/dateParser.js";
export function applyRename(files, template) {
    const tentative = files.map((file, index) => {
        const original = file.name;

        const base = original.substring(0, original.lastIndexOf(".")) || original;
        const ext = original.substring(original.lastIndexOf(".")) || "";

        const parts = base.split(/[-_ ]+/);

        const params = {};
        let dateCounter = 0;

        parts.forEach((p, i) => {
            params[`param${i+1}`] = p;
            const parsed = parseDateFromName(p);
            if (parsed) {
                dateCounter++;
                params[`date${dateCounter}`] = p;
                params[`year${dateCounter}`] = parsed.year;
                params[`month${dateCounter}`] = parsed.month;
                params[`day${dateCounter}`] = parsed.day;
            }
        });

        params.counter = String(index + 1).padStart(3, "0");

        let newName = template.replace(/@param(\d+)/g, (_, n) => {
            return params[`param${n}`] || "";
        });

        newName = newName.replace(/@date(\d*)/gi, (_, n) => {
            const nn = n ? parseInt(n, 10) : 1;
            return params[`date${nn}`] || "";
        });

        newName = newName.replace(/@year(\d*)/gi, (_, n) => {
            const nn = n ? parseInt(n, 10) : 1;
            return params[`year${nn}`] || "";
        });

        newName = newName.replace(/@month(\d*)/gi, (_, n) => {
            const nn = n ? parseInt(n, 10) : 1;
            return params[`month${nn}`] || "";
        });

        newName = newName.replace(/@day(\d*)/gi, (_, n) => {
            const nn = n ? parseInt(n, 10) : 1;
            return params[`day${nn}`] || "";
        });

        newName = newName.replace(/@counter/gi, params.counter);

        return {
            old: original,
            new: newName + ext
        };
    });

    const used = new Set();
    const final = tentative.map(item => {
        let newName = item.new;
        const dot = newName.lastIndexOf('.');
        const base = dot !== -1 ? newName.slice(0, dot) : newName;
        const ext = dot !== -1 ? newName.slice(dot) : '';

        let counter = 1;
        while (used.has(newName)) {
            newName = `${base} (${counter})${ext}`;
            counter++;
        }

        used.add(newName);
        return { old: item.old, new: newName };
    });

    return final;
}

function getExtension(name) {
    return name.substring(name.lastIndexOf("."));
}
