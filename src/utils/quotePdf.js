const euro = (value) => new Intl.NumberFormat("it-IT", {
  currency: "EUR",
  minimumFractionDigits: 2,
  style: "currency",
}).format(Number(value) || 0);

const italianDate = (value) => value
  ? new Date(`${value}T12:00:00`).toLocaleDateString("it-IT")
  : "Non indicata";

const safeFileName = (value) => String(value || "preventivo")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-z0-9_-]+/gi, "-")
  .replace(/^-+|-+$/g, "")
  .toLowerCase();

const addPageFooter = (doc) => {
  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setDrawColor(224, 220, 236);
    doc.line(14, 282, 196, 282);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(112, 108, 126);
    doc.text("CRM Gei - Gestionale cantieri", 14, 287);
    doc.text(`Pagina ${page} di ${pageCount}`, 196, 287, { align: "right" });
  }
};

export async function buildQuotePdf(quote, customer = {}) {
  const [{ jsPDF }, autoTableModule] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const autoTable = autoTableModule.default;
  const doc = new jsPDF({ format: "a4", unit: "mm" });
  const subtotal = quote.items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0), 0);
  const discountValue = subtotal * ((Number(quote.discount) || 0) / 100);
  const taxable = subtotal - discountValue;
  const vatValue = taxable * ((Number(quote.vatRate) || 0) / 100);
  const total = taxable + vatValue;

  doc.setProperties({
    author: "CRM Gei",
    subject: quote.subject,
    title: `${quote.quoteNumber} - ${quote.subject}`,
  });
  doc.setFillColor(109, 55, 245);
  doc.rect(0, 0, 210, 27, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(19);
  doc.text("CRM Gei", 14, 12);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Gestionale cantieri", 14, 18);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("PREVENTIVO", 196, 14, { align: "right" });

  doc.setTextColor(29, 27, 38);
  doc.setFontSize(13);
  const titleLines = doc.splitTextToSize(quote.subject, 118);
  doc.text(titleLines, 14, 36);
  const metadataY = 39 + titleLines.length * 5;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(105, 100, 120);
  doc.text(`Numero: ${quote.quoteNumber}`, 14, metadataY);
  doc.text(`Emissione: ${italianDate(quote.issueDate)}`, 14, metadataY + 5);
  doc.text(`Validità: ${italianDate(quote.validUntil)}`, 14, metadataY + 10);

  doc.setFillColor(247, 245, 252);
  doc.roundedRect(137, 31, 59, 25, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setTextColor(80, 73, 99);
  doc.text("CLIENTE", 142, 38);
  doc.setTextColor(29, 27, 38);
  doc.setFontSize(10);
  doc.text(quote.customerName || customer.name || "Cliente non collegato", 142, 44, { maxWidth: 49 });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  const contact = [customer.primaryContact, customer.phone, customer.email].filter(Boolean).join(" - ");
  if (contact) doc.text(contact, 142, 50, { maxWidth: 49 });

  autoTable(doc, {
    body: quote.items.map((item, index) => [
      String(index + 1),
      item.description,
      String(item.quantity),
      item.unit || "cad",
      euro(item.unitPrice),
      euro((Number(item.quantity) || 0) * (Number(item.unitPrice) || 0)),
    ]),
    columnStyles: {
      0: { cellWidth: 9, halign: "center" },
      1: { cellWidth: 89 },
      2: { cellWidth: 17, halign: "right" },
      3: { cellWidth: 15, halign: "center" },
      4: { cellWidth: 25, halign: "right" },
      5: { cellWidth: 27, halign: "right" },
    },
    didDrawPage: ({ pageNumber }) => {
      if (pageNumber > 1) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(109, 55, 245);
        doc.text(`${quote.quoteNumber} - ${quote.customerName}`, 14, 10);
      }
    },
    head: [["#", "Descrizione lavorazione", "Quantità", "U.M.", "Prezzo unit.", "Totale"]],
    headStyles: { fillColor: [109, 55, 245], fontSize: 8, fontStyle: "bold", textColor: 255 },
    margin: { bottom: 20, left: 14, right: 14, top: 16 },
    rowPageBreak: "avoid",
    startY: Math.max(62, metadataY + 16),
    styles: { cellPadding: 2.2, font: "helvetica", fontSize: 8, lineColor: [229, 226, 236], lineWidth: 0.15, overflow: "linebreak", textColor: [42, 39, 52], valign: "top" },
    alternateRowStyles: { fillColor: [250, 249, 252] },
  });

  let y = doc.lastAutoTable.finalY + 7;
  const notesHeight = quote.notes ? Math.max(18, doc.splitTextToSize(quote.notes, 108).length * 4 + 9) : 0;
  const requiredHeight = 42 + notesHeight;
  if (y + requiredHeight > 276) { doc.addPage(); y = 18; }

  if (quote.notes) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(80, 73, 99);
    doc.text("NOTE E CONDIZIONI", 14, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(42, 39, 52);
    doc.text(doc.splitTextToSize(quote.notes, 108), 14, y + 5);
  }

  const totalsX = 134;
  doc.setFillColor(247, 245, 252);
  doc.roundedRect(totalsX, y, 62, 38, 2, 2, "F");
  const totalRows = [
    ["Imponibile", euro(subtotal)],
    ...(quote.discount > 0 ? [[`Sconto ${quote.discount}%`, `- ${euro(discountValue)}`]] : []),
    [`IVA ${quote.vatRate}%`, euro(vatValue)],
  ];
  doc.setFontSize(9);
  totalRows.forEach(([label, value], index) => {
    const rowY = y + 7 + index * 6;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(90, 84, 106);
    doc.text(label, totalsX + 5, rowY);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(29, 27, 38);
    doc.text(value, 191, rowY, { align: "right" });
  });
  doc.setDrawColor(206, 197, 230);
  doc.line(totalsX + 5, y + 27, 191, y + 27);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(109, 55, 245);
  doc.text("TOTALE", totalsX + 5, y + 34);
  doc.text(euro(total), 191, y + 34, { align: "right" });

  addPageFooter(doc);
  return doc;
}

export async function downloadQuotePdf(quote, customer) {
  const doc = await buildQuotePdf(quote, customer);
  doc.save(`${safeFileName(quote.quoteNumber)}-${safeFileName(quote.customerName)}.pdf`);
}
