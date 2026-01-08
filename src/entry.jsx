import React from 'react';
import { createRoot } from 'react-dom/client';

// Preserve existing non-React logic by importing the original main script.
// main.js will attach event handlers to DOM elements (keeps logic unchanged).
import '../main.js';

// Mount a minimal React root so this becomes a React + Vite project.
const rootEl = document.createElement('div');
rootEl.id = 'react-root';
document.body.prepend(rootEl);

const root = createRoot(rootEl);
root.render(React.createElement('div', { style: { display: 'none' } }));

export default function App() {
  return null;
}
