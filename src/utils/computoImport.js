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

const parsePdf = async (file) => {
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

export async function importComputoFile(file) {
  if (file.size > 25 * 1024 * 1024) throw new Error("Il file supera 25 MB. Riducilo o dividilo in più parti.");
  const extension = file.name.split(".").pop()?.toLowerCase();
  let items = [];
  if (extension === "pdf") items = await parsePdf(file);
  else if (extension === "xlsx") {
    const { default: readXlsxFile } = await import("read-excel-file/browser");
    items = rowsToItems(await readXlsxFile(file));
  }
  else if (extension === "csv") items = rowsToItems(parseCsv(await file.text()));
  else throw new Error("Formato non supportato. Usa PDF, XLSX oppure CSV.");
  if (!items.length) throw new Error("Non ho riconosciuto righe del computo. Controlla che il file contenga descrizione, unità e quantità.");
  return { fileName: file.name.replace(/\.[^.]+$/, ""), items };
}
