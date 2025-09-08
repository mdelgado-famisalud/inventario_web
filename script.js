/* ---------- Estado ---------- */
const LS_INV = "inv_v1";
const LS_HIS = "his_v1";
let inventario = JSON.parse(localStorage.getItem(LS_INV)) || [];
let historial = JSON.parse(localStorage.getItem(LS_HIS)) || [];
let ordenActual = { columna: null, asc: true };
let paginaActual = 1;
let registrosPorPagina = Number(document.getElementById("registrosPagina").value || 10);
/* ---------- Utiles ---------- */
function saveInv() { localStorage.setItem(LS_INV, JSON.stringify(inventario)); }
function saveHis() { localStorage.setItem(LS_HIS, JSON.stringify(historial)); }
function now() { return new Date().toLocaleString(); }
function escapeHtml(s) { if (s === null || s === undefined) return ""; return String(s).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;"); }
function highlightSafe(text, query) {
    if (!text && text !== 0) text = "";
    if (!query) return escapeHtml(text);
    const q = String(query).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const rx = new RegExp('(' + q + ')', 'gi');
    return escapeHtml(text).replace(rx, '<mark>$1</mark>');
}
/* ---------- Listas predefinidas (Sede, Piso) ---------- */
function actualizarListas() {
    const sedes = document.getElementById("listaSedes").value.split(",").map(s => s.trim()).filter(Boolean);
    const pisos = document.getElementById("listaPisos").value.split(",").map(s => s.trim()).filter(Boolean);
    llenarSelect("sede", sedes);
    llenarSelect("piso", pisos);
    // re-render
    mostrarInventario();
}
function llenarSelect(id, valores) {
    const sel = document.getElementById(id);
    if (!sel) return;
    sel.innerHTML = '<option value="">--</option>' + valores.map(v => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join('');
}
/* ---------- CRUD: Guardar ---------- */
document.getElementById("formInventario").addEventListener("submit", function (e) {
    e.preventDefault();
    const item = {
        descripcion: document.getElementById("descripcion").value.trim(),
        cantidad: Number(document.getElementById("cantidad").value) || 0,
        precio: Number(document.getElementById("precio").value) || 0,
        codigo: document.getElementById("codigo").value.trim(),
        fIngreso: document.getElementById("fIngreso").value || "",
        categoria: document.getElementById("categoria").value.trim(),
        tipo: document.getElementById("tipo").value.trim(),
        grupo: document.getElementById("grupo").value.trim(),
        marca: document.getElementById("marca").value.trim(),
        modelo: document.getElementById("modelo").value.trim(),
        serie: document.getElementById("serie").value.trim(),
        ubicacion: document.getElementById("ubicacion").value.trim(),
        piso: document.getElementById("piso").value || "",
        sede: document.getElementById("sede").value || "",
        observacion: document.getElementById("observacion").value.trim()
    };
    const idx = document.getElementById("index").value;
    if (idx === "") {
        inventario.push(item);
        historial.unshift({ fecha: now(), accion: "Crear", detalle: `Se agregó: ${item.descripcion}` });

        // 🔹 Si venía de una duplicación → mostrar toast
        if (this.getAttribute("data-copia") === "1") {
            this.removeAttribute("data-copia");
            const toastEl = document.getElementById("toastDuplicado");
            const toast = new bootstrap.Toast(toastEl);
            toast.show();
        }
    } else {
        inventario[Number(idx)] = item;
        historial.unshift({ fecha: now(), accion: "Editar", detalle: `Se editó: ${item.descripcion}` });
        document.getElementById("index").value = "";
    }
    saveInv();
    saveHis();
    paginaActual = Math.ceil(inventario.length / registrosPorPagina);
    mostrarInventario();
    mostrarHistorial();
    // 🔹 Reset solo si no era duplicado
    if (this.getAttribute("data-copia") === "1") {
        this.removeAttribute("data-copia");
        const toastEl = document.getElementById("toastDuplicado");
        const toast = new bootstrap.Toast(toastEl);
        toast.show();
    } else {
        this.reset();
    }
});
/* ---------- Mostrar / Filtrar / Ordenar / Paginación ---------- */
function getFiltered() {
    const q = (document.getElementById("buscar").value || "").toLowerCase();
    if (!q) return [...inventario];
    return inventario.filter(it => Object.values(it).some(v => String(v).toLowerCase().includes(q)));
}
function mostrarInventario() {
    const filtro = (document.getElementById("buscar").value || "").toLowerCase();
    const tbody = document.querySelector("#tablaInventario tbody");
    tbody.innerHTML = "";
    let datos = getFiltered();
    // ordenar si aplica
    if (ordenActual.columna) {
        datos.sort((a, b) => {
            let A = a[ordenActual.columna] ?? "";
            let B = b[ordenActual.columna] ?? "";
            if (ordenActual.columna === "fIngreso") { A = new Date(A || 0); B = new Date(B || 0); }
            else if (!isNaN(Number(A)) && !isNaN(Number(B)) && A !== "" && B !== "") { A = Number(A); B = Number(B); }
            else { A = String(A).toLowerCase(); B = String(B).toLowerCase(); }
            if (A < B) return ordenActual.asc ? -1 : 1;
            if (A > B) return ordenActual.asc ? 1 : -1;
            return 0;
        });
    }
    // paginación
    const totalRegistros = datos.length;
    const totalPaginas = Math.max(1, Math.ceil(totalRegistros / registrosPorPagina));
    if (paginaActual > totalPaginas) paginaActual = totalPaginas;
    if (paginaActual < 1) paginaActual = 1;
    const inicio = (paginaActual - 1) * registrosPorPagina;
    const paginaDatos = datos.slice(inicio, inicio + registrosPorPagina);
    // render filas
    paginaDatos.forEach(item => {
        const idx = inventario.indexOf(item); // índice real en inventario
        const tr = document.createElement("tr");
        tr.innerHTML = `
      <td>${highlightSafe(item.descripcion, filtro)}</td>
      <td>${highlightSafe(String(item.cantidad), filtro)}</td>
      <td>${highlightSafe(String(item.precio), filtro)}</td>
      <td>${highlightSafe(item.codigo, filtro)}</td>
      <td>${highlightSafe(item.fIngreso, filtro)}</td>
      <td>${highlightSafe(item.categoria, filtro)}</td>
      <td>${highlightSafe(item.tipo, filtro)}</td>
      <td>${highlightSafe(item.grupo, filtro)}</td>
      <td>${highlightSafe(item.marca, filtro)}</td>
      <td>${highlightSafe(item.modelo, filtro)}</td>
      <td>${highlightSafe(item.serie, filtro)}</td>
      <td>${highlightSafe(item.ubicacion, filtro)}</td>
      <td>${highlightSafe(item.piso, filtro)}</td>
      <td>${highlightSafe(item.sede, filtro)}</td>
      <td>${highlightSafe(item.observacion, filtro)}</td>
      <td>
        <button class="btn btn-sm btn-warning" onclick="editar(${idx})">✏️</button>
        <button class="btn btn-sm btn-danger" onclick="eliminar(${idx})">🗑️</button>
        <button class="btn btn-sm btn-info" onclick="duplicar(${inventario.indexOf(item)})">📄</button>
      </td>
    `;
        tbody.appendChild(tr);
    });
    mostrarTotalizador(datos);
    renderPaginacion(totalRegistros, Math.max(1, Math.ceil(totalRegistros / registrosPorPagina)));
    actualizarIconosOrden();
}
/* ---------- Resaltar coincidencias ---------- */
function highlightSafe(text, q) {
    return highlightSafeInner(text, q);
}
function highlightSafeInner(text, q) {
    if (!text && text !== 0) text = "";
    if (!q) return escapeHtml(text);
    const qEsc = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const rx = new RegExp('(' + qEsc + ')', 'gi');
    return escapeHtml(text).replace(rx, '<mark>$1</mark>');
}
/* ---------- Orden UI helpers ---------- */
function ordenarPor(col) {
    if (ordenActual.columna === col) ordenActual.asc = !ordenActual.asc;
    else { ordenActual.columna = col; ordenActual.asc = true; }
    // update icons & class
    document.querySelectorAll("th").forEach(th => th.classList.remove("ordenado"));
    document.querySelectorAll("th .flecha").forEach(span => span.textContent = "⬍");
    const th = document.querySelector(`#tablaInventario th[onclick="ordenarPor('${col}')"]`);
    if (th) {
        th.classList.add("ordenado");
        const span = th.querySelector(".flecha");
        if (span) span.textContent = ordenActual.asc ? " ↑" : " ↓";
    }
    mostrarInventario();
}
function actualizarIconosOrden() {
    // already handled in ordenarPor; keep for safety (no-op)
}
/* ---------- Edit / Delete ---------- */
function editar(i) {
    const it = inventario[i];
    if (!it) return alert("Registro no encontrado");
    document.getElementById("index").value = i;
    document.getElementById("descripcion").value = it.descripcion;
    document.getElementById("cantidad").value = it.cantidad;
    document.getElementById("precio").value = it.precio;
    document.getElementById("codigo").value = it.codigo;
    document.getElementById("fIngreso").value = it.fIngreso;
    document.getElementById("categoria").value = it.categoria;
    document.getElementById("tipo").value = it.tipo;
    document.getElementById("grupo").value = it.grupo;
    document.getElementById("marca").value = it.marca;
    document.getElementById("modelo").value = it.modelo;
    document.getElementById("serie").value = it.serie;
    document.getElementById("ubicacion").value = it.ubicacion;
    document.getElementById("piso").value = it.piso;
    document.getElementById("sede").value = it.sede;
    document.getElementById("observacion").value = it.observacion;
    window.scrollTo({ top: 0, behavior: "smooth" });
}
function eliminar(i) {
    if (!confirm("¿Eliminar este registro?")) return;
    historial.unshift({ fecha: now(), accion: "Eliminar", detalle: `Se eliminó: ${inventario[i].descripcion}` });
    inventario.splice(i, 1);
    saveInv(); saveHis();
    mostrarInventario(); mostrarHistorial();
}
function duplicar(i) {
    const original = inventario[i];
    if (!original) return alert("Registro no encontrado");
    const copia = { ...original };
    copia.descripcion += " (copia)"; // opcional, marcar que es copia
    // Cargar copia en el formulario
    document.getElementById("index").value = ""; // nuevo registro
    document.getElementById("descripcion").value = copia.descripcion;
    document.getElementById("cantidad").value = copia.cantidad;
    document.getElementById("precio").value = copia.precio;
    document.getElementById("codigo").value = copia.codigo;
    document.getElementById("fIngreso").value = copia.fIngreso;
    document.getElementById("categoria").value = copia.categoria;
    document.getElementById("tipo").value = copia.tipo;
    document.getElementById("grupo").value = copia.grupo;
    document.getElementById("marca").value = copia.marca;
    document.getElementById("modelo").value = copia.modelo;
    document.getElementById("serie").value = copia.serie;
    document.getElementById("ubicacion").value = copia.ubicacion;
    document.getElementById("piso").value = copia.piso;
    document.getElementById("sede").value = copia.sede;
    document.getElementById("observacion").value = copia.observacion;
    // Marcar que es una copia pendiente
    document.getElementById("formInventario").setAttribute("data-copia", "1");
    window.scrollTo({ top: 0, behavior: "smooth" });
}
/* ---------- Historial ---------- */
function mostrarHistorial() {
    const tb = document.querySelector("#tablaHistorial tbody");
    tb.innerHTML = historial.map(h => `<tr><td>${escapeHtml(h.fecha)}</td><td>${escapeHtml(h.accion)}</td><td>${escapeHtml(h.detalle)}</td></tr>`).join("");
}
function limpiarHistorial() { if (!confirm("¿Vaciar historial?")) return; historial = []; saveHis(); mostrarHistorial(); }
/* ---------- Import / Export ---------- */
function importarExcel(e) {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = function (evt) {
        try {
            const data = new Uint8Array(evt.target.result);
            const wb = XLSX.read(data, { type: "array" });
            const ws = wb.Sheets[wb.SheetNames[0]];
            const json = XLSX.utils.sheet_to_json(ws, { defval: "" });
            // Try to normalize columns to our keys if reasonable
            const keys = ["descripcion", "cantidad", "precio", "codigo", "fIngreso", "categoria", "tipo", "grupo", "marca", "modelo", "serie", "ubicacion", "piso", "sede", "observacion"];
            const normalized = json.map(row => {
                const nr = {};
                const rowKeys = Object.keys(row);
                keys.forEach(k => {
                    const found = rowKeys.find(rk => rk.toLowerCase() === k.toLowerCase());
                    if (found) nr[k] = row[found];
                    else {
                        const alt = rowKeys.find(rk => rk.toLowerCase().includes(k.toLowerCase()));
                        nr[k] = alt ? row[alt] : (row[k] ?? "");
                    }
                });
                nr.cantidad = Number(nr.cantidad) || 0;
                nr.precio = Number(nr.precio) || 0;
                return nr;
            });
            inventario = normalized;
            saveInv();
            paginaActual = 1;
            historial.unshift({ fecha: now(), accion: "Importar", detalle: `Excel importado (${json.length} filas)` });
            saveHis();
            mostrarInventario(); mostrarHistorial();
            alert("Excel importado ✅");
        } catch (err) {
            alert("Error al importar Excel: " + err.message);
        } finally { e.target.value = ""; }
    };
    reader.readAsArrayBuffer(file);
}
function importarJSON(e) {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = function (evt) {
        try {
            const data = JSON.parse(evt.target.result);
            if (!Array.isArray(data)) throw new Error("JSON debe ser un arreglo de registros");
            inventario = data.map(it => ({
                descripcion: it.descripcion || "",
                cantidad: Number(it.cantidad) || 0,
                precio: Number(it.precio) || 0,
                codigo: it.codigo || "",
                fIngreso: it.fIngreso || "",
                categoria: it.categoria || "",
                tipo: it.tipo || "",
                grupo: it.grupo || "",
                marca: it.marca || "",
                modelo: it.modelo || "",
                serie: it.serie || "",
                ubicacion: it.ubicacion || "",
                piso: it.piso || "",
                sede: it.sede || "",
                observacion: it.observacion || ""
            }));
            saveInv();
            historial.unshift({ fecha: now(), accion: "Importar", detalle: `JSON importado (${inventario.length} registros)` });
            saveHis();
            mostrarInventario(); mostrarHistorial();
            alert("JSON importado ✅");
        } catch (err) {
            alert("Error al importar JSON: " + err.message);
        } finally { e.target.value = ""; }
    };
    reader.readAsText(file);
}
function exportarJSON() {
    const datos = getFiltered();
    if (!datos.length) return alert("No hay datos para exportar");
    const blob = new Blob([JSON.stringify(datos, null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `Inventario_${new Date().toISOString().slice(0, 10)}.json`; a.click();
    historial.unshift({ fecha: now(), accion: "Exportar", detalle: "Exportado a JSON (filtrados)" }); saveHis(); mostrarHistorial();
}
function exportarExcel() {
    const datos = getFiltered();
    if (!datos.length) return alert("No hay datos para exportar");
    const ws = XLSX.utils.json_to_sheet(datos);
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Inventario");
    XLSX.writeFile(wb, `Inventario_${new Date().toISOString().slice(0, 10)}.xlsx`);
    historial.unshift({ fecha: now(), accion: "Exportar", detalle: "Exportado a Excel (filtrados)" }); saveHis(); mostrarHistorial();
}
function exportarPDF() {
    const datos = getFiltered();
    if (!datos.length) return alert("No hay datos para exportar");
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
    doc.setFontSize(14); doc.text("📦 Reporte de Inventario", 40, 40);
    doc.setFontSize(9); doc.text(`Generado: ${now()}`, doc.internal.pageSize.getWidth() - 40, 40, { align: "right" });
    const head = [["Descripción", "Cantidad", "Precio", "Código", "F-Ingreso", "Categoría", "Tipo", "Grupo", "Marca", "Modelo", "Serie", "Ubicación", "Piso", "Sede", "Observación"]];
    const body = datos.map(it => [it.descripcion, String(it.cantidad), String(it.precio), it.codigo, it.fIngreso, it.categoria, it.tipo, it.grupo, it.marca, it.modelo, it.serie, it.ubicacion, it.piso, it.sede, it.observacion]);
    doc.autoTable({ head, body, startY: 70, styles: { fontSize: 8, cellPadding: 4 }, headStyles: { fillColor: [44, 123, 229], textColor: 255 } });
    const pages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pages; i++) { doc.setPage(i); doc.setFontSize(9); doc.text(`Página ${i} de ${pages}`, doc.internal.pageSize.getWidth() / 2, doc.internal.pageSize.getHeight() - 20, { align: "center" }); }
    doc.save(`Inventario_${new Date().toISOString().slice(0, 10)}.pdf`);
    historial.unshift({ fecha: now(), accion: "Exportar", detalle: "Exportado a PDF (filtrados)" }); saveHis(); mostrarHistorial();
}
/* ---------- Totalizador ---------- */
function mostrarTotalizador(datosArray) {
    const totalItems = datosArray.length;
    const totalCantidad = datosArray.reduce((acc, it) => acc + (Number(it.cantidad) || 0), 0);
    const totalValor = datosArray.reduce((acc, it) => acc + ((Number(it.cantidad) || 0) * (Number(it.precio) || 0)), 0);
    let valorForm;
    try { valorForm = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(totalValor); } catch { valorForm = totalValor.toFixed(2); }
    document.getElementById("totalizador").textContent = `🔢 Registros: ${totalItems} · 📦 Cantidad: ${totalCantidad} · 💰 Valor total: ${valorForm}`;
}
/* ---------- Paginación UI ---------- */
function renderPaginacion(totalRegistros, totalPaginas) {
    const cont = document.getElementById("paginacion");
    cont.innerHTML = "";
    if (totalPaginas <= 1) {
        cont.innerHTML = `<small class="text-muted">Mostrando todos los registros</small>`;
        return;
    }
    // First
    const btnFirst = document.createElement("button"); btnFirst.className = "btn btn-sm btn-outline-secondary"; btnFirst.textContent = "« Primera";
    btnFirst.disabled = paginaActual === 1; btnFirst.onclick = () => { paginaActual = 1; mostrarInventario(); };
    cont.appendChild(btnFirst);
    // Prev
    const btnPrev = document.createElement("button"); btnPrev.className = "btn btn-sm btn-outline-secondary ms-1"; btnPrev.textContent = "‹ Anterior";
    btnPrev.disabled = paginaActual === 1; btnPrev.onclick = () => { paginaActual = Math.max(1, paginaActual - 1); mostrarInventario(); };
    cont.appendChild(btnPrev);
    // numeric buttons (range)
    const start = Math.max(1, paginaActual - 3);
    const end = Math.min(totalPaginas, paginaActual + 3);
    for (let i = start; i <= end; i++) {
        const b = document.createElement("button"); b.className = "btn btn-sm ms-1 " + (i === paginaActual ? "btn-primary" : "btn-outline-secondary");
        b.textContent = i; b.disabled = i === paginaActual;
        b.onclick = () => { paginaActual = i; mostrarInventario(); };
        cont.appendChild(b);
    }
    // Next
    const btnNext = document.createElement("button"); btnNext.className = "btn btn-sm btn-outline-secondary ms-1"; btnNext.textContent = "Siguiente ›";
    btnNext.disabled = paginaActual === totalPaginas; btnNext.onclick = () => { paginaActual = Math.min(totalPaginas, paginaActual + 1); mostrarInventario(); };
    cont.appendChild(btnNext);
    // Last
    const btnLast = document.createElement("button"); btnLast.className = "btn btn-sm btn-outline-secondary ms-1"; btnLast.textContent = "Última »";
    btnLast.disabled = paginaActual === totalPaginas; btnLast.onclick = () => { paginaActual = totalPaginas; mostrarInventario(); };
    cont.appendChild(btnLast);
    // goto input
    const gotoDiv = document.createElement("div"); gotoDiv.className = "ms-3 d-inline-flex align-items-center";
    gotoDiv.innerHTML = `<small class="text-muted ms-2">Ir a:</small>`;
    const input = document.createElement("input"); input.type = "number"; input.min = 1; input.max = totalPaginas; input.value = paginaActual;
    input.style.width = "70px"; input.className = "form-control form-control-sm ms-2";
    input.onkeydown = (e) => { if (e.key === 'Enter') { const v = Number(input.value); if (v >= 1 && v <= totalPaginas) { paginaActual = v; mostrarInventario(); } } };
    gotoDiv.appendChild(input);
    cont.appendChild(gotoDiv);
    // summary
    const info = document.createElement("div"); info.className = "ms-auto text-muted small";
    const from = (paginaActual - 1) * registrosPorPagina + 1;
    const to = Math.min(totalRegistros, paginaActual * registrosPorPagina);
    info.innerHTML = `Mostrando ${from}–${to} de ${totalRegistros} registros (${totalPaginas} páginas)`;
    cont.appendChild(info);
}
/* ---------- Cambiar registros por página / filtro ---------- */
function cambiarRegistrosPorPagina() {
    registrosPorPagina = Number(document.getElementById("registrosPagina").value) || 10;
    paginaActual = 1;
    mostrarInventario();
}
function onFiltroChange() { paginaActual = 1; mostrarInventario(); }
/* ---------- Limpiar inventario ---------- */
function limpiarInventario() {
    if (!confirm("¿Eliminar TODO el inventario?")) return;
    inventario = [];
    saveInv();
    historial.unshift({ fecha: now(), accion: "Limpiar", detalle: "Inventario borrado" });
    saveHis();
    paginaActual = 1;
    mostrarInventario(); mostrarHistorial();
}
/* ---------- Init ---------- */
function init() {
    actualizarListas();
    // load stored inventory & history already done at top via localStorage read
    mostrarInventario();
    mostrarHistorial();
    // wire enter on search
    document.getElementById("buscar").addEventListener("keydown", (e) => { if (e.key === 'Enter') { e.preventDefault(); paginaActual = 1; mostrarInventario(); } });
}
init();