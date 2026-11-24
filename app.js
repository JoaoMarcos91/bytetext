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
  const compressFile = $("compressFile");
  const compressionResult = $("compressionResult");
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
  let decodingRun = 0;
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
    compressionResult.hidden = true;
    setStatus("encodeStatus", "");
    if (!selectedFile) return;

    const format = encodeFormat.value;
    const expected = codec.estimatedSize(selectedFile.size, format);
    $("encodeStats").textContent = "Codificando...";
    if (expected > 20 * 1024 * 1024) {
      setStatus("encodeStatus", "Arquivos grandes podem consumir bastante memória. O resultado pode demorar a aparecer.");
    }
    await new Promise((resolve) => setTimeout(resolve, 20));

    try {
      const source = new Uint8Array(await selectedFile.arrayBuffer());
      if (run !== encodingRun) return;
      const headerName = keepMetadata.checked ? selectedFile.name : "";
      const headerType = keepMetadata.checked ? selectedFile.type : "";
      const rawSize = codec.estimatedSize(source.length, format) +
        (keepMetadata.checked ? codec.pack("", format, headerName, headerType).length : 0);
      let payload = source;
      let usedCompression = false;
      let unsupported = false;

      if (compressFile.checked) {
        if (typeof CompressionStream === "undefined" || typeof DecompressionStream === "undefined") {
          unsupported = true;
        } else {
          const compressed = await codec.compress(source);
          if (run !== encodingRun) return;
          const compressedSize = codec.estimatedSize(compressed.length, format) +
            codec.pack("", format, headerName, headerType, "gzip").length;
          if (compressedSize < rawSize) {
            payload = compressed;
            usedCompression = true;
          }
        }
      }

      const content = codec.encode(payload, format);
      if (run !== encodingRun) return;
      const text = (keepMetadata.checked || usedCompression)
        ? codec.pack(content, format, headerName, headerType, usedCompression ? "gzip" : "none")
        : content;
      output.value = text;
      copyButton.disabled = false;
      $("encodeStats").textContent = `${text.length.toLocaleString("pt-BR")} caracteres · ${codec.formatBytes(source.length)} originais`;

      if (compressFile.checked) {
        compressionResult.hidden = false;
        if (unsupported) {
          $("compressionTitle").textContent = "GZIP indisponível neste navegador";
          $("compressionDetails").textContent = "O arquivo foi codificado sem compactação. Use um navegador atualizado para ativar o recurso.";
        } else if (usedCompression) {
          const percent = ((1 - text.length / rawSize) * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 });
          $("compressionTitle").textContent = `${percent}% menos caracteres`;
          $("compressionDetails").textContent = `Sem compactação: ${rawSize.toLocaleString("pt-BR")} · Com GZIP: ${text.length.toLocaleString("pt-BR")} caracteres. Os dados serão descompactados automaticamente.`;
        } else {
          $("compressionTitle").textContent = "Compactação não necessária";
          $("compressionDetails").textContent = "GZIP não reduziria o texto final. Foi mantida a versão menor, sem compactação.";
        }
      }
      if (source.length === 0) {
        setStatus("encodeStatus", "O arquivo está vazio. Apenas a identificação será exibida, se ativada.");
      }
    } catch (error) {
      if (run !== encodingRun) return;
      $("encodeStats").textContent = "Falha na conversão";
      setStatus("encodeStatus", "Não foi possível codificar esse arquivo. " + error.message, "error");
    }
  }

  encodeFormat.addEventListener("change", encodeSelectedFile);
  keepMetadata.addEventListener("change", encodeSelectedFile);
  compressFile.addEventListener("change", encodeSelectedFile);

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
    ++decodingRun;
    clearTimeout(decodeTimer);
    clearDownload();
    setStatus("decodeStatus", "");

    if (!decodeInput.value.trim()) {
      $("metadataHint").textContent = "Com a linha de identificação, o formato, a compactação e o nome serão reconhecidos automaticamente. Sem ela, informe o formato e o nome.";
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
        $("metadataHint").textContent = "Identificação reconhecida: formato e compactação detectados automaticamente.";
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
    decodeTimer = setTimeout(() => { void decodeContent(); }, 280);
  }

  async function decodeContent() {
    const run = decodingRun;
    clearDownload();
    const text = decodeInput.value.trimStart();
    if (!text.trim()) { setStatus("decodeStatus", ""); return; }
    try {
      const metadata = codec.unpack(text);
      const format = metadata ? metadata.format : decodeFormat.value;
      const payload = metadata ? metadata.content : text;
      let bytes = codec.decode(payload, format, Boolean(metadata));
      const compressed = metadata && metadata.compression === "gzip";
      if (compressed) {
        setStatus("decodeStatus", "Descompactando o arquivo...");
        bytes = await codec.decompress(bytes);
        if (run !== decodingRun) return;
      }
      const type = metadata ? metadata.type : "application/octet-stream";
      const blob = new Blob([bytes], { type });
      if (run !== decodingRun) return;
      fileUrl = URL.createObjectURL(blob);
      downloadButton.href = fileUrl;
      downloadButton.download = currentFileName();
      $("decodedStats").textContent = `${currentFileName()} · ${codec.formatBytes(bytes.length)}${compressed ? " · GZIP descompactado" : ""}`;
      downloadArea.hidden = false;
      decodeEmptyState.hidden = true;
      setStatus("decodeStatus", "Arquivo reconstruído com sucesso.", "success");
    } catch (error) {
      if (run !== decodingRun) return;
      setStatus("decodeStatus", error.message, "error");
    }
  }

  decodeInput.addEventListener("input", scheduleDecode);
  decodeFormat.addEventListener("change", scheduleDecode);
  window.addEventListener("beforeunload", clearDownload);
})();
