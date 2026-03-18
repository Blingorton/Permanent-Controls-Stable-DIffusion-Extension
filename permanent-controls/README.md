# Permanent Controls — SD Reforge Extension

Adds **always-visible ⏹ Interrupt** and **⏭ Skip** buttons next to the
*"Apply all selected styles to prompts"* button, permanently — regardless of
whether Stable Diffusion thinks it is currently generating.

## The Problem This Solves

When using **Generate Forever**, or after a **page refresh** mid-generation,
the UI can get stuck showing the normal Generate button even while the backend
is actively generating. In this state, the temporary Interrupt/Skip buttons
never appear, leaving you with no way to stop the current run short of killing
the process.

## What This Extension Does

Injects two permanent buttons in the toolbar below the Generate button (in
both **txt2img** and **img2img** tabs). These buttons directly click the
underlying SD WebUI Interrupt/Skip elements — they always work, independently
of what the top Generate/Interrupt/Skip button cluster is showing.

## Installation

### Option A — Install from folder
1. Copy the `permanent-controls` folder into:
   ```
   <your SD Reforge directory>/extensions/permanent-controls/
   ```
2. Restart SD Reforge (or click *Extensions → Apply and restart UI*).

### Option B — Install via Extensions tab
1. In SD Reforge, go to **Extensions → Install from URL**.
2. Paste the path to this repo (if hosted on GitHub).
3. Click Install, then restart.

## File Structure

```
permanent-controls/
├── scripts/
│   └── permanent_controls.py   # Python entry point (loads the extension)
├── javascript/
│   └── permanent_controls.js   # Button injection logic
└── README.md
```

## Compatibility

- Stable Diffusion WebUI Reforge
- Should also work with AUTOMATIC1111 WebUI (same codebase)
- Gradio 3.x and 4.x

## Notes

- The buttons work by finding and clicking the hidden/inactive native
  Interrupt and Skip buttons that SD WebUI always renders in the DOM.
- No backend changes; purely a frontend injection.
- The MutationObserver ensures buttons survive Gradio tab switches and
  re-renders.
