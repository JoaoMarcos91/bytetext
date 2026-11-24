(function (root) {
  "use strict";

  const formats = ["base64", "hex", "binary"];
  const hexTable = Array.from({ length: 256 }, (_, value) => value.toString(16).padStart(2, "0").toUpperCase());
  const binaryTable = Array.from({ length: 256 }, (_, value) => value.toString(2).padStart(8, "0"));
  const prefix = "BYTETEXTO/1|";

  function encode(bytes, format) {
    if (!formats.includes(format)) throw new Error("Formato de codificação desconhecido.");
    const parts = [];

    if (format === "base64") {
      const blockSize = 24576; // Múltiplo de 3: evita padding entre blocos.
      for (let offset = 0; offset < bytes.length; offset += blockSize) {
        const chunk = bytes.subarray(offset, offset + blockSize);
        parts.push(btoa(String.fromCharCode(...chunk)));
      }
    } else {
      const table = format === "hex" ? hexTable : binaryTable;
      const blockSize = 16384;
      for (let offset = 0; offset < bytes.length; offset += blockSize) {
        const end = Math.min(offset + blockSize, bytes.length);
        const entries = new Array(end - offset);
        for (let index = offset; index < end; index++) {
          entries[index - offset] = table[bytes[index]];
        }
        parts.push(entries.join(""));
      }
    }

    return parts.join("");
  }

  function decode(content, format, allowEmpty = false) {
    if (!formats.includes(format)) throw new Error("Formato de codificação desconhecido.");
    const text = content.replace(/\s+/g, "");
    if (text.length === 0) {
      if (allowEmpty) return new Uint8Array(0);
      throw new Error("Cole um conteúdo codificado antes de continuar.");
    }

    if (format === "hex") {
      if (!/^[0-9a-fA-F]+$/.test(text)) throw new Error("Hexadecimal inválido: use apenas 0–9 e A–F.");
      if (text.length % 2 !== 0) throw new Error("Hexadecimal incompleto: cada byte precisa de dois caracteres.");
      const bytes = new Uint8Array(text.length / 2);
      for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(text.slice(i * 2, i * 2 + 2), 16);
      return bytes;
    }

    if (format === "binary") {
      if (!/^[01]+$/.test(text)) throw new Error("Binário inválido: use apenas 0 e 1.");
      if (text.length % 8 !== 0) throw new Error("Binário incompleto: cada byte precisa de oito dígitos.");
      const bytes = new Uint8Array(text.length / 8);
      for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(text.slice(i * 8, i * 8 + 8), 2);
      return bytes;
    }

    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(text) || text.length % 4 === 1) {
      throw new Error("Base64 inválido: confira os caracteres e o conteúdo copiado.");
    }
    let raw;
    try { raw = atob(text); }
    catch { throw new Error("Base64 inválido ou incompleto."); }
    const bytes = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
    return bytes;
  }

  function pack(content, format, name, type) {
    if (!formats.includes(format)) throw new Error("Formato de codificação desconhecido.");
    const header = ["BYTETEXTO/1", format, encodeURIComponent(name), encodeURIComponent(type || "application/octet-stream")].join("|");
    return header + "\n" + content;
  }

  function unpack(text) {
    if (!text.startsWith(prefix)) return null;
    const newline = text.indexOf("\n");
    if (newline < 0) throw new Error("Cabeçalho incompleto: falta o conteúdo do arquivo.");
    const header = text.slice(0, newline).replace(/\r$/, "");
    const fields = header.split("|");
    if (fields.length !== 4 || fields[0] !== "BYTETEXTO/1" || !formats.includes(fields[1])) {
      throw new Error("Cabeçalho do ByteTexto inválido.");
    }
    let name, type;
    try {
      name = decodeURIComponent(fields[2]);
      type = decodeURIComponent(fields[3]);
    } catch {
      throw new Error("Cabeçalho inválido: nome ou tipo danificado.");
    }
    return { format: fields[1], name: name || "arquivo.bin", type: type || "application/octet-stream", content: text.slice(newline + 1) };
  }

  function safeName(name) {
    const safe = String(name || "").replace(/[\x00-\x1f<>:"/\\|?*]/g, "_").trim();
    return safe && safe !== "." && safe !== ".." ? safe.slice(0, 255) : "arquivo.bin";
  }

  function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    const sizes = ["KB", "MB", "GB", "TB"];
    let index = -1;
    do { bytes /= 1024; index++; } while (bytes >= 1024 && index < sizes.length - 1);
    return `${bytes.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} ${sizes[index]}`;
  }

  function estimatedSize(bytes, format) {
    if (format === "base64") return Math.ceil(bytes / 3) * 4;
    return bytes * (format === "hex" ? 2 : 8);
  }

  const api = { encode, decode, pack, unpack, safeName, formatBytes, estimatedSize };
  root.ByteTextoCodec = api;
  if (typeof module === "object" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
