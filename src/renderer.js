document.addEventListener("DOMContentLoaded", () => {
  // Initialize these at the top
  let currentZoom = 1;
  let currentRotation = 0;
  let currentImage = null;
  let isRendering = false;
  let editor;
  let dragCounter = 0;

  // Get DOM elements
  const dropZone = document.getElementById("dropZone");
  const preview = document.getElementById("preview");
  const previewControls = document.getElementById("previewControls");
  const zoomInBtn = document.getElementById("zoomIn");
  const zoomOutBtn = document.getElementById("zoomOut");
  const rotateBtn = document.getElementById("rotate");
  const statusText = document.getElementById("statusText");
  const statusSpinner = document.getElementById("statusSpinner");
  const dragOverlay = document.getElementById("dragOverlay");
  const exportBtn = document.getElementById("export");

  // Configure Monaco loader
  require.config({ paths: { vs: "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.47.0/min/vs" } });

  // Define ZPL language
  const ZPL_LANGUAGE = {
    defaultToken: "",
    tokenizer: {
      root: [
        [/\^[A-Z]{2}/, "keyword"], // ZPL commands (^XX)
        [/\^[A-Z]+/, "type"], // Other ZPL instructions
        [/~[A-Z]{2}/, "string"], // Special commands (~XX)
        [/[\^][0-9]+/, "number"], // Numbers with ^ prefix
        [/[0-9]+/, "number"], // Numbers
        [/".*?"/, "string"], // Strings in quotes
        [/,/, "delimiter"], // Commas
      ],
    },
  };

  // Initialize Monaco
  require(["vs/editor/editor.main"], function () {
    // Move helper functions inside Monaco block
    function preventDefaults(e) {
      e.preventDefault();
      e.stopPropagation();
    }

    function highlight(e) {
      dropZone.classList.add("border-blue-500", "scale-102", "border-2", "bg-blue-50");
      dropZone.classList.remove("border-gray-300");
    }

    function unhighlight(e) {
      dropZone.classList.remove("border-blue-500", "scale-102", "bg-blue-50");
      dropZone.classList.add("border-gray-300");
    }

    function updateStatus(message, isLoading = false) {
      statusText.textContent = message;
      statusSpinner.classList.toggle("hidden", !isLoading);
    }

    function validateZPL(zpl) {
      if (!zpl.trim()) {
        throw new Error("Empty ZPL content");
      }
      if (!zpl.includes("^XA") || !zpl.includes("^XZ")) {
        throw new Error("Invalid ZPL format: Missing ^XA or ^XZ");
      }
      return true;
    }

    function updateImageTransform() {
      if (currentImage) {
        currentImage.style.transform = `scale(${currentZoom}) rotate(${currentRotation}deg)`;
      }
    }

    // Register ZPL language
    monaco.languages.register({ id: "zpl" });
    monaco.languages.setMonarchTokensProvider("zpl", ZPL_LANGUAGE);

    // Define custom Monaco themes to match DaisyUI
    monaco.editor.defineTheme("zeeply-light", {
      base: "vs",
      inherit: true,
      rules: [],
      colors: {
        "editor.background": "#f8f9fc", // Slightly lighter than bg-base-200
        "editor.foreground": "#1f2937", // text-base-content
        "editor.lineHighlightBackground": "#f1f5f9", // Subtle highlight
        "editorLineNumber.foreground": "#94a3b8", // Muted text
        "editorIndentGuide.background": "#e2e8f0", // Subtle guides
        "editor.selectionBackground": "#bfdbfe", // Light blue selection
      },
    });

    monaco.editor.defineTheme("zeeply-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [],
      colors: {
        "editor.background": "#1d232a", // Matches DaisyUI dark theme bg-base-200
        "editor.foreground": "#a6adbb", // text-base-content in dark
        "editor.lineHighlightBackground": "#191e24", // Subtle highlight
        "editorLineNumber.foreground": "#64748b", // Muted text
        "editorIndentGuide.background": "#2d3640", // Subtle guides
        "editor.selectionBackground": "#1e293b", // Dark blue selection
      },
    });

    // Create editor with custom theme
    editor = monaco.editor.create(document.getElementById("editor"), {
      value: "",
      language: "zpl",
      theme: document.body.getAttribute("data-theme") === "dark" ? "zeeply-dark" : "zeeply-light",
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      fontSize: 14,
      lineNumbers: "on",
      renderWhitespace: "selection",
      automaticLayout: true,
      padding: { top: 16, bottom: 16 },
    });

    // Add renderZPL function
    async function renderZPL(zpl) {
      if (isRendering) return;
      isRendering = true;
      updateStatus("Rendering ZPL...", true);

      try {
        // Labelary API accepts ZPL and returns a PNG image
        const response = await fetch("http://api.labelary.com/v1/printers/8dpmm/labels/4x6/0/", {
          method: "POST",
          headers: {
            Accept: "image/png",
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: zpl,
        });

        if (!response.ok) {
          throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }

        const blob = await response.blob();
        const imageUrl = URL.createObjectURL(blob);

        // Create and display the image
        const img = document.createElement("img");
        img.src = imageUrl;
        img.style.maxWidth = "100%";
        img.style.height = "auto";
        img.style.transition = "transform 0.3s ease";

        // Clear previous preview and add new image
        preview.innerHTML = "";
        preview.appendChild(img);

        // Show controls and store current image reference
        previewControls.style.display = "flex";
        currentImage = img;
        updateImageTransform();
        updateStatus("Ready");
      } catch (error) {
        console.error("Error rendering ZPL:", error);
        preview.innerHTML = `<p class="text-red-500">Error: ${error.message}</p>`;
        previewControls.style.display = "none";
        updateStatus(`Error: ${error.message}`);
      } finally {
        isRendering = false;
      }
    }

    // File handling functions
    function handleFiles(files) {
      const file = files[0];
      if (!file.name.toLowerCase().endsWith(".zpl")) {
        updateStatus("Error: Not a ZPL file");
        return;
      }

      // Add to recent files if it's a file from disk
      if (file.path) {
        window.electronAPI.addRecentFile(file.path);
      }

      const reader = new FileReader();

      reader.onload = function (e) {
        const text = e.target.result;
        try {
          validateZPL(text);
          editor.setValue(text); // Now editor is defined
          currentZoom = 1;
          currentRotation = 0;
          renderZPL(text);
        } catch (error) {
          updateStatus(`Error: ${error.message}`);
          preview.innerHTML = `<p class="text-red-500">Error: ${error.message}</p>`;
          previewControls.style.display = "none";
        }
      };

      reader.onerror = function () {
        updateStatus("Error: Failed to read file");
      };

      reader.readAsText(file);
    }

    async function openFile() {
      try {
        // Try electron dialog first (for menu File > Open)
        const filePath = await window.electronAPI.openFile();
        if (filePath) {
          const response = await fetch(`file://${filePath}`);
          const text = await response.text();
          validateZPL(text);
          editor.setValue(text);
          currentZoom = 1;
          currentRotation = 0;
          renderZPL(text);
          window.electronAPI.addRecentFile(filePath);
          return;
        }

        // If no file selected in dialog, fall back to browser file input (for click to browse)
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".zpl";
        input.style.display = "none";

        input.onchange = (e) => {
          if (e.target.files.length > 0) {
            handleFiles(e.target.files);
          }
        };

        document.body.appendChild(input);
        input.click();
        document.body.removeChild(input);
      } catch (error) {
        updateStatus(`Error: ${error.message}`);
      }
    }

    function handleDrop(e) {
      const dt = e.dataTransfer;
      const files = dt.files;
      handleFiles(files);
    }

    // Set up all event listeners
    dropZone.addEventListener("click", openFile);
    dropZone.addEventListener("drop", handleDrop, false);

    // Prevent default drag behaviors
    ["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
      dropZone.addEventListener(eventName, preventDefaults, false);
      document.body.addEventListener(eventName, preventDefaults, false);
    });

    // Highlight drop zone
    ["dragenter", "dragover"].forEach((eventName) => {
      dropZone.addEventListener(eventName, highlight, false);
    });

    ["dragleave", "drop"].forEach((eventName) => {
      dropZone.addEventListener(eventName, unhighlight, false);
    });

    // Window drag and drop
    document.body.addEventListener("dragenter", (e) => {
      dragCounter++;
      if (dragCounter === 1) {
        dragOverlay.classList.remove("hidden");
        setTimeout(() => dragOverlay.classList.remove("opacity-0"), 0);
      }
    });

    document.body.addEventListener("dragleave", (e) => {
      dragCounter--;
      if (dragCounter === 0) {
        dragOverlay.classList.add("opacity-0");
        setTimeout(() => dragOverlay.classList.add("hidden"), 200);
      }
    });

    document.body.addEventListener("drop", (e) => {
      e.preventDefault();
      dragCounter = 0;
      dragOverlay.classList.add("opacity-0");
      setTimeout(() => dragOverlay.classList.add("hidden"), 200);
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleFiles(files);
      }
    });

    // Preview controls
    zoomInBtn.addEventListener("click", () => {
      currentZoom = Math.min(currentZoom + 0.1, 3);
      updateImageTransform();
    });

    zoomOutBtn.addEventListener("click", () => {
      currentZoom = Math.max(currentZoom - 0.1, 0.1);
      updateImageTransform();
    });

    rotateBtn.addEventListener("click", () => {
      currentRotation = (currentRotation + 90) % 360;
      updateImageTransform();
    });

    // Menu handlers
    window.electronAPI.onMenuOpenFile(openFile);
    window.electronAPI.onMenuRotate(() => {
      currentRotation = (currentRotation + 90) % 360;
      updateImageTransform();
    });
    window.electronAPI.onMenuZoomIn(() => {
      currentZoom = Math.min(currentZoom + 0.1, 3);
      updateImageTransform();
    });
    window.electronAPI.onMenuZoomOut(() => {
      currentZoom = Math.max(currentZoom - 0.1, 0.1);
      updateImageTransform();
    });
    window.electronAPI.onMenuAbout(() => {
      alert("Zeeply - ZPL File Viewer\nVersion 1.0.0\n\nA simple tool to preview ZPL files.");
    });

    // Recent files handler
    window.electronAPI.onMenuOpenRecent((event, filePath) => {
      fetch(`file://${filePath}`)
        .then((response) => response.text())
        .then((text) => {
          try {
            validateZPL(text);
            editor.setValue(text);
            currentZoom = 1;
            currentRotation = 0;
            renderZPL(text);
          } catch (error) {
            updateStatus(`Error: ${error.message}`);
          }
        })
        .catch((error) => {
          updateStatus(`Error: Failed to load file - ${error.message}`);
        });
    });

    // Editor change listener
    editor.onDidChangeModelContent(() => {
      const zpl = editor.getValue();
      if (zpl) {
        renderZPL(zpl);
      }
    });

    // Add export functionality
    async function exportAsPng() {
      if (!currentImage) {
        updateStatus("Error: No image to export");
        return;
      }

      try {
        const filePath = await window.electronAPI.saveFile();
        if (filePath) {
          // Create a canvas to handle the rotation
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");

          // Set canvas size based on rotation
          if (currentRotation % 180 === 0) {
            canvas.width = currentImage.naturalWidth;
            canvas.height = currentImage.naturalHeight;
          } else {
            // Swap dimensions for 90/270 degree rotations
            canvas.width = currentImage.naturalHeight;
            canvas.height = currentImage.naturalWidth;
          }

          // Move to center of canvas and rotate
          ctx.translate(canvas.width / 2, canvas.height / 2);
          ctx.rotate((currentRotation * Math.PI) / 180);

          // Draw the image centered and rotated
          ctx.drawImage(
            currentImage,
            -currentImage.naturalWidth / 2,
            -currentImage.naturalHeight / 2,
            currentImage.naturalWidth,
            currentImage.naturalHeight
          );

          // Convert canvas to base64
          const base64data = canvas.toDataURL("image/png").split(",")[1];

          // Use Electron's IPC to save the file with base64 data
          await window.electronAPI.writeFile(filePath, base64data);
          updateStatus("Image exported successfully");
        }
      } catch (error) {
        updateStatus(`Error exporting image: ${error.message}`);
      }
    }

    // Add export button click handler
    exportBtn.addEventListener("click", exportAsPng);

    // Add export menu handler
    window.electronAPI.onMenuExport(exportAsPng);

    // Theme management
    function setTheme(theme) {
      if (theme === "system") {
        if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
          document.documentElement.classList.add("dark");
          document.body.setAttribute("data-theme", "dark");
          editor.updateOptions({ theme: "zeeply-dark" });
        } else {
          document.documentElement.classList.remove("dark");
          document.body.setAttribute("data-theme", "light");
          editor.updateOptions({ theme: "zeeply-light" });
        }
      } else if (theme === "dark") {
        document.documentElement.classList.add("dark");
        document.body.setAttribute("data-theme", "dark");
        editor.updateOptions({ theme: "zeeply-dark" });
      } else {
        document.documentElement.classList.remove("dark");
        document.body.setAttribute("data-theme", "light");
        editor.updateOptions({ theme: "zeeply-light" });
      }
    }

    // Initialize theme from electron store
    window.electronAPI.onThemeChange((event, theme) => {
      setTheme(theme);
    });

    // Listen for system theme changes
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
      // Only update if we're in system theme mode
      if (localStorage.getItem("theme") === "system") {
        setTheme("system");
      }
    });

    // Set initial theme
    setTheme(localStorage.getItem("theme") || "system");
  });
});
