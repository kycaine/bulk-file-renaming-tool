import { detectPattern } from "./utils/patternDetector.js";
import { parseDateFromName } from "./utils/dateParser.js";
import { applyRename } from "./modules/renameEngine.js";
import { savePreset, loadPresets } from "./modules/presetManager.js";

const ipcRenderer = window.electronAPI;

if (ipcRenderer === undefined) {
    console.error("IPC Renderer API is not available (Check preload.js)");
}

const btnSelectFolder = document.getElementById("btnSelectFolder");
const btnSelectFiles = document.getElementById("btnSelectFiles");
const btnClearFiles = document.getElementById("btnClearFiles");

const fileListContainer = document.getElementById("fileList");
const detectedSegmentsContainer = document.getElementById("detectedSegments");
const ruleBuilderContainer = document.getElementById("ruleBuilder");

const renameTemplateInput = document.getElementById("renameTemplate");
const btnApplyTemplate = document.getElementById("btnApplyTemplate");

const previewContainer = document.getElementById("previewList");

const btnRename = document.getElementById("btnRename");
const btnExport = document.getElementById("btnExport");

let currentFiles = [];
let detectedPattern = null;
let dynamicRules = [];
let renameRules = [];
let fileListExpanded = false;
const FILES_PREVIEW_COUNT = 3;

function splitNameTokens(filename, delimiter) {
    const nameNoExt = filename.replace(/\.[^/.]+$/, "");
    return nameNoExt.split(/[-_ ]+/); 
}

btnSelectFiles.addEventListener("click", async () => {
    const filePaths = await ipcRenderer.invoke('dialog:openFiles'); 
    
    if (filePaths && filePaths.length > 0) {
        const files = filePaths.map(path => {
            let name = path;
            const lastSlash = path.lastIndexOf('/');
            const lastBackslash = path.lastIndexOf('\\');
            const lastSeparator = Math.max(lastSlash, lastBackslash);
            
            if (lastSeparator !== -1) {
                name = path.substring(lastSeparator + 1);
            }

            return { 
                name: name, 
                path: path, 
                size: 0, 
                lastModified: Date.now() 
            };
        });
        
        addFiles(files);
    }
});

btnSelectFolder.addEventListener("click", async () => {
    const dirPaths = await ipcRenderer.invoke('dialog:openDirectory');
    
    if (dirPaths && dirPaths.length > 0) {
        const folderPath = dirPaths[0];
        
        const filesData = await ipcRenderer.invoke('file:readDirectory', folderPath);
        
        if (filesData && filesData.length > 0) {
            const files = filesData
                .filter(f => !f.isDirectory)
                .map(f => ({
                    name: f.name, 
                    path: f.path, 
                    size: f.size, 
                    lastModified: f.modified 
                }));
            
            addFiles(files);
        } else {
            alert("No files found in the selected folder.");
        }
    }
});


btnClearFiles.addEventListener("click", () => {
    currentFiles = [];
    detectedPattern = null;
    dynamicRules = [];
    renderFileList();
    detectedSegmentsContainer.innerHTML = "";
    ruleBuilderContainer.innerHTML = "";
    previewContainer.innerHTML = "";
    document.getElementById("selectedCount").textContent = "0";
    document.querySelectorAll(".template-line").forEach(el => el.remove());
});

btnRename.addEventListener("click", applyRenameAction);
btnExport.addEventListener("click", exportCSVAction);

function addFiles(files) {
    const newFiles = Array.from(files);
    currentFiles = [...currentFiles, ...newFiles];

    const uniqueFilesMap = new Map();
    currentFiles.forEach(file => {
        uniqueFilesMap.set(file.path || file.name, file); 
    });
    currentFiles = Array.from(uniqueFilesMap.values());
    
    fileListExpanded = false;
    renderFileList();
    analyzePattern();
}

function renderFileList() {
    const selectedCountEl = document.getElementById("selectedCount");
    if (selectedCountEl) selectedCountEl.textContent = currentFiles.length;

    fileListContainer.innerHTML = "";

    const header = document.createElement("div");
    header.className = "file-list-header";
    header.innerHTML = `<div class="muted">${currentFiles.length} file selected</div>`;

    if (currentFiles.length > FILES_PREVIEW_COUNT) {
        const btn = document.createElement("button");
        btn.className = "mini";
        btn.style.marginLeft = "8px";
        btn.textContent = fileListExpanded ? "Show less" : "View more";
        btn.addEventListener("click", () => {
            fileListExpanded = !fileListExpanded;
            renderFileList();
        });
        header.appendChild(btn);
    }

    fileListContainer.appendChild(header);

    const table = document.createElement("table");
    table.className = "file-table";
    table.setAttribute("aria-describedby", "fileList");
    table.innerHTML = `
        <thead>
          <tr>
            <th style="width:48px">#</th>
            <th>Filename</th>
            <th style="width:120px">Size</th>
            <th style="width:120px">Modified</th>
          </tr>
        </thead>
        <tbody></tbody>
    `;

    const tbody = table.querySelector("tbody");

    const countToShow = fileListExpanded ? currentFiles.length : Math.min(FILES_PREVIEW_COUNT, currentFiles.length);

    for (let i = 0; i < countToShow; i++) {
        const f = currentFiles[i];
        const tr = document.createElement("tr");
        const size = f.size ? (f.size / 1024).toFixed(1) : "-";
        const modified = f.lastModified ? new Date(f.lastModified).toLocaleString() : "-";
        tr.innerHTML = `
            <td>${i + 1}</td>
            <td class="filename">${f.name}</td>
            <td>${size} KB</td>
            <td>${modified}</td>
        `;
        tbody.appendChild(tr);
    }

    if (!fileListExpanded && currentFiles.length > FILES_PREVIEW_COUNT) {
        const moreTr = document.createElement("tr");
        const remaining = currentFiles.length - FILES_PREVIEW_COUNT;
        moreTr.innerHTML = `
            <td colspan="4" class="muted" style="text-align:right;padding:10px 8px;">And ${remaining} more — click View more to expand</td>
        `;
        tbody.appendChild(moreTr);
    }

    fileListContainer.appendChild(table);
}

function analyzePattern() {
    if (currentFiles.length === 0) {
        detectedPattern = null;
        renderDetectedSegments(); 
        return;
    }

    const filenames = currentFiles.map(file => file.name); 
    detectedPattern = detectPattern(filenames);
    renderDetectedSegments();
}

function renderDetectedSegments() {
    detectedSegmentsContainer.innerHTML = ""; 

    if (!detectedPattern) {
        detectedSegmentsContainer.innerHTML = "<p>No pattern detected</p>";
        return;
    }

    const exampleTokens = detectedPattern.tokens; 
    const dateIndex = detectedPattern.dateTokenIndex; 
    
    if (!detectedPattern.isUniform) {
        const fileCount = currentFiles.length;
        const minorityPercentage = ((detectedPattern.minorityCount / fileCount) * 100).toFixed(1);
        
        const warning = document.createElement('div');
        warning.className = 'pattern-warning';
        warning.style.cssText = 'padding: 10px; background: rgba(245,158,11,0.2); border: 1px solid #f59e0b; border-radius: 6px; margin-bottom: 16px; color: #f59e0b; font-size: 0.9em;';
        
        warning.innerHTML =
            `⚠️ **Inconsistent Pattern Detected** <br>` +
            `${detectedPattern.minorityCount} of ${fileCount} files (${minorityPercentage}%) have a different pattern. The system will use the dominant pattern shown below.`;
            
        detectedSegmentsContainer.appendChild(warning);
    }
    
    exampleTokens.forEach((tok, idx) => {
        const chip = document.createElement("div");
        chip.className = "segment-chip";
        
        let label = `@param${idx + 1}`;
        let chipStyle = ''; 
        
        if (idx === dateIndex) { 
            label = `@date`; 
            chipStyle = 'background-color: #7c3aed; color: #fff;'; 
        }

        chip.innerHTML = `
            <strong>${label}</strong>
            <div class="muted">${tok}</div>
        `;
        chip.style.cssText += chipStyle; 
        detectedSegmentsContainer.appendChild(chip);
    });
}

btnApplyTemplate.addEventListener("click", () => {
    if (!detectedPattern) return alert("Load files first.");

    const parts = [...document.querySelectorAll(".template-input")]
        .map(i => i.value.trim())
        .filter(v => v !== "");

    if (parts.length === 0) {
        alert("Template cannot be empty.");
        return;
    }

    const result = applyCustomTemplate(currentFiles, detectedPattern, parts);

    renderPreview(result);
});


function renderPreview(list) {
    previewContainer.innerHTML = "";

    const table = document.createElement("table");
    table.className = "preview-table";
    table.setAttribute("aria-describedby", "previewList");
    table.innerHTML = `
        <thead>
          <tr>
            <th style="width:48px">#</th>
            <th>Original Filename</th>
            <th>New Filename Preview</th>
          </tr>
        </thead>
        <tbody></tbody>
    `;

    const tbody = table.querySelector("tbody");

    list.forEach((item, index) => {
        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td>${index + 1}</td>
            <td class="old-name">${item.old}</td>
            <td class="new-name">${item.new}</td>
        `;

        tbody.appendChild(tr);
    });

    previewContainer.appendChild(table);
}

const btnRenameRules = document.getElementById("btnAddRule");

btnRenameRules.addEventListener("click", () => {
    ruleBuilderContainer.classList.toggle("open");

    if (dynamicRules.length === 0) {
        buildRuleBuilder();
    }
});

function buildRuleBuilder() {
    ruleBuilderContainer.innerHTML = "";

    const wrapper = document.createElement("div");
    wrapper.className = "rule-block";

    wrapper.innerHTML = `
        <h4>New Rename Rule</h4>

        <label>Find:</label>
        <input type="text" id="ruleFind" placeholder="substring / regex" autofocus>

        <label>Replace With:</label>
        <input type="text" id="ruleReplace" placeholder="new value">

        <button id="btnSaveRule">Save Rule</button>

        <div id="rulesList" style="margin-top:16px;"></div>
    `;

    ruleBuilderContainer.appendChild(wrapper);

    const firstInput = document.getElementById("ruleFind");
    if (firstInput) {
        firstInput.focus();
    }

    document.getElementById("btnSaveRule").addEventListener("click", () => {
        const find = document.getElementById("ruleFind").value.trim();
        const replace = document.getElementById("ruleReplace").value.trim();

        if (!find) {
            alert("Find cannot be empty");
            return;
        }

        renameRules.push({ find, replace });

        renderRenameRules();
        document.getElementById("ruleFind").value = "";
        document.getElementById("ruleReplace").value = "";
        document.getElementById("ruleFind").focus();
    });
}

function renderRenameRules() {
    const list = document.getElementById("rulesList");
    list.innerHTML = "";

    renameRules.forEach((rule, index) => {
        const div = document.createElement("div");
        div.className = "rule-item";

        div.innerHTML = `
            <div><strong>${rule.find}</strong> → ${rule.replace}</div>
            <button data-idx="${index}" class="deleteRuleBtn">×</button>
        `;

        list.appendChild(div);
    });

    document.querySelectorAll(".deleteRuleBtn").forEach(btn => {
        btn.addEventListener("click", e => {
            const idx = e.target.getAttribute("data-idx");
            renameRules.splice(idx, 1);
            renderRenameRules();
        });
    });
}

const templateBuilder = document.getElementById("templateBuilder");
const btnAddTemplateLine = document.getElementById("btnAddTemplateLine");

btnAddTemplateLine.addEventListener("click", () => {
    addTemplateInput("");
});

function addTemplateInput(value) {
    const line = document.createElement("div");
    line.className = "template-line";

    line.innerHTML = `
        <input class="template-input" value="${value}" placeholder="Type text, @date, @year, @month, atau @paramX" />
        <button class="delete-template-line">×</button>
    `;

    line.querySelector(".delete-template-line").addEventListener("click", () => {
        line.remove();
    });

    templateBuilder.appendChild(line);
    
    const input = line.querySelector(".template-input");
    if (input) {
        input.focus();
        input.select();
    }
}

function applyCustomTemplate(files, pattern, parts) {
    if (!files || files.length === 0 || !pattern) {
        return [];
    }
    
    const dateIndex = pattern.dateTokenIndex; 
    const dateToken = pattern.majorityDateToken; 

    return files.map((file) => {
        const tokens = splitNameTokens(file.name, pattern.delimiter);

        let newBaseName = parts.map(p => {
            if (p.startsWith("@param")) {
                const idx = parseInt(p.replace("@param", ""), 10) - 1;
                return tokens[idx] ?? "";
            }

            if (p === "@date") { 
                if (dateIndex !== -1) {
                    let fullToken = tokens[dateIndex] ?? dateToken ?? "";
                    
                    if (fullToken) {
                        
                        const dateMatch = fullToken.match(/^(\d{8})/);
                        
                        if (dateMatch && dateMatch[1]) {
                            return dateMatch[1]; 
                        }
                                                return fullToken;
                    }
                }
                return ""; 
            }
            
            return p;
        }).filter(Boolean).join(pattern.delimiter || "-");
        
        renameRules.forEach(rule => {
            newBaseName = newBaseName.replace(new RegExp(rule.find, 'g'), rule.replace);
        });

        const ext = file.name.substring(file.name.lastIndexOf("."));

        return {
            old: file.name,
            new: newBaseName + ext
        };
    });
}

async function applyRenameAction() {
    if (currentFiles.length === 0) {
        alert("Please select files first.");
        return;
    }

    const templateParts = [...document.querySelectorAll(".template-input")]
        .map(i => i.value.trim())
        .filter(v => v !== "");

    if (templateParts.length === 0 || !detectedPattern) {
        alert("Please apply a template first.");
        return;
    }
    
    const renameResults = applyCustomTemplate(currentFiles, detectedPattern, templateParts);
    const renameCount = renameResults.length;

    if (currentFiles[0] && currentFiles[0].path) {
        if (!confirm(`Are you sure you want to copy ${renameCount} files with new names to a folder? (Original files will not be changed)`)) {
            return;
        }

        try {
            const copies = [];
            let sourceFolderPath = '';
            
            for (let i = 0; i < renameCount; i++) {
                const file = currentFiles[i];
                const newName = renameResults[i].new;
                const oldPath = file.path;
                
                if (i === 0) {
                    const lastSlash = oldPath.lastIndexOf('/');
                    const lastBackslash = oldPath.lastIndexOf('\\');
                    const lastSeparator = Math.max(lastSlash, lastBackslash);
                    sourceFolderPath = oldPath.substring(0, lastSeparator);
                }
                
                copies.push({ oldPath, newName });
            }

            const result = await ipcRenderer.invoke('file:copyFilesToFolder', copies, sourceFolderPath);
            
            if (result.success) {
                let successCount = 0;
                let failedFiles = [];
                
                result.results.forEach(item => {
                    if (item.success) {
                        successCount++;
                    } else {
                        failedFiles.push(`${item.oldPath}: ${item.error}`);
                    }
                });

                if (failedFiles.length > 0) {
                    alert(`Copied ${successCount} files successfully to:\n${result.outputFolder}\n\nFailed files:\n${failedFiles.join('\n')}`);
                } else {
                    alert(`Successfully copied all ${successCount} files with new names!\n\nFolder: ${result.outputFolder}`);
                }
            } else {
                alert(`Error: ${result.error}`);
            }

            btnClearFiles.click();
        } catch (error) {
            alert(`Error during copy: ${error.message}`);
        }
    } else {
        if (!confirm(`Are you sure you want to compress and download ${renameCount} files with new names?`)) {
            return;
        }
        
        if (typeof JSZip === 'undefined') {
            alert("JSZip library not loaded. Cannot download ZIP in browser mode.");
            return;
        }
        
        const zip = new JSZip();

        for (let i = 0; i < renameCount; i++) {
            const file = currentFiles[i];
            const newName = renameResults[i].new;
            
            zip.file(newName, "Dummy content for web mode"); 
        }
        
        try {
            alert("Creating ZIP file... This may take a moment.");
            
            const content = await zip.generateAsync({ type: "blob" });
            
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const zipFileName = `rename-${timestamp}.zip`;

            const url = URL.createObjectURL(content);
            const a = document.createElement('a');
            a.href = url;
            a.download = zipFileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            alert(`Successfully created and downloaded ${zipFileName}.`);
            
        } catch (error) {
            console.error("ZIP Generation Error:", error);
            alert("Failed to create or download the ZIP file.");
        }
    }
}

function exportCSVAction() {
    if (currentFiles.length === 0) {
        alert("Please select files first.");
        return;
    }

    const templateParts = [...document.querySelectorAll(".template-input")]
        .map(i => i.value.trim())
        .filter(v => v !== "");
        
    if (templateParts.length === 0 || !detectedPattern) {
        alert("Please apply a template first.");
        return;
    }

    const renameResults = applyCustomTemplate(currentFiles, detectedPattern, templateParts);

    let csvContent = "Original Name,New Name\n";
    renameResults.forEach(item => {
        const oldName = item.old.includes(',') ? `"${item.old}"` : item.old;
        const newName = item.new.includes(',') ? `"${item.new}"` : item.new;
        csvContent += `${oldName},${newName}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rename_preview_' + new Date().toISOString().slice(0, 10) + '.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    alert("Rename preview exported to CSV.");
}