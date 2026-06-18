const numberValue = (value) => {
  if (typeof value === "number") return value;
  const source = String(value ?? "").trim().replace(/\s/g, "");
  if (!source) return 0;
  const normalized = source.includes(",")
    ? source.replace(/\./g, "").replace(",", ".")
    : source;
  return Number(normalized.replace(/[^\d.-]/g, "")) || 0;
};

const makeItem = ({ description, quantity = 1, unit = "cad", unitPrice = 0 }) => ({
  description: String(description || "").trim(),
  id: crypto.randomUUID(),
  quantity: numberValue(quantity) || 1,
  unit: String(unit || "cad").trim(),
  unitPrice: numberValue(unitPrice),
});

const unitPattern = "m²|m2|m³|m3|mq|mc|ml|kg|ton|t|h|ore|cad|cadauno|nr|n\\.|pz|a corpo|%";
const ignoredLine = /^(computo|elenco prezzi|prezzo|quantit|unit[aà]|descrizione|totale|riporto|pagina|codice)\b/i;

const parseTextLine = (line) => {
  const clean = line.replace(/\s+/g, " ").trim();
  if (!clean || ignoredLine.test(clean)) return null;
  const match = clean.match(new RegExp(`^(.*?)\\s+(${unitPattern})\\s+([\\d.,]+)(?:\\s+([\\d.,]+))?(?:\\s+[\\d.,]+)?$`, "i"));
  if (!match) return null;
  const description = match[1].replace(/^\s*(?:\d+[.)-]?|[A-Z]?\d+(?:\.\d+)+)\s+/, "").trim();
  if (description.length < 3) return null;
  return makeItem({ description, unit: match[2], quantity: match[3], unitPrice: match[4] || 0 });
};

const linesToItems = (lines) => {
  const items = [];
  lines.forEach((line) => {
    const parsed = parseTextLine(line);
    if (parsed) items.push(parsed);
    else if (items.length && line.length > 5 && !ignoredLine.test(line) && !/[\d.,]+\s*$/.test(line)) {
      items[items.length - 1].description += ` ${line.trim()}`;
    }
  });
  return items;
};

const normalizeCode = (prefix, numericPart) => {
  const digits = numericPart.toUpperCase().replace(/O/g, "0");
  return `${prefix.toUpperCase()}.${digits.padStart(2, "0")}`;
};

const codeFromLine = (line) => {
  const clean = line.replace(/\s+/g, " ").trim();
  const dotted = clean.match(/^(?:\d+\s+)?([A-Z]{1,3})\s*[.·-]\s*([O0-9]{2})\b/i);
  if (dotted) return { code: normalizeCode(dotted[1], dotted[2]), rest: clean.slice(dotted[0].length).trim() };
  const compact = clean.length < 28 ? clean.match(/^(?:\d+\s+)?([A-Z]{1,3})\s*([O0-9]{2})\b/i) : null;
  return compact ? { code: normalizeCode(compact[1], compact[2]), rest: clean.slice(compact[0].length).trim() } : null;
};

const summaryValues = (line) => {
  const normalized = line.replace(/\|/g, " ").replace(/\s+/g, " ").trim();
  const unitMatch = normalized.match(new RegExp(`(a\\s+corpo|${unitPattern})`, "i"));
  const values = normalized.match(/-?\d+(?:[.,]\d+)?/g) || [];
  return {
    quantity: values.length ? numberValue(values.at(-1)) : 1,
    unit: unitMatch?.[1]?.replace(/\s+/g, " ") || "cad",
  };
};

const nonDescriptionLine = (line) => {
  const clean = line.replace(/\s+/g, " ").trim();
  if (!clean || /^(?:\d+|RIPORTO|A RIPORTARE|COMPUTO METRICO|COMMITTENTE|OGGETTO|CANTIERE|DIMENSIONI|IMPORTI|Num\.?|Ord\.?|CAP\.|LAVORI|Parziale|TOTALE|NOTE)\b/i.test(clean)) return true;
  const numericTokens = clean.match(/-?\d+(?:[.,]\d+)?/g) || [];
  const letterCount = (clean.match(/[A-Za-zÀ-ÿ]/g) || []).length;
  return numericTokens.length >= 2 && letterCount < 70;
};

const parseComputoBlocks = (lines) => {
  const items = [];
  let current = null;

  const finalize = (summaryLine) => {
    if (!current) return;
    const values = summaryLine ? summaryValues(summaryLine) : { quantity: 1, unit: "cad" };
    const description = current.descriptionParts.join(" ").replace(/\s+/g, " ").trim();
    items.push(makeItem({
      description: description ? `${current.code} - ${description}` : current.code,
      quantity: values.quantity || 1,
      unit: values.unit,
      unitPrice: 0,
    }));
    current = null;
  };

  lines.forEach((rawLine) => {
    const line = rawLine.replace(/\s+/g, " ").trim();
    if (!line) return;
    const detectedCode = codeFromLine(line);
    if (detectedCode) {
      finalize();
      current = { code: detectedCode.code, descriptionParts: [] };
      if (detectedCode.rest && !nonDescriptionLine(detectedCode.rest)) current.descriptionParts.push(detectedCode.rest);
      return;
    }
    if (!current) return;
    if (/SOM+ANO/i.test(line)) {
      finalize(line);
      return;
    }
    if (!nonDescriptionLine(line)) current.descriptionParts.push(line);
  });
  finalize();
  return items;
};

export const parseComputoText = (text) => {
  const lines = String(text || "").split(/\r?\n/);
  const blockItems = parseComputoBlocks(lines);
  return blockItems.length >= 2 ? blockItems : linesToItems(lines);
};

const recognizeSources = async (sources, onProgress = () => {}) => {
  const { createWorker } = await import("tesseract.js");
  let currentSource = 0;
  const worker = await createWorker("ita", 1, {
    logger: ({ progress, status }) => {
      const overall = (currentSource + (Number(progress) || 0)) / sources.length;
      onProgress({ progress: overall, status });
    },
  });
  await worker.setParameters({ preserve_interword_spaces: "1" });
  const lines = [];
  try {
    for (currentSource = 0; currentSource < sources.length; currentSource += 1) {
      const source = typeof sources[currentSource] === "function" ? await sources[currentSource]() : sources[currentSource];
      const result = await worker.recognize(source);
      lines.push(...result.data.text.split(/\r?\n/));
      if (typeof HTMLCanvasElement !== "undefined" && source instanceof HTMLCanvasElement) { source.width = 1; source.height = 1; }
    }
  } finally {
    await worker.terminate();
  }
  onProgress({ progress: 1, status: "completed" });
  return parseComputoText(lines.join("\n"));
};

const parsePdf = async (file, onProgress) => {
  const [{ getDocument, GlobalWorkerOptions }, { default: pdfWorker }] = await Promise.all([
    import("pdfjs-dist"),
    import("pdfjs-dist/build/pdf.worker.min.mjs?url"),
  ]);
  GlobalWorkerOptions.workerSrc = pdfWorker;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const pdf = await getDocument({ data: bytes }).promise;
  const lines = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const rows = [];
    content.items.forEach((item) => {
      const x = item.transform?.[4] || 0;
      const y = item.transform?.[5] || 0;
      let row = rows.find((candidate) => Math.abs(candidate.y - y) < 3);
      if (!row) { row = { y, cells: [] }; rows.push(row); }
      row.cells.push({ text: item.str, x });
    });
    rows.sort((a, b) => b.y - a.y).forEach((row) => {
      lines.push(row.cells.sort((a, b) => a.x - b.x).map((cell) => cell.text).join(" "));
    });
  }

  const items = linesToItems(lines);
  if (items.length) return { items, usedOcr: false };

  const pageSources = Array.from({ length: pdf.numPages }, (_, index) => async () => {
    const pageNumber = index + 1;
    onProgress?.({ progress: index / pdf.numPages, status: `Preparazione pagina ${pageNumber}` });
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const canvasContext = canvas.getContext("2d", { willReadFrequently: true });
    await page.render({ canvas, canvasContext, viewport }).promise;
    return canvas;
  });
  return { items: await recognizeSources(pageSources, onProgress), usedOcr: true };
};

const headerAliases = {
  description: ["descrizione", "voce", "lavorazione", "articolo", "designazione"],
  quantity: ["quantita", "qta", "quantità"],
  unit: ["unita", "unità", "u.m", "um", "misura"],
  unitPrice: ["prezzo unitario", "costo unitario", "prezzo", "costo"],
};

const normalizeHeader = (value) => String(value ?? "").toLowerCase().replace(/[àá]/g, "a").replace(/[^a-z0-9.%]+/g, " ").trim();
const findColumn = (headers, aliases) => headers.findIndex((header) => aliases.some((alias) => header === normalizeHeader(alias) || header.includes(normalizeHeader(alias))));

const rowsToItems = (rows) => {
  const headerIndex = rows.slice(0, 20).findIndex((row) => {
    const headers = row.map(normalizeHeader);
    return findColumn(headers, headerAliases.description) >= 0 && findColumn(headers, headerAliases.quantity) >= 0;
  });
  if (headerIndex < 0) return rows.map((row) => parseTextLine(row.join(" "))).filter(Boolean);
  const headers = rows[headerIndex].map(normalizeHeader);
  const descriptionIndex = findColumn(headers, headerAliases.description);
  const quantityIndex = findColumn(headers, headerAliases.quantity);
  const unitIndex = findColumn(headers, headerAliases.unit);
  const priceIndex = findColumn(headers, headerAliases.unitPrice);
  return rows.slice(headerIndex + 1).map((row) => {
    const description = row[descriptionIndex];
    if (!String(description ?? "").trim()) return null;
    return makeItem({ description, quantity: row[quantityIndex], unit: unitIndex >= 0 ? row[unitIndex] : "cad", unitPrice: priceIndex >= 0 ? row[priceIndex] : 0 });
  }).filter(Boolean);
};

const parseCsv = (text) => {
  const delimiter = text.split("\n", 1)[0].includes(";") ? ";" : ",";
  return text.split(/\r?\n/).filter(Boolean).map((line) => {
    const cells = [];
    let cell = "";
    let quoted = false;
    for (let index = 0; index < line.length; index += 1) {
      const char = line[index];
      if (char === '"') quoted = !quoted;
      else if (char === delimiter && !quoted) { cells.push(cell.trim()); cell = ""; }
      else cell += char;
    }
    cells.push(cell.trim());
    return cells;
  });
};

export async function importComputoFile(file, onProgress = () => {}) {
  if (file.size > 25 * 1024 * 1024) throw new Error("Il file supera 25 MB. Riducilo o dividilo in più parti.");
  const extension = file.name.split(".").pop()?.toLowerCase();
  let items = [];
  let usedOcr = false;
  if (extension === "pdf") {
    const result = await parsePdf(file, onProgress);
    items = result.items;
    usedOcr = result.usedOcr;
  }
  else if (extension === "xlsx") {
    const { default: readXlsxFile } = await import("read-excel-file/browser");
    items = rowsToItems(await readXlsxFile(file));
  }
  else if (extension === "csv") items = rowsToItems(parseCsv(await file.text()));
  else if (["png", "jpg", "jpeg", "webp"].includes(extension)) {
    items = await recognizeSources([file], onProgress);
    usedOcr = true;
  }
  else throw new Error("Formato non supportato. Usa PDF, XLSX, CSV, JPG oppure PNG.");
  if (!items.length) throw new Error("Non ho riconosciuto righe del computo. Controlla che il file contenga descrizione, unità e quantità.");
  return { fileName: file.name.replace(/\.[^.]+$/, ""), items, usedOcr };
}
