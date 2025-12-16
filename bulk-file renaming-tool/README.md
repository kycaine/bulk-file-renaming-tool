# Bulk File Renaming Tool
## Overview

Bulk File Renaming Tool is a smart and fast application for mass file renaming.
It can run as an Electron Desktop App or as a Web App in the browser.

The tool is designed to help users clean up, standardize, and organize large numbers of files efficiently.
## 🚀 Quick Start

### Desktop App (Electron)
```bash
npm install
npm start
```
Features

This application allows you to:

✓ Automatically detect patterns in file names
✓ Give users full control over renaming rules
✓ Generate new filenames using flexible templates
✓ Preview results before applying changes
✓ Manage and reuse rename template presets
✓ [NEW] Rename files directly on disk (Electron mode)
✓ Export rename results to CSV

Ideal For

Data analysts

Programmers & developers

Researchers

Content creators

Anyone who needs to organize files in bulk

Folder Structure
Core Files

Main application UI.
Uses element IDs compatible with main.js.

📁 main.js

Main application controller responsible for:

Loading files

Auto-detecting filename patterns

Generating rename rules

Applying template-based renaming

Previewing rename results

Integrating with other modules

📁 modules/

Core application modules:

renameEngine.js

Applies template-based renaming

Uses detected filename patterns

Handles:

Incrementing numbers

Date normalization

Custom segments

presetManager.js

Save and load rename template presets

Uses browser localStorage

📁 utils/

Supporting utility modules:

patternDetector.js

Analyzes filenames and detects patterns such as:

Dates

Sequential numbers

Separated segments

Common prefixes

Common suffixes

Automatically extracts filename segments.

dateParser.js

Parses various date formats, including:

YYYY-MM-DD

DD_MM_YYYY

20240902

report_01 Sept 2024

Converts all detected dates into a standardized format.

⭐ Key Features
1. Select Files

✔ Select multiple files at once
✔ Folder picker support (via File System Access API)
✔ Handles hundreds of files without crashing

2. Auto Pattern Detection

The app automatically analyzes patterns across all filenames.

Example input:

export-output-2024-09-01-asdqwe
export-output-2024-09-02-12ddsa
export-output-2024-09-03-gdsa21

Detected patterns:

Prefix: export-output-

Date: 2024-09-XX

Unique trailing segment

Consistent overall format

3. Rename Template Engine

Users can define rename templates such as:

covid19-case-@{date}
report-@{param1}
@{param1}-@{param2}
image-@{param1}-@{param2}.jpg

4. Live Rename Preview

Instantly preview rename results:

old-file-name-A.txt → new-name-01.txt
old-file-name-B.txt → new-name-02.txt


No files are modified until the user confirms.

5. Export & Download Renamed Files

(Optional feature – can be added if needed)

Files can be downloaded individually using the new filenames.

6. Preset Manager

Users can:

Save rename templates

Load previously saved templates

Switch between presets easily

Example presets:

“Date Cleanup”

“SEO Filename Standardizer”

“Data Science File Normalizer”

7. Fully Offline

All features run 100% offline, including:

Pattern detection

Renaming logic

Template engine

No server, no uploads, and no cloud dependency.