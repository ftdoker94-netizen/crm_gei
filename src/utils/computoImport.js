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

const unitPattern = "m²|m2|m³|m3|mq|mc|ml|kg|ton|h|ore|mese|mesi|giorno|giorni|settimana|settimane|anno|anni|cad|cadauno|nr|n\\.|pz|a corpo|%";
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
  let letters = prefix.toUpperCase().replace(/0/g, "O");
  if (letters.length === 3 && letters[0] === letters[1]) letters = letters.slice(1);
  else if (letters.length === 3 && letters[1] === letters[2]) letters = letters.slice(0, 2);
  const digits = numericPart.toUpperCase().replace(/O/g, "0").replace(/[IL]/g, "1");
  return `${letters}.${digits.padStart(2, "0")}`;
};

const codeFromLine = (line) => {
  const clean = line.replace(/\s+/g, " ").trim();
  const head = clean.slice(0, 40);
  const dotted = head.match(/^[^A-ZÀ-ÿ0-9]{0,12}(?:\d{1,2}\s+)?([A-Z0]{1,3})\s*[.·-]\s*([O0-9IL]{2})\b/i);
  const compact = head.match(/^[^A-ZÀ-ÿ0-9]{0,12}(?:\d{1,2}\s+)?([A-Z0]{2})\s*([O0-9IL]{2})\b/i);
  const match = dotted || compact;
  if (!match || /^(?:CAP|PAG|NUM|ORD|TI|DI|DE|IL)$/i.test(match[1])) {
    const partial = head.match(/^[^A-ZÀ-ÿ0-9]{0,12}([A-Z0]{2})\s*[.·-]\s*$/i);
    return partial ? { code: null, prefixHint: partial[1].toUpperCase().replace(/0/g, "O"), rest: "" } : null;
  }
  let prefix = match[1];
  let numericPart = match[2];
  const trailingNumber = clean.slice(match[0].length).match(/^\s*[.·-]\s*([O0-9IL]{2})\b/i);
  if (prefix.length === 1 && trailingNumber) {
    prefix += "O";
    numericPart = trailingNumber[1];
  }
  const consumed = match[0].length + (trailingNumber && match[1].length === 1 ? trailingNumber[0].length : 0);
  return { code: normalizeCode(prefix, numericPart), prefixHint: null, rest: clean.slice(consumed).trim() };
};

const isSummaryLine = (line) => {
  const letters = line.toUpperCase().replace(/0/g, "O").replace(/[^A-Z]/g, "");
  return letters.includes("SOMMANO") || letters.includes("SOMMAND");
};

const ordinalFromLine = (line) => {
  const clean = line.replace(/\s+/g, " ").trim();
  const exact = clean.match(/^([1-9]|1\d|2[0-4])$/);
  if (exact) return { ordinal: Number(exact[1]), rest: "" };
  const withText = clean.match(/^([1-9]|1\d|2[0-4])(?:\s*[.)|:-]\s*|\s+)(.*)$/);
  return withText ? { ordinal: Number(withText[1]), rest: withText[2].trim() } : null;
};

const summaryValues = (line) => {
  const normalized = line.replace(/\|/g, " ").replace(/\s+/g, " ").trim();
  const unitMatch = normalized.match(new RegExp(`\\b(a\\s*co[rmn]?po|${unitPattern})\\b`, "i"));
  const values = normalized.match(/-?\d+(?:[.,]\d+)?/g) || [];
  const decimalValues = values.filter((value) => /[.,]\d{2}$/.test(value));
  let quantity = numberValue((decimalValues.length ? decimalValues : values).at(-1)) || null;
  if (!decimalValues.length && /^\d{5}$/.test(values.at(-1) || "")) quantity /= 100;
  return {
    hasDecimalQuantity: decimalValues.length > 0,
    quantity,
    unit: unitMatch?.[1]?.replace(/\s+/g, " ").replace(/^a\s*co[rmn]?po$/i, "a corpo") || "cad",
  };
};

const measurementFromLine = (line) => {
  const clean = line.replace(/\s+/g, " ").trim();
  if (!/^[^A-ZÀ-ÿ0-9]{0,12}(?:Tipo|Fascia|Detrazione|Superficie|Quota|Totale superfici|Intradosso|Frontalini|Stima|n\.\s*\d+|Torrino|Noleggio|Perimetro)/i.test(clean)) return null;
  const tokens = clean.match(/-?\d+(?:[.,]\d+)?/g) || [];
  if (tokens.length < 2) return null;
  const raw = tokens.at(-1);
  let value = numberValue(raw);
  if (!/[.,]/.test(raw) && Math.abs(value) >= 10000) value /= 1000;
  const isType = /(?:^|[|\s])Tipo\s*\d/i.test(clean);
  let formulaValue = null;
  let typeKey = null;
  if (isType) {
    typeKey = clean.match(/Tipo\s*(3\s*\+\s*4|\d)/i)?.[1]?.replace(/\s/g, "") || null;
    const formulaText = clean.replace(/(Tipo\s*(?:3\s*\+\s*4|[1-7]))(?=\d+[.,]\d+)/i, "$1 ");
    const dimensions = formulaText.match(/(\d+[.,]\d+)\s*x\s*(\d+[.,]\d+)/i);
    const count = formulaText.match(/(\d+)\s*(?:piani|pz)\b/i);
    const linear = formulaText.match(/(\d+[.,]\d+)\s*(?:ml|m)\s*x\s*(\d+)\s*piani\b/i);
    if (dimensions && count) formulaValue = numberValue(dimensions[1]) * numberValue(dimensions[2]) * Number(count[1]);
    else if (linear) formulaValue = numberValue(linear[1]) * Number(linear[2]);
  }
  return { formulaValue, isType, typeKey, value };
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
  let lastOrdinal = null;
  let lastCode = null;
  let reachedNotes = false;

  const nextCode = () => {
    const match = lastCode?.match(/^([A-Z]+)\.(\d{2})$/);
    return match ? `${match[1]}.${String(Number(match[2]) + 1).padStart(2, "0")}` : null;
  };

  const finalize = (summaryLine) => {
    if (!current) return;
    if (!summaryLine && !current.code) { current = null; return; }
    const values = summaryLine ? summaryValues(summaryLine) : { hasDecimalQuantity: false, quantity: null, unit: "cad" };
    const measurements = [...new Map((current.measurements || []).map((entry) => [`${entry.isType}:${entry.value}`, entry])).values()];
    const measuredQuantity = measurements.filter((entry) => !entry.isType).at(-1)?.value;
    const formulaMeasurements = [...new Map((current.measurements || [])
      .filter((entry) => entry.typeKey && Number.isFinite(entry.formulaValue))
      .map((entry) => [entry.typeKey, entry.formulaValue])).values()];
    const formulaQuantity = formulaMeasurements.length >= 6 ? formulaMeasurements.reduce((sum, value) => sum + value, 0) : null;
    const quantity = formulaQuantity || (values.hasDecimalQuantity || values.quantity >= 10
      ? values.quantity
      : (measuredQuantity || values.quantity || 1));
    const description = current.descriptionParts.join(" ").replace(/\s+/g, " ").trim();
    const lastPrefix = lastCode?.split(".")[0];
    const canInfer = current.ordinal === lastOrdinal + 1 || (current.prefixHint && current.prefixHint === lastPrefix);
    const inferredCode = current.code || (canInfer ? nextCode() : null);
    const label = inferredCode || `Voce ${current.ordinal || items.length + 1}`;
    items.push(makeItem({
      description: description ? `${label} - ${description}` : label,
      quantity: Math.round(quantity * 100) / 100,
      unit: values.unit,
      unitPrice: 0,
    }));
    lastOrdinal = current.ordinal ?? lastOrdinal;
    lastCode = inferredCode ?? lastCode;
    current = null;
  };

  lines.forEach((rawLine) => {
    const line = rawLine.replace(/\s+/g, " ").trim();
    if (!line) return;
    if (/^NOTE\b/i.test(line)) { finalize(); reachedNotes = true; return; }
    if (reachedNotes) return;
    const detectedCode = codeFromLine(line);
    if (detectedCode) {
      if (current && !current.code && detectedCode.code) current.code = detectedCode.code;
      else {
        finalize();
        current = { code: detectedCode.code, prefixHint: detectedCode.prefixHint, ordinal: null, descriptionParts: [], measurements: [] };
      }
      if (detectedCode.rest && !nonDescriptionLine(detectedCode.rest)) current.descriptionParts.push(detectedCode.rest);
      return;
    }
    if (isSummaryLine(line)) {
      finalize(line);
      return;
    }
    const detectedOrdinal = ordinalFromLine(line);
    if (detectedOrdinal) {
      if (!current) current = { code: null, ordinal: detectedOrdinal.ordinal, descriptionParts: [], measurements: [] };
      else if (current.ordinal == null) current.ordinal = detectedOrdinal.ordinal;
      else if (current.ordinal !== detectedOrdinal.ordinal) {
        finalize();
        current = { code: null, ordinal: detectedOrdinal.ordinal, descriptionParts: [], measurements: [] };
      }
      if (detectedOrdinal.rest && !nonDescriptionLine(detectedOrdinal.rest)) current.descriptionParts.push(detectedOrdinal.rest);
      return;
    }
    if (!current) return;
    const measurement = measurementFromLine(line);
    if (measurement) current.measurements.push(measurement);
    if (!nonDescriptionLine(line)) current.descriptionParts.push(line);
  });
  finalize();
  items.forEach((item, index) => {
    if (/METRI LINEARI/i.test(item.description)) item.unit = "ml";
    if (item.unit !== "cad") return;
    const prefix = item.description.match(/^([A-Z]+)\.\d{2}\b/)?.[1];
    if (!prefix) return;
    const neighbors = items
      .map((candidate, candidateIndex) => ({ candidate, distance: Math.abs(candidateIndex - index) }))
      .filter(({ candidate }) => candidate.unit !== "cad" && candidate.unit !== "a corpo" && candidate.description.startsWith(`${prefix}.`))
      .sort((a, b) => a.distance - b.distance);
    if (neighbors[0]) item.unit = neighbors[0].candidate.unit;
  });
  return items;
};

export const parseComputoText = (text) => {
  const lines = String(text || "").split(/\r?\n/);
  const blockItems = parseComputoBlocks(lines);
  return blockItems.length ? blockItems : linesToItems(lines);
};

const itemCode = (item) => {
  const match = item.description.match(/^([A-Z]{1,3})\.(\d{2})\b/);
  return match ? normalizeCode(match[1], match[2]) : null;
};

const canonicalItem = (item) => {
  const code = itemCode(item);
  if (!code) return item;
  return { ...item, description: item.description.replace(/^[A-Z]{1,3}\.\d{2}\b/, code) };
};

const cleanOcrDescription = (description) => {
  const match = String(description || "").match(/^((?:[A-Z]{1,3}\.\d{2}|Voce \d+))\s*-\s*(.*)$/s);
  if (!match) return String(description || "").replace(/\s+/g, " ").trim();
  let body = match[2]
    .replace(/[|¦]+/g, " ")
    .replace(/[_=]{2,}/g, " ")
    .replace(/[—–-]{3,}.*$/g, "")
    .replace(/\s+(?:BESSER|SPESSO|S[O0]M+ANO|T[O0]MMANO)\b.*$/i, "")
    .replace(/^[^A-Za-zÀ-ÿ]*(?:(?:[A-Za-zÀ-ÿ]{1,3}|\d+|[’'`]+)\s+){1,9}(?=[A-ZÀ-Ý][a-zà-ÿ]{3,})/, "")
    .replace(/(?:\s+[A-Za-zÀ-ÿÌÎ]{1,2}){2,}\s*["'’]*$/g, "")
    .replace(/\s+/g, " ")
    .replace(/["'’\s]+$/g, "")
    .trim();
  const lastPeriod = body.lastIndexOf(".");
  if (lastPeriod >= 40) {
    const tail = body.slice(lastPeriod + 1).trim();
    if (tail && tail.length < 90) body = body.slice(0, lastPeriod + 1);
  }
  const firstWord = body.match(/[A-ZÀ-Ý][a-zà-ÿ]{3,}/);
  if (firstWord?.index > 0 && firstWord.index < 55) body = body.slice(firstWord.index);
  body = body
    .replace(/\s+(?:[A-Z]{1,3}\s+)?[FPT]?[0O]MMANO\b.*$/i, "")
    .replace(/\s+[—–]\s+[^.]{0,80}$/g, "")
    .replace(/,\s+(?:[A-ZÀ-Ý]{2,}\s*){1,6}$/g, ".")
    .replace(/(?:\s+[A-Za-zÀ-ÿÙÌÎ]{1,2}){1,4}\s*$/g, "")
    .replace(/smobilizzo a fine$/i, "smobilizzo a fine lavori.")
    .replace(/\s+[“"]?Noleggio$/i, " lavori.")
    .replace(/,\s*$/g, ".")
    .trim();
  const corrections = [
    [/\bFomitura\b/gi, "Fornitura"],
    [/\bnottuma\b/gi, "notturna"],
    [/\bdiuma\b/gi, "diurna"],
    [/\blavorì\b/gi, "lavori"],
    [/\btorino scale\b/gi, "torrino scale"],
    [/\btorino scala\b/gi, "torrino scala"],
    [/\btotrino\b/gi, "torrino"],
    [/\bJa durata\b/g, "la durata"],
    [/\btabelia\b/gi, "tabella"],
    [/\bc notturna\b/gi, "e notturna"],
    [/\bPI di intonaco\b/g, "riprese di intonaco"],
    [/gonfî/gi, "gonfi"],
    [/ferrì/gi, "ferri"],
    [/\$A2/g, "SA2"],
    [/\bc resine\b/gi, "e resine"],
    [/\bel vivo\b/gi, "al vivo"],
    [/bordì/gi, "bordi"],
    [/\bSUI\b/g, "sui"],
    [/\b0 a\b/g, "o a"],
    [/\s+Ì\s+/g, " "],
    [/,\s+i\s+gonfio/gi, ", gonfio"],
    [/\bspigoli\b.*$/i, "spigoli."],
    [/\b0a\b/g, "o a"],
  ];
  corrections.forEach(([pattern, replacement]) => { body = body.replace(pattern, replacement); });
  return `${match[1]} - ${body}`;
};

const itemCandidateScore = (item) => {
  const description = cleanOcrDescription(item.description || "");
  const noise = (description.match(/[|_=]/g) || []).length
    + (description.match(/(?:\b[A-Za-zÀ-ÿ]{1,2}\b\s*){3,}/g) || []).length * 4;
  const quantity = Number(item.quantity) || 0;
  const quantityScore = quantity > 0 && quantity < 100000
    ? 5 + Math.min(Math.log10(quantity + 1) * 3, 9) - (Number.isInteger(quantity) && quantity >= 1000 ? 12 : 0)
    : -20;
  const unitScore = item.unit && item.unit !== "cad" ? 5 : 0;
  return Math.min(description.length, 600) / 60 + quantityScore + unitScore - noise;
};

const ocrQuality = (items) => {
  const coded = new Set(items.map(itemCode).filter(Boolean)).size;
  const placeholders = items.filter((item) => /^Voce \d+\b/.test(item.description)).length;
  return coded * 7 - placeholders * 2;
};

export const mergeOcrPasses = (primaryItems, secondaryItems) => {
  const preferred = ocrQuality(secondaryItems) > ocrQuality(primaryItems) ? secondaryItems : primaryItems;
  const fallback = preferred === primaryItems ? secondaryItems : primaryItems;
  const result = preferred.map(canonicalItem);
  const knownCodes = new Set(result.map(itemCode).filter(Boolean));
  fallback.forEach((item) => {
    const code = itemCode(item);
    const existingIndex = code ? result.findIndex((candidate) => itemCode(candidate) === code) : -1;
    if (existingIndex >= 0) {
      if (itemCandidateScore(item) > itemCandidateScore(result[existingIndex])) result[existingIndex] = canonicalItem(item);
      return;
    }
    if (code && !knownCodes.has(code)) {
      const prefix = code.split(".")[0];
      const numeric = Number(code.split(".")[1]);
      const insertAfter = result.reduce((position, candidate, index) => {
        const candidateCode = itemCode(candidate);
        if (!candidateCode?.startsWith(`${prefix}.`)) return position;
        return Number(candidateCode.split(".")[1]) < numeric ? index : position;
      }, -1);
      result.splice(insertAfter + 1, 0, canonicalItem(item));
      knownCodes.add(code);
    }
  });
  return result;
};

const dedupeOcrItems = (items) => {
  const result = [];
  const positions = new Map();
  items.map(canonicalItem).forEach((item) => {
    const code = itemCode(item);
    if (!code) { result.push(item); return; }
    if (!positions.has(code)) {
      positions.set(code, result.length);
      result.push(item);
      return;
    }
    const position = positions.get(code);
    if (itemCandidateScore(item) > itemCandidateScore(result[position])) result[position] = item;
  });
  return result.map((item) => ({ ...item, description: cleanOcrDescription(item.description) }));
};

const harmonizeOcrUnits = (items) => items.map((item, index) => {
  if (/Noleggio trabatello/i.test(item.description)) return { ...item, unit: "a corpo" };
  if (/METRI LINEARI/i.test(item.description)) return { ...item, unit: "ml" };
  if (item.unit !== "cad") return item;
  const prefix = itemCode(item)?.split(".")[0];
  if (!prefix) return item;
  const neighbor = items
    .map((candidate, candidateIndex) => ({ candidate, distance: Math.abs(candidateIndex - index) }))
    .filter(({ candidate }) => candidate.unit !== "cad" && candidate.unit !== "a corpo" && itemCode(candidate)?.startsWith(`${prefix}.`))
    .sort((a, b) => a.distance - b.distance)[0]?.candidate;
  return neighbor ? { ...item, unit: neighbor.unit } : item;
});

export const finalizeOcrItems = (items) => harmonizeOcrUnits(dedupeOcrItems(items));

const confidentTextFromBlocks = (blocks, minimumConfidence = 35) => (blocks || [])
  .flatMap((block) => block.paragraphs.flatMap((paragraph) => paragraph.lines.map((line) => line.words
    .filter((word) => word.confidence >= minimumConfidence)
    .map((word) => word.text)
    .join(" "))))
  .join("\n");

const sequenceWarnings = (items) => {
  const groups = new Map();
  items.map(itemCode).filter(Boolean).forEach((code) => {
    const [prefix, numeric] = code.split(".");
    if (!groups.has(prefix)) groups.set(prefix, new Set());
    groups.get(prefix).add(Number(numeric));
  });
  const missing = [];
  groups.forEach((numbers, prefix) => {
    const sorted = [...numbers].sort((a, b) => a - b);
    for (let number = sorted[0]; number < sorted.at(-1); number += 1) {
      if (!numbers.has(number)) missing.push(`${prefix}.${String(number).padStart(2, "0")}`);
    }
  });
  const warnings = missing.length ? [`Possibili voci non riconosciute: ${missing.join(", ")}`] : [];
  const suspiciousValues = items
    .filter((item) => ["mq", "ml", "mc", "m2", "m3"].includes(item.unit.toLowerCase()) && (Number(item.quantity) <= 1 || Number(item.quantity) >= 100000))
    .map((item) => itemCode(item) || item.description.split(" - ")[0]);
  if (suspiciousValues.length) warnings.push(`Quantità OCR da verificare: ${suspiciousValues.join(", ")}`);
  return warnings;
};

const recognizeSources = async (sources, onProgress = () => {}) => {
  const { createWorker } = await import("tesseract.js");
  let currentSource = 0;
  let currentPass = 0;
  const worker = await createWorker("ita", 1, {
    logger: ({ progress, status }) => {
      const overall = (currentSource + (currentPass + (Number(progress) || 0)) / 2) / sources.length;
      onProgress({ progress: overall, status });
    },
  });
  const items = [];
  const primaryTexts = [];
  try {
    for (currentSource = 0; currentSource < sources.length; currentSource += 1) {
      const source = typeof sources[currentSource] === "function" ? await sources[currentSource]() : sources[currentSource];
      currentPass = 0;
      await worker.setParameters({ preserve_interword_spaces: "1", tessedit_pageseg_mode: "3" });
      const primaryResult = await worker.recognize(source, {}, { text: true, blocks: true });
      const primaryText = primaryResult.data.text;
      primaryTexts.push(primaryText);
      const primary = mergeOcrPasses(
        parseComputoText(primaryText),
        parseComputoText(confidentTextFromBlocks(primaryResult.data.blocks)),
      );
      currentPass = 1;
      await worker.setParameters({ preserve_interword_spaces: "1", tessedit_pageseg_mode: "6" });
      const secondary = parseComputoText((await worker.recognize(source)).data.text);
      items.push(...mergeOcrPasses(primary, secondary));
      if (typeof HTMLCanvasElement !== "undefined" && source instanceof HTMLCanvasElement) { source.width = 1; source.height = 1; }
    }
  } finally {
    await worker.terminate();
  }
  onProgress({ progress: 1, status: "completed" });
  const globalPrimary = parseComputoText(primaryTexts.join("\n"));
  return finalizeOcrItems(mergeOcrPasses(items, globalPrimary));
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
  return { fileName: file.name.replace(/\.[^.]+$/, ""), items, usedOcr, warnings: usedOcr ? sequenceWarnings(items) : [] };
}
