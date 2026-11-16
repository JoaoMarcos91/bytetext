(function () {
  "use strict";

  const codec = window.ByteTextoCodec;
  const $ = (id) => document.getElementById(id);
  const encodeTab = $("encodeTab");
  const decodeTab = $("decodeTab");
  const encodePanel = $("encodePanel");
  const decodePanel = $("decodePanel");
  const fileInput = $("fileInput");
  const dropZone = $("dropZone");
  const fileDetails = $("fileDetails");
  const encodeFormat = $("encodeFormat");
  const keepMetadata = $("keepMetadata");
  const output = $("encodedOutput");
  const copyButton = $("copyButton");
  const decodeInput = $("decodeInput");
  const decodeFormat = $("decodeFormat");
  const decodeName = $("decodeName");
  const downloadArea = $("downloadArea");
  const downloadButton = $("downloadButton");
  const decodeEmptyState = $("decodeEmptyState");

  let selectedFile = null;
  let encodingRun = 0;
  let decodeTimer = null;
  let fileUrl = null;
  let nameFromHeader = false;
  let copyResetTimer = null;

  function setStatus(id, message, kind = "") {
    const element = $(id);
    element.textContent = message;
    element.className = "status-message" + (kind ? " is-" + kind : "");
  }

  function switchMode(mode) {
    const encoding = mode === "encode";
    encodePanel.hidden = !encoding;
    decodePanel.hidden = encoding;
    encodeTab.classList.toggle("is-active", encoding);
    decodeTab.classList.toggle("is-active", !encoding);
    encodeTab.setAttribute("aria-selected", String(encoding));
    decodeTab.setAttribute("aria-selected", String(!encoding));
    $("pageTitle").textContent = encoding ? "Transforme um arquivo em texto." : "Recupere seu arquivo a partir do texto.";
    $("pageDescription").textContent = encoding
      ? "Escolha um arquivo, selecione o formato e copie o texto gerado. Tudo acontece no seu navegador."
      : "Cole o conteúdo armazenado e baixe o arquivo reconstruído, sem enviar dados para um servidor.";
  }

  encodeTab.addEventListener("click", () => switchMode("encode"));
  decodeTab.addEventListener("click", () => switchMode("decode"));

  dropZone.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      fileInput.click();
    }
  });
  ["dragenter", "dragover"].forEach((eventName) => {
    dropZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      dropZone.classList.add("is-dragging");
    });
  });
  ["dragleave", "dragend"].forEach((eventName) => {
    dropZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      dropZone.classList.remove("is-dragging");
    });
  });
  dropZone.addEventListener("drop", (event) => {
    event.preventDefault();
    dropZone.classList.remove("is-dragging");
    if (event.dataTransfer.files.length) selectFile(event.dataTransfer.files[0]);
  });
  fileInput.addEventListener("change", () => {
    if (fileInput.files && fileInput.files.length) selectFile(fileInput.files[0]);
    fileInput.value = "";
  });
  $("replaceFileButton").addEventListener("click", () => fileInput.click());

  function selectFile(file) {
    selectedFile = file;
    fileDetails.hidden = false;
    $("selectedFileName").textContent = file.name;
    $("selectedFileSize").textContent = codec.formatBytes(file.size);
    encodeSelectedFile();
  }

  async function encodeSelectedFile() {
    const run = ++encodingRun;
    output.value = "";
    copyButton.disabled = true;
    setStatus("encodeStatus", "");
    if (!selectedFile) return;
    const format = encodeFormat.value;
    const expected = codec.estimatedSize(selectedFile.size, format);
    $("encodeStats").textContent = "Codificando...";
    if (expected > 20 * 1024 * 1024) {
      setStatus("encodeStatus", "O texto gerado será grande e poderá consumir bastante memória. Arquivos menores costumam funcionar melhor.");
    }
    // Permite que o navegador atualize a interface antes da conversão.
    await new Promise((resolve) => setTimeout(resolve, 20));
    try {
      const buffer = await selectedFile.arrayBuffer();
      if (run !== encodingRun) return;
      const content = codec.encode(new Uint8Array(buffer), format);
      if (run !== encodingRun) return;
      const text = keepMetadata.checked
        ? codec.pack(content, format, selectedFile.name, selectedFile.type)
        : content;
      output.value = text;
      copyButton.disabled = false;
      $("encodeStats").textContent = `${text.length.toLocaleString("pt-BR")} caracteres · ${codec.formatBytes(selectedFile.size)} originais`;
      if (selectedFile.size === 0) {
        setStatus("encodeStatus", "O arquivo está vazio. O texto terá somente o cabeçalho, se essa opção estiver ativada.");
      }
    } catch (error) {
      if (run !== encodingRun) return;
      $("encodeStats").textContent = "Falha na conversão";
      setStatus("encodeStatus", "Não foi possível ler ou codificar esse arquivo. " + error.message, "error");
    }
  }

  encodeFormat.addEventListener("change", encodeSelectedFile);
  keepMetadata.addEventListener("change", encodeSelectedFile);

  async function copyText() {
    if (copyButton.disabled) return;
    let copied = false;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(output.value);
        copied = true;
      }
    } catch { /* Tenta a alternativa abaixo. */ }

    if (!copied) {
      output.focus();
      output.select();
      try { copied = document.execCommand("copy"); }
      catch { copied = false; }
    }
    if (copied) {
      copyButton.textContent = "Copiado!";
      setStatus("encodeStatus", "Texto copiado para a área de transferência.", "success");
      clearTimeout(copyResetTimer);
      copyResetTimer = setTimeout(() => { copyButton.textContent = "Copiar texto"; }, 1800);
    } else {
      setStatus("encodeStatus", "Não foi possível copiar automaticamente. Selecione e copie o texto manualmente.", "error");
    }
  }
  copyButton.addEventListener("click", copyText);

  function clearDownload() {
    if (fileUrl) URL.revokeObjectURL(fileUrl);
    fileUrl = null;
    downloadButton.removeAttribute("href");
    downloadArea.hidden = true;
    decodeEmptyState.hidden = false;
  }

  function currentFileName() {
    return codec.safeName(decodeName.value);
  }

  function updateDownloadName() {
    downloadButton.download = currentFileName();
    if (!downloadArea.hidden) {
      const match = $("decodedStats").textContent.match(/ · (.*)$/);
      if (match) $("decodedStats").textContent = `${currentFileName()} · ${match[1]}`;
    }
  }
  decodeName.addEventListener("input", updateDownloadName);

  function scheduleDecode() {
    clearTimeout(decodeTimer);
    clearDownload();
    setStatus("decodeStatus", "");

    if (!decodeInput.value.trim()) {
      $("metadataHint").textContent = "Se o texto tiver a linha de identificação do ByteTexto, o formato e o nome serão reconhecidos automaticamente. Sem ela, informe o nome com a extensão correta.";
      if (nameFromHeader) decodeName.value = "arquivo.bin";
      nameFromHeader = false;
      return;
    }

    try {
      const metadata = codec.unpack(decodeInput.value.trimStart());
      if (metadata) {
        decodeFormat.value = metadata.format;
        decodeName.value = metadata.name;
        nameFromHeader = true;
        $("metadataHint").textContent = "Cabeçalho identificado: formato e nome preenchidos automaticamente.";
      } else {
        if (nameFromHeader) decodeName.value = "arquivo.bin";
        nameFromHeader = false;
        $("metadataHint").textContent = "Conteúdo sem cabeçalho: selecione o formato correto e informe o nome do arquivo com extensão.";
      }
    } catch (error) {
      setStatus("decodeStatus", error.message, "error");
      return;
    }
    setStatus("decodeStatus", "Lendo conteúdo...");
    decodeTimer = setTimeout(decodeContent, 280);
  }

  function decodeContent() {
    clearDownload();
    const text = decodeInput.value.trimStart();
    if (!text.trim()) { setStatus("decodeStatus", ""); return; }
    try {
      const metadata = codec.unpack(text);
      const format = metadata ? metadata.format : decodeFormat.value;
      const payload = metadata ? metadata.content : text;
      const bytes = codec.decode(payload, format, Boolean(metadata));
      const type = metadata ? metadata.type : "application/octet-stream";
      const blob = new Blob([bytes], { type });
      fileUrl = URL.createObjectURL(blob);
      downloadButton.href = fileUrl;
      updateDownloadName();
      $("decodedStats").textContent = `${currentFileName()} · ${codec.formatBytes(bytes.length)}`;
      downloadArea.hidden = false;
      decodeEmptyState.hidden = true;
      setStatus("decodeStatus", "Arquivo reconstruído com sucesso.", "success");
    } catch (error) {
      setStatus("decodeStatus", error.message, "error");
    }
  }

  decodeInput.addEventListener("input", scheduleDecode);
  decodeFormat.addEventListener("change", scheduleDecode);
  window.addEventListener("beforeunload", clearDownload);
})();
