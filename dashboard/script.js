// 1. ESTADO GLOBAL (RECUPERADO DESDE LOCALSTORAGE)
let inventario = JSON.parse(localStorage.getItem('inventario')) || [];
let clientes = JSON.parse(localStorage.getItem('clientes')) || [];

function registrarCambioStock(nombreProd, cantidadAnterior, cantidadNueva, motivo) {
    var log = JSON.parse(localStorage.getItem('stockLog') || '[]');
    log.push({ producto: nombreProd, desde: cantidadAnterior, hasta: cantidadNueva, fecha: new Date().toISOString(), motivo: motivo });
    if (log.length > 500) log = log.slice(-500);
    localStorage.setItem('stockLog', JSON.stringify(log));
}

function registrarActividad(accion, detalle) {
    var log = JSON.parse(localStorage.getItem('activityLog') || '[]');
    log.push({ accion: accion, detalle: detalle, fecha: new Date().toISOString(), usuario: localStorage.getItem('dash_user') || 'admin' });
    if (log.length > 200) log = log.slice(-200);
    localStorage.setItem('activityLog', JSON.stringify(log));
}

window.renderizarActivityLog = function() {
    var log = JSON.parse(localStorage.getItem('activityLog') || '[]');
    var container = document.getElementById('activity-log-container');
    if (!container) return;
    if (!log.length) { container.innerHTML = '<div style="color:#94a3b8;padding:12px;text-align:center;">Sin actividad registrada.</div>'; return; }
    container.innerHTML = log.slice().reverse().map(function(e) {
        var d = new Date(e.fecha);
        var fechaStr = d.toLocaleDateString('es-VE', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
        return '<div style="padding:8px 12px;border-bottom:1px solid #f1f5f9;display:flex;gap:8px;align-items:flex-start;">' +
            '<span style="font-size:0.75rem;color:#94a3b8;white-space:nowrap;min-width:100px;">' + fechaStr + '</span>' +
            '<span style="font-weight:600;font-size:0.8rem;color:#1e293b;min-width:80px;">' + e.usuario + '</span>' +
            '<span style="font-size:0.8rem;color:#475569;">' + e.accion + '</span>' +
            (e.detalle ? '<span style="font-size:0.75rem;color:#94a3b8;"> — ' + e.detalle + '</span>' : '') +
        '</div>';
    }).join('');
};

window.limpiarActivityLog = function() {
    if (confirm('¿Eliminar todo el historial de actividad?')) {
        localStorage.setItem('activityLog', '[]');
        renderizarActivityLog();
        mostrarToastNotificacion('Historial eliminado');
    }
};

// Modificación para admitir objetos con fotos en categorías y marcas
let categories = JSON.parse(localStorage.getItem('categoriasObj')) || [
    { nombre: "Marcadores", foto: "" },
    { nombre: "Papelería", foto: "" },
    { nombre: "Arte", foto: "" }
];
let marcas = JSON.parse(localStorage.getItem('marcasObj')) || [
    { nombre: "Crayola", foto: "" },
    { nombre: "Kores", foto: "" },
    { nombre: "Sharpie", foto: "" }
];

let clienteEditandoIndex = null;
let categoriaEditandoIndex = null;
let marcaEditandoIndex = null;
let productoEditandoIndex = null;

let managerClienteIndexActivo = null;
let managerFotoIndexSeleccionada = null;
let managerProdClienteIndexActivo = null;
let managerProdFotoIndexSeleccionada = null;

function toggleFormulario(idContenedor) {
    const form = document.getElementById(idContenedor);
    if (!form) return;
    if (form.classList.contains('show')) {
        form.classList.remove('show');
    } else {
        document.querySelectorAll('.collapsible-form').forEach(f => f.classList.remove('show'));
        form.classList.add('show');
        if (idContenedor === 'form-container-cliente') {
            autoAsignarFecha('cli-fecha-registro');
            actualizarTasaFormulario('tasa-valor-form');
            inicializarBuscadoresProducto();
            inicializarBuscadorExistente();
        }
        if (idContenedor === 'form-container-venta') {
            autoAsignarFecha('venta-fecha-registro');
            actualizarTasaFormulario('tasa-valor-form-venta');
            inicializarBuscadoresProductoVenta();
        }
        setTimeout(function() {
            form.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    }
}

// NAVEGACIÓN
function mostrarSeccion(id, subSeccionPorDefecto = 'categorias') {
    document.querySelectorAll('.tab-content').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active'));
    document.querySelectorAll('.collapsible-form').forEach(f => f.classList.remove('show'));
    
    const seccionElem = document.getElementById(id);
    if(seccionElem) seccionElem.classList.add('active');
    
    const btn = Array.from(document.querySelectorAll('.menu-item')).find(b => b.getAttribute('onclick').includes(id));
    if(btn) btn.classList.add('active');

    if(id === 'sec-dashboard') { actualizarDashboard(); inicializarDragCards(); actualizarAlertaStockBajo(); }
    if(id === 'sec-productos') { 
        categoriaEditandoIndex = null;
        marcaEditandoIndex = null;
        productoEditandoIndex = null;
        cambiarSubSeccion(subSeccionPorDefecto);
        actualizarAlertaStockBajo();
    }
    if(id === 'sec-clientes') { 
        clienteEditandoIndex = null; 
        renderizarClientesSimples(); 
    }
    if(id === 'sec-ventas') { 
        clienteEditandoIndex = null; 
        actualizarSelectVentas(); 
        renderizarVentas(); 
    }
}

function cambiarSubSeccion(subSeccion) {
    document.querySelectorAll('.sub-tab-content').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.sub-tab-item').forEach(m => m.classList.remove('active'));
    document.querySelectorAll('.collapsible-form').forEach(f => f.classList.remove('show'));
    
    if(subSeccion === 'categorias') {
        document.getElementById('subsec-categorias').classList.add('active');
        document.getElementById('btn-sub-categorias').classList.add('active');
        renderizarCategorias();
    } else if(subSeccion === 'marcas') {
        document.getElementById('subsec-marcas').classList.add('active');
        document.getElementById('btn-sub-marcas').classList.add('active');
        renderizarMarcas();
    } else if(subSeccion === 'inventario') {
        document.getElementById('subsec-inventario').classList.add('active');
        document.getElementById('btn-sub-inventario').classList.add('active');
        actualizarSelectCategoriasForm();
        actualizarSelectMarcasForm();
        renderizarTabla();
    }
}

// DASHBOARD orden de tarjetas arrastrable
function inicializarDragCards() {
    var grid = document.getElementById('stats-grid');
    if (!grid) return;
    var order = JSON.parse(localStorage.getItem('dashCardOrder') || '[]');
    if (order.length) {
        var cards = Array.from(grid.children);
        var sorted = order.map(function(id) { return cards.find(function(c) { return c.classList.contains(id); }); }).filter(Boolean);
        sorted.forEach(function(c) { grid.appendChild(c); });
    }
    var draggedEl = null;
    grid.addEventListener('dragstart', function(e) {
        var card = e.target.closest('.stat-card');
        if (!card) return;
        draggedEl = card;
        card.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
    });
    grid.addEventListener('dragend', function(e) {
        var card = e.target.closest('.stat-card');
        if (card) card.classList.remove('dragging');
        grid.querySelectorAll('.drag-over').forEach(function(c) { c.classList.remove('drag-over'); });
        var newOrder = Array.from(grid.children).map(function(c) {
            return Array.from(c.classList).find(function(cls) { return cls.startsWith('card-'); });
        }).filter(Boolean);
        localStorage.setItem('dashCardOrder', JSON.stringify(newOrder));
    });
    grid.addEventListener('dragover', function(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        var target = e.target.closest('.stat-card');
        if (!target || target === draggedEl) return;
        grid.querySelectorAll('.drag-over').forEach(function(c) { c.classList.remove('drag-over'); });
        target.classList.add('drag-over');
    });
    grid.addEventListener('dragleave', function(e) {
        var target = e.target.closest('.stat-card');
        if (target) target.classList.remove('drag-over');
    });
    grid.addEventListener('drop', function(e) {
        e.preventDefault();
        grid.querySelectorAll('.drag-over').forEach(function(c) { c.classList.remove('drag-over'); });
        var target = e.target.closest('.stat-card');
        if (!target || target === draggedEl || !draggedEl) return;
        var parent = grid;
        var children = Array.from(parent.children);
        var targetIdx = children.indexOf(target);
        if (targetIdx > children.indexOf(draggedEl)) targetIdx++;
        if (targetIdx >= children.length) parent.appendChild(draggedEl);
        else parent.insertBefore(draggedEl, children[targetIdx]);
    });
}

// DASHBOARD
function actualizarDashboard() {
    if(document.getElementById('dash-prod-totales')) document.getElementById('dash-prod-totales').innerText = inventario.length;
    if(document.getElementById('dash-stock-total')) document.getElementById('dash-stock-total').innerText = inventario.reduce((acc, p) => acc + parseInt(p.cantidad || 0), 0);
    if(document.getElementById('dash-stock-escaso')) document.getElementById('dash-stock-escaso').innerText = inventario.filter(p => p.cantidad > 0 && p.cantidad <= 5).length;
    if(document.getElementById('dash-stock-cero')) document.getElementById('dash-stock-cero').innerText = inventario.filter(p => p.cantidad <= 0).length;
    if(document.getElementById('dash-stock-vendido')) {
        var unidsEntregadas = clientes.reduce(function(acc, v) {
            if (parseFloat(v.total || 0) - parseFloat(v.pagado || 0) > 0) return acc;
            var cants = Array.isArray(v.cantidades) ? v.cantidades : [];
            if (cants.length > 0) return acc + cants.reduce(function(s, c) { return s + (parseInt(c) || 1); }, 0);
            var prods = Array.isArray(v.productos) ? v.productos : (v.productoVendido ? [v.productoVendido] : []);
            return acc + prods.length;
        }, 0);
        document.getElementById('dash-stock-vendido').innerText = unidsEntregadas;
    }
    if(document.getElementById('dash-clientes')) document.getElementById('dash-clientes').innerText = clientes.length;
    if(document.getElementById('dash-total-vendido')) document.getElementById('dash-total-vendido').innerText = `$${clientes.reduce((a,b)=>a+parseFloat(b.total || 0),0).toFixed(2)}`;
    if(document.getElementById('dash-total-pagado')) document.getElementById('dash-total-pagado').innerText = `$${clientes.reduce((a,b)=>a+parseFloat(b.pagado || 0),0).toFixed(2)}`;
    if(document.getElementById('dash-deudas')) document.getElementById('dash-deudas').innerText = `$${clientes.reduce((a,b)=>a+(parseFloat(b.total || 0)-parseFloat(b.pagado || 0)),0).toFixed(2)}`;
    const pedidosEl = document.getElementById('dash-pedidos-pendientes');
    if (pedidosEl) {
        const pedidos = JSON.parse(localStorage.getItem('pedidosPendientes') || '[]');
        pedidosEl.innerText = pedidos.filter(p => (p.estado || 'pendiente') === 'pendiente').length;
    }
    const usuariosEl = document.getElementById('dash-usuarios');
    if (usuariosEl) {
        const usuarios = JSON.parse(localStorage.getItem('usuariosRegistrados') || '[]');
        usuariosEl.innerText = usuarios.length;
    }
    var tasaEl = document.getElementById('dash-tasa-dia');
    if (tasaEl) {
        var modo = localStorage.getItem('modoTasa');
        var tasa = modo === 'auto' ? parseFloat(localStorage.getItem('tasaAuto')) : parseFloat(localStorage.getItem('tasaCambio'));
        tasaEl.innerText = tasa > 0 ? 'Bs. ' + tasa.toFixed(2) : '—';
    }
    actualizarAlertaStockBajo();
    renderizarGraficos();
}

window.limpiarFormularioVenta = function() {
    document.getElementById('form-venta').reset();
    _ventaProductosSeleccionados = [];
    var selContainer = document.getElementById('venta-productos-seleccionados');
    if (selContainer) selContainer.innerHTML = '';
    ['venta-total', 'venta-total-bs', 'venta-pagado', 'venta-pagado-bs'].forEach(function(id) {
        var el = document.getElementById(id);
        if (el) el.value = '';
    });
    var fotoStatus = document.getElementById('num-fotos-venta');
    if (fotoStatus) fotoStatus.innerText = "Ninguno";
    document.getElementById('recibo-preview-area-venta').innerHTML = '';
    document.getElementById('venta-cliente-select').value = '';
    autoAsignarFecha('venta-fecha-registro');
};

window.limpiarFormularioCliente = function() {
    document.getElementById('form-cliente').reset();
    document.querySelectorAll('.cli-producto-input').forEach(function(inp, i) {
        inp.value = '';
        var fila = inp.closest('.producto-fila');
        if (fila) {
            var cantInput = fila.querySelector('.cli-producto-cant');
            if (cantInput) cantInput.value = '1';
        }
        if (i > 0) fila?.remove();
    });
    document.querySelectorAll('.btn-remove-prod').forEach(function(b) {
        b.style.display = 'none';
    });
    ['cli-total', 'cli-total-bs', 'cli-pagado', 'cli-pagado-bs'].forEach(function(id) {
        var el = document.getElementById(id);
        if (el) el.value = '';
    });
    var fotoStatus = document.getElementById('num-fotos');
    if (fotoStatus) fotoStatus.innerText = "Ninguno";
    document.getElementById('recibo-preview-area').innerHTML = '';
    document.getElementById('cli-buscar-existente').value = '';
    document.getElementById('cli-resultados-existentes').classList.remove('show');
    autoAsignarFecha();
};

function actualizarSelectClientes() {
    actualizarTasaFormulario('tasa-valor-form');
    autoAsignarFecha('cli-fecha-registro');
    inicializarBuscadoresProducto();
    inicializarBuscadorExistente();
}
function actualizarSelectVentas() {
    actualizarTasaFormulario('tasa-valor-form-venta');
    autoAsignarFecha('venta-fecha-registro');
    inicializarBuscadoresProductoVenta();
    actualizarSelectClientesVenta();
}
function inicializarBuscadoresProductoVenta() {
    // No-op: replaced by modal product selector
}
function actualizarSelectClientesVenta() {
    var sel = document.getElementById('venta-cliente-select');
    if (!sel) return;
    var groups = {};
    clientes.forEach(function(c) {
        var key = (c.nombre + '|' + c.tel).toLowerCase();
        if (!groups[key]) groups[key] = { nombre: c.nombre, tel: c.tel };
    });
    JSON.parse(localStorage.getItem('usuariosRegistrados') || '[]').forEach(function(u) {
        var key = (u.nombre + '|' + u.tel).toLowerCase();
        if (!groups[key]) groups[key] = { nombre: u.nombre, tel: u.tel };
    });
    var currentVal = sel.value;
    sel.innerHTML = '<option value="">Seleccionar cliente...</option>';
    Object.keys(groups).forEach(function(key) {
        var g = groups[key];
        sel.innerHTML += '<option value="' + escapeHtml(key) + '">' + escapeHtml(g.nombre) + ' — ' + escapeHtml(g.tel) + '</option>';
    });
    if (currentVal) sel.value = currentVal;
    sel.onchange = function() {
        if (this.value) {
            var parts = this.value.split('|');
            document.getElementById('venta-nombre').value = parts[0];
            document.getElementById('venta-telefono').value = parts[1];
        }
    };
}
function inicializarBuscadoresProducto() {
    document.querySelectorAll('.cli-producto-input').forEach(function(inp) {
        if (inp._listenerInicializado) return;
        inp._listenerInicializado = true;
        inp.addEventListener('input', function() { Clientes.filtrarProductos(this); });
        inp.addEventListener('blur', function() { setTimeout(function() { Clientes.cerrarProductDropdown(inp); }, 200); });
        inp.addEventListener('focus', function() { if (this.value) Clientes.filtrarProductos(this); });
        var fila = inp.closest('.producto-fila');
        if (fila) {
            var cantInput = fila.querySelector('.cli-producto-cant');
            if (cantInput && !cantInput._listenerInicializado) {
                cantInput._listenerInicializado = true;
                cantInput.addEventListener('input', function() { recalcularTotalProductos(); });
            }
        }
    });
}
function inicializarBuscadorExistente() {
    var input = document.getElementById('cli-buscar-existente');
    if (!input || input._listenerInicializado) return;
    input._listenerInicializado = true;
    input.addEventListener('input', function() { Clientes.buscarExistente(this.value); });
    input.addEventListener('blur', function() { 
        setTimeout(function() { 
            document.getElementById('cli-resultados-existentes')?.classList.remove('show'); 
        }, 200); 
    });
    input.addEventListener('focus', function() { if (this.value) Clientes.buscarExistente(this.value); });
}
function autoAsignarFecha(inputId) {
    const fechaInput = document.getElementById(inputId);
    if (fechaInput && !fechaInput.value) {
        const hoy = new Date();
        fechaInput.value = hoy.toISOString().split('T')[0];
    }
}
function actualizarTasaFormulario(elId) {
    const tasaEl = document.getElementById(elId);
    if (!tasaEl) return;
    var modo = localStorage.getItem('modoTasa');
    var tasa = 0;
    if (modo === 'auto') {
        tasa = parseFloat(localStorage.getItem('tasaAuto')) || 0;
    } else {
        tasa = parseFloat(localStorage.getItem('tasaCambio')) || 0;
    }
    tasaEl.textContent = tasa > 0 ? 'Bs. ' + tasa.toFixed(2) : '—';
}

window.agregarFilaProducto = function() {
    const container = document.getElementById('productos-container');
    const fila = document.createElement('div');
    fila.className = 'producto-fila';
    fila.innerHTML = '<div class="product-search-wrapper">'
        + '<input type="text" class="cli-producto-input" placeholder="Buscar producto..." autocomplete="off">'
        + '<div class="product-search-dropdown"></div>'
        + '</div>'
        + '<input type="number" class="cli-producto-cant" value="1" min="1" style="width:60px;height:45px;padding:6px 8px;border-radius:10px;border:1px solid var(--border-darker);font-family:inherit;font-size:0.9rem;background:#f8fafc;text-align:center;flex-shrink:0;">'
        + '<button type="button" class="btn-remove-prod" onclick="var p=this.closest(\'#productos-container\');if(p&&p.querySelectorAll(\'.producto-fila\').length>1){this.closest(\'.producto-fila\').remove();}">✕</button>';
    container.appendChild(fila);
    const input = fila.querySelector('.cli-producto-input');
    input.addEventListener('input', function() { Clientes.filtrarProductos(this); });
    input.addEventListener('blur', function() { setTimeout(function() { Clientes.cerrarProductDropdown(input); }, 200); });
    input.addEventListener('focus', function() { if (this.value) Clientes.filtrarProductos(this); });
    fila.querySelector('.cli-producto-cant').addEventListener('input', function() { recalcularTotalProductos(); });
    document.querySelectorAll('.producto-fila .btn-remove-prod').forEach(function(b) {
        b.style.display = container.children.length > 1 ? 'flex' : 'none';
    });
};

window.agregarFilaProductoVenta = function() {
    Ventas.abrirSeleccionProductos();
};

function recalcularTotalProductos() {
    var total = 0;
    var filas = document.querySelectorAll('#productos-container .producto-fila');

    filas.forEach(function(fila) {
        var inp = fila.querySelector('.cli-producto-input');
        var cant = parseInt(fila.querySelector('.cli-producto-cant')?.value || 1);
        var prod = inventario.find(function(p) { return p.nombre === inp.value.trim(); });
        if (prod) total += prod.precio * Math.max(1, cant);
    });
    var totalInput = document.getElementById('cli-total');
    if (totalInput && total > 0) {
        totalInput.value = total.toFixed(2);
        totalInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
}

function recalcularTotalProductosVenta() {
    var total = 0;
    (_ventaProductosSeleccionados || []).forEach(function(sp) {
        total += sp.precio * (sp.cantidad || 1);
    });
    var totalInput = document.getElementById('venta-total');
    if (totalInput && total > 0) {
        totalInput.value = total.toFixed(2);
        totalInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
}

// CATEGORÍAS
function renderizarCategorias() {
    const tabla = document.getElementById('tabla-categorias');
    if(!tabla) return;
    const terminoBusqueda = document.getElementById('buscar-categoria')?.value.toLowerCase() || '';
    
    tabla.innerHTML = categories.map((cat, i) => {
        if (terminoBusqueda && !cat.nombre.toLowerCase().includes(terminoBusqueda)) return '';
        var fotoUrl = (cat.foto || '').replace(/"/g, '&quot;');
        var catNombre = escapeHtml(cat.nombre);
        let fotoRender = cat.foto
            ? `<div class="mini-fotos-stack" onclick="abrirManagerSingleFoto('categoria', ${i})"><img src="${fotoUrl}" class="img-preview-recibo"></div>`
            : `<button class="btn-edit-action" onclick="abrirManagerSingleFoto('categoria', ${i})" style="font-size:0.75rem;">📸 Foto</button>`;

        if (categoriaEditandoIndex === i) {
            return `<tr class="editing-row">
                <td>—</td>
                <td><input type="text" id="edit-cat-nombre-${i}" value="${catNombre}" class="table-input-compact" required></td>
                <td class="table-actions-cell" style="justify-content: center;"><button onclick="guardarEdicionCategoria(${i})" class="btn-save">💾</button> <button onclick="cancelarEdicionCategoria()" class="btn-cancel">❌</button> <button onclick="eliminarCategoria(${i})" class="btn-delete">🗑️</button></td>
            </tr>`;
        }
        return `<tr>
            <td>${fotoRender}</td>
            <td><strong>${catNombre}</strong></td>
            <td class="table-actions-cell" style="justify-content: center;"><button onclick="activarEdicionCategoria(${i})" class="btn-edit-action">✏️ Editar</button></td>
        </tr>`;
    }).join('');
}
function activarEdicionCategoria(index) { categoriaEditandoIndex = index; renderizarCategorias(); }
function cancelarEdicionCategoria() { categoriaEditandoIndex = null; renderizarCategorias(); }
function guardarEdicionCategoria(index) {
    const nuevoNombre = document.getElementById(`edit-cat-nombre-${index}`).value.trim();
    if(!nuevoNombre) return;
    categories[index].nombre = nuevoNombre;
    categoriaEditandoIndex = null;
    actualizarSistema();
    renderizarCategorias();
    mostrarToastNotificacion("Categoría actualizada");
}
async function eliminarCategoria(index) {
    if(!(await mostrarConfirmacion("¿Eliminar categoría?"))) return;
    categories.splice(index, 1);
    actualizarSistema();
    renderizarCategorias();
}
function actualizarSelectCategoriasForm() {
    const select = document.getElementById('categoria');
    if (select) select.innerHTML = categories.map(c => '<option value="' + escapeHtml(c.nombre) + '">' + escapeHtml(c.nombre) + '</option>').join('');
}

// MARCAS
function renderizarMarcas() {
    const tabla = document.getElementById('tabla-marcas');
    if(!tabla) return;
    const terminoBusqueda = document.getElementById('buscar-marca')?.value.toLowerCase() || '';
    
    tabla.innerHTML = marcas.map((mar, i) => {
        if (terminoBusqueda && !mar.nombre.toLowerCase().includes(terminoBusqueda)) return '';
        var fotoUrl = (mar.foto || '').replace(/"/g, '&quot;');
        var marNombre = escapeHtml(mar.nombre);
        let fotoRender = mar.foto
            ? `<div class="mini-fotos-stack" onclick="abrirManagerSingleFoto('marca', ${i})"><img src="${fotoUrl}" class="img-preview-recibo"></div>`
            : `<button class="btn-edit-action" onclick="abrirManagerSingleFoto('marca', ${i})" style="font-size:0.75rem;">📸 Foto</button>`;

        if (marcaEditandoIndex === i) {
            return `<tr class="editing-row">
                <td>—</td>
                <td><input type="text" id="edit-mar-nombre-${i}" value="${marNombre}" class="table-input-compact" required></td>
                <td class="table-actions-cell" style="justify-content: center;"><button onclick="guardarEdicionMarca(${i})" class="btn-save">💾</button> <button onclick="cancelarEdicionMarca()" class="btn-cancel">❌</button> <button onclick="eliminarMarca(${i})" class="btn-delete">🗑️</button></td>
            </tr>`;
        }
        return `<tr>
            <td>${fotoRender}</td>
            <td><strong>${marNombre}</strong></td>
            <td class="table-actions-cell" style="justify-content: center;"><button onclick="activarEdicionMarca(${i})" class="btn-edit-action">✏️ Editar</button></td>
        </tr>`;
    }).join('');
}
function activarEdicionMarca(index) { marcaEditandoIndex = index; renderizarMarcas(); }
function cancelarEdicionMarca() { marcaEditandoIndex = null; renderizarMarcas(); }
function guardarEdicionMarca(index) {
    const nuevoNombre = document.getElementById(`edit-mar-nombre-${index}`).value.trim();
    if(!nuevoNombre) return;
    marcas[index].nombre = nuevoNombre;
    marcaEditandoIndex = null;
    actualizarSistema();
    renderizarMarcas();
    mostrarToastNotificacion("Marca actualizada");
}
async function eliminarMarca(index) {
    if(!(await mostrarConfirmacion("¿Eliminar marca?"))) return;
    marcas.splice(index, 1);
    actualizarSistema();
    renderizarMarcas();
}
function actualizarSelectMarcasForm() {
    const select = document.getElementById('marca-select');
    if (select) select.innerHTML = marcas.map(m => '<option value="' + escapeHtml(m.nombre) + '">' + escapeHtml(m.nombre) + '</option>').join('');
}

function generarCodigoAuto(categoria, marca) {
    var cat = (categoria || '').slice(0, 3).toUpperCase();
    var mar = (marca || '').slice(0, 2).toUpperCase();
    var prefijo = cat + mar;
    if (!prefijo || prefijo.length < 2) prefijo = 'PROD';
    var maxNum = 0;
    inventario.forEach(function(p) {
        if (p.codigo && p.codigo.startsWith(prefijo)) {
            var num = parseInt(p.codigo.replace(prefijo + '-', '')) || 0;
            if (num > maxNum) maxNum = num;
        }
    });
    return prefijo + '-' + String(maxNum + 1).padStart(3, '0');
}

function generarCodigoPreview() {
    var cat = document.getElementById('categoria')?.value || '';
    var mar = document.getElementById('marca-select')?.value || '';
    var codInput = document.getElementById('codigo');
    if (!codInput) return;
    if (cat && mar) {
        codInput.value = generarCodigoAuto(cat, mar);
    } else {
        codInput.value = '';
    }
}

// INVENTARIO GLOBAL
if (document.getElementById('inv-form')) {
    document.getElementById('inv-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const files = document.getElementById('prod-foto').files;
        let listaUrls = [];
        for(let i=0; i<files.length; i++) {
            listaUrls.push(await procesarImagen(files[i], 'productos', 1200));
        }
        const nombreProd = document.getElementById('nombre').value;
        var codIngresado = document.getElementById('codigo').value.trim();
        if (!codIngresado) codIngresado = generarCodigoAuto(document.getElementById('categoria').value, document.getElementById('marca-select').value);
        inventario.push({
            nombre: nombreProd,
            codigo: codIngresado,
            categoria: document.getElementById('categoria').value,
            marca: document.getElementById('marca-select').value,
            cantidad: parseInt(document.getElementById('cantidad').value),
            precio: parseFloat(document.getElementById('precio').value),
            descripcion: document.getElementById('descripcion').value.trim(),
            activo: document.getElementById('prod-activo').checked,
            fotos: listaUrls 
        });
        actualizarSistema();
        renderizarTabla();
        e.target.reset();
        document.getElementById('num-fotos-prod').innerText = "Ningún archivo seleccionado";
        toggleFormulario('form-container-inventario');
        registrarActividad('Producto creado', nombreProd);
        mostrarToastNotificacion(`"${nombreProd}" guardado en almacén`);
    });
}

// ===== MODAL MÚLTIPLES PRODUCTOS =====
var _multiProdContador = 0;

window.abrirModalProductosMultiples = function() {
    document.getElementById('multi-prod-lista').innerHTML = '';
    _multiProdContador = 0;
    agregarFilaProductoMultiple();
    document.getElementById('multi-prod-modal').style.display = 'flex';
};

window.cerrarModalProductosMultiples = function() {
    document.getElementById('multi-prod-modal').style.display = 'none';
};

window.agregarFilaProductoMultiple = function() {
    var id = _multiProdContador++;
    var container = document.getElementById('multi-prod-lista');
    var div = document.createElement('div');
    div.className = 'producto-multi-fila';
    div.id = 'multi-prod-fila-' + id;
    div.innerHTML = '<div class="producto-multi-grid">'
        + '<div class="form-group" style="gap:4px;"><label>Producto *</label><input type="text" id="multi-nombre-' + id + '" class="table-input-compact" placeholder="Ej. Marcador" required></div>'
        + '<div class="form-group" style="gap:4px;"><label>Código</label><input type="text" id="multi-cod-' + id + '" class="table-input-compact" placeholder="SKU"></div>'
        + '<div class="form-group" style="gap:4px;"><label>Categoría</label><select id="multi-cat-' + id + '" class="table-input-compact">' + categories.map(function(c){return '<option value="' + escapeHtml(c.nombre) + '">' + escapeHtml(c.nombre) + '</option>';}).join('') + '</select></div>'
        + '<div class="form-group" style="gap:4px;"><label>Marca</label><select id="multi-mar-' + id + '" class="table-input-compact">' + marcas.map(function(m){return '<option value="' + escapeHtml(m.nombre) + '">' + escapeHtml(m.nombre) + '</option>';}).join('') + '</select></div>'
        + '<div class="form-group" style="gap:4px;"><label>Cantidad</label><input type="number" id="multi-cant-' + id + '" class="table-input-compact" value="1" min="0"></div>'
        + '<div class="form-group" style="gap:4px;"><label>Precio $</label><input type="number" id="multi-precio-' + id + '" step="0.01" class="table-input-compact" placeholder="0.00"></div>'
        + '<div class="form-group" style="gap:4px;"><label>Foto</label><label for="multi-foto-' + id + '" class="file-upload-btn" style="padding:8px;font-size:0.8rem;margin:0;height:auto;">📁</label><input type="file" id="multi-foto-' + id + '" accept="image/*" multiple style="display:none;" onchange="actualizarStatusMultiFoto(' + id + ')"><span id="multi-foto-status-' + id + '" class="file-status" style="font-size:0.7rem;">—</span></div>'
        + '<div class="form-group" style="gap:4px;justify-content:flex-end;"><button type="button" class="btn-remove-prod" onclick="eliminarFilaProductoMultiple(' + id + ')" style="margin-top:18px;">✕</button></div>'
        + '</div>';
    container.appendChild(div);
};

window.actualizarStatusMultiFoto = function(id) {
    var input = document.getElementById('multi-foto-' + id);
    var status = document.getElementById('multi-foto-status-' + id);
    if (input && status) {
        status.textContent = input.files.length > 0 ? '✔️ ' + input.files.length : '—';
    }
};

window.eliminarFilaProductoMultiple = function(id) {
    var fila = document.getElementById('multi-prod-fila-' + id);
    if (fila) fila.remove();
};

window.guardarProductosMultiples = async function() {
    var filas = document.querySelectorAll('#multi-prod-lista .producto-multi-fila');
    if (filas.length === 0) { mostrarToastNotificacion('Agregue al menos un producto', 'error'); return; }
    var guardados = 0;
    var errores = [];
    for (var fi = 0; fi < filas.length; fi++) {
        var fila = filas[fi];
        var id = fila.id.replace('multi-prod-fila-', '');
        var nombre = document.getElementById('multi-nombre-' + id)?.value.trim();
        if (!nombre) { errores.push('Fila ' + (fi+1) + ': nombre vacío'); continue; }
        if (inventario.some(function(p) { return p.nombre === nombre; })) {
            errores.push('"' + nombre + '" ya existe');
            continue;
        }
        var files = document.getElementById('multi-foto-' + id)?.files || [];
        var fotosUrls = [];
        for (var f = 0; f < files.length; f++) {
            fotosUrls.push(await procesarImagen(files[f], 'productos', 1200));
        }
        var codMultiple = document.getElementById('multi-cod-' + id)?.value?.trim() || '';
        if (!codMultiple) codMultiple = generarCodigoAuto(
            document.getElementById('multi-cat-' + id)?.value || '',
            document.getElementById('multi-mar-' + id)?.value || ''
        );
        inventario.push({
            nombre: nombre,
            codigo: codMultiple,
            categoria: document.getElementById('multi-cat-' + id)?.value || '',
            marca: document.getElementById('multi-mar-' + id)?.value || '',
            cantidad: parseInt(document.getElementById('multi-cant-' + id)?.value || 0),
            precio: parseFloat(document.getElementById('multi-precio-' + id)?.value || 0),
            descripcion: '',
            activo: true,
            fotos: fotosUrls
        });
        guardados++;
    }
    if (guardados === 0) { mostrarToastNotificacion('No se pudo guardar ningún producto: ' + errores.join(', '), 'error'); return; }
    actualizarSistema();
    renderizarTabla();
    cerrarModalProductosMultiples();
    registrarActividad('Productos múltiples creados', guardados + ' producto(s)');
    mostrarToastNotificacion(guardados + ' producto(s) guardados en almacén' + (errores.length > 0 ? ' (' + errores.length + ' error(es))' : ''));
};

function renderizarTabla() {
    const cuerpo = document.getElementById('tabla-cuerpo');
    if (!cuerpo) return;
    const busqueda = document.getElementById('buscar-prod-nombre')?.value.toLowerCase() || '';

    cuerpo.innerHTML = inventario.map((p, i) => {
        if (busqueda && !p.nombre.toLowerCase().includes(busqueda) && !p.marca.toLowerCase().includes(busqueda)) return '';
        let fotosArray = p.fotos || [];

        if (productoEditandoIndex === i) {
            var desc = escapeHtml(p.descripcion || '');
            return `
                <tr class="editing-row">
                    <td>[Editando]</td>
                    <td><input type="text" id="edit-prod-nombre-${i}" value="${p.nombre}" class="table-input-compact"></td>
                    <td><input type="text" id="edit-prod-cod-${i}" value="${p.codigo||''}" class="table-input-compact" style="width:80px;"></td>
                    <td><select id="edit-prod-cat-${i}" class="table-input-compact">${categories.map(c=>`<option value="${c.nombre}" ${c.nombre===p.categoria?'selected':''}>${c.nombre}</option>`).join('')}</select></td>
                    <td><select id="edit-prod-mar-${i}" class="table-input-compact">${marcas.map(m=>`<option value="${m.nombre}" ${m.nombre===p.marca?'selected':''}>${m.nombre}</option>`).join('')}</select></td>
                    <td><input type="number" id="edit-prod-cant-${i}" value="${p.cantidad}" class="table-input-compact" style="width:60px;"></td>
                    <td><input type="number" id="edit-prod-prec-${i}" value="${p.precio}" step="0.01" class="table-input-compact" style="width:70px;"></td>
                    <td><label style="display:flex;align-items:center;gap:4px;font-size:0.75rem;"><input type="checkbox" id="edit-prod-activo-${i}" ${p.activo!==false?'checked':''}> Activo</label></td>
                    <td class="table-actions-cell">
                        <button onclick="guardarEdicionProducto(${i})" class="btn-save">💾</button>
                        <button onclick="cancelarEdicionProducto()" class="btn-cancel">❌</button>
                        <button onclick="eliminarRegistro('inv', ${i})" class="btn-delete">🗑️</button>
                    </td>
                </tr>
                <tr class="editing-desc-row">
                    <td colspan="9" style="padding:4px 12px 12px;">
                        <textarea id="edit-prod-desc-${i}" placeholder="Descripción (opcional)" style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:8px;font-family:inherit;font-size:0.85rem;min-height:50px;resize:vertical;box-sizing:border-box;">${desc}</textarea>
                    </td>
                </tr>`;
        }

        let renderFotos = fotosArray.length > 0
            ? `<div class="mini-fotos-stack" onclick="abrirManagerFotosProducto(${i})">${fotosArray.slice(0, 2).map(img => `<img src="${img}" class="img-preview-recibo">`).join('')}${fotosArray.length > 2 ? `<span class="badge-mas-fotos">+${fotosArray.length - 2}</span>` : ''}</div>`
            : `<button class="btn-edit-action" onclick="abrirManagerFotosProducto(${i})" style="font-size:0.75rem;">📸 Subir</button>`;
        var estadoBadge = p.activo !== false ? '<span class="badge-estado activo">Activo</span>' : '<span class="badge-estado inactivo">Inactivo</span>';
        return `<tr><td>${renderFotos}</td><td><strong>${p.nombre}</strong></td><td style="font-size:0.8rem;color:#64748b;">${p.codigo||'—'}</td><td>${p.categoria||'—'}</td><td><span class="badge-producto">${p.marca||'—'}</span></td><td><span class="stock-marker ${p.cantidad <= 0 ? 'stock-rojo' : p.cantidad <= 5 ? 'stock-amarillo' : 'stock-verde'}">${p.cantidad}</span></td><td>$${p.precio.toFixed(2)}</td><td>${estadoBadge}</td><td class="table-actions-cell" style="justify-content:center;"><button onclick="activarEdicionProducto(${i})" class="btn-edit-action">✏️ Editar</button></td></tr>`;
    }).join('');
}
function activarEdicionProducto(index) { productoEditandoIndex = index; renderizarTabla(); }
function cancelarEdicionProducto() { productoEditandoIndex = null; renderizarTabla(); }

window.exportarInventarioCSV = function() {
    var rows = [['Producto','Código','Categoría','Marca','Stock','Precio USD','Estado']];
    inventario.forEach(function(p) {
        rows.push([p.nombre, p.codigo||'', p.categoria||'—', p.marca||'—', p.cantidad, p.precio.toFixed(2), p.activo!==false?'Activo':'Inactivo']);
    });
    var csv = rows.map(function(r) { return r.map(function(v) { return '"' + String(v).replace(/"/g, '""') + '"'; }).join(','); }).join('\n');
    var blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'inventario_export.csv'; a.click();
    mostrarToastNotificacion('📥 Inventario exportado');
};

window._vistaInventario = 'tabla';
window.toggleVistaInventario = function() {
    _vistaInventario = _vistaInventario === 'tabla' ? 'tarjetas' : 'tabla';
    var btn = document.getElementById('btn-vista-inventario');
    if (btn) btn.innerHTML = _vistaInventario === 'tabla' ? '📇 Tarjetas' : '📋 Tabla';
    var wrapper = document.getElementById('inventario-table-wrapper');
    var cards = document.getElementById('inventario-card-view');
    if (wrapper) wrapper.style.display = _vistaInventario === 'tabla' ? '' : 'none';
    if (cards) cards.style.display = _vistaInventario === 'tarjetas' ? '' : 'none';
    if (_vistaInventario === 'tarjetas') renderizarInventarioTarjetas();
};

function renderizarInventarioTarjetas() {
    var container = document.getElementById('inventario-card-view');
    if (!container) return;
    var busqueda = document.getElementById('buscar-prod-nombre')?.value.toLowerCase() || '';
    container.innerHTML = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px;padding:8px;">'
        + inventario.map(function(p, i) {
            if (busqueda && !p.nombre.toLowerCase().includes(busqueda) && !p.marca.toLowerCase().includes(busqueda)) return '';
            var foto = p.fotos && p.fotos.length > 0 ? '<img src="' + p.fotos[0] + '" style="width:100%;height:120px;object-fit:cover;border-radius:10px;margin-bottom:8px;">' : '<div style="width:100%;height:120px;background:#f1f5f9;border-radius:10px;display:flex;align-items:center;justify-content:center;color:#94a3b8;font-size:2rem;margin-bottom:8px;">📦</div>';
            var sc = p.cantidad <= 0 ? 'stock-rojo' : p.cantidad <= 5 ? 'stock-amarillo' : 'stock-verde';
            var estBadge = p.activo !== false ? '<span style="font-size:0.65rem;color:#16a34a;">Activo</span>' : '<span style="font-size:0.65rem;color:#94a3b8;">Inactivo</span>';
            return '<div style="background:var(--bg-card,#fff);border-radius:16px;padding:14px;box-shadow:var(--card-shadow);border:1px solid var(--border-light,#e2e8f0);cursor:pointer;" onclick="abrirManagerFotosProducto(' + i + ')">'
                + foto
                + '<div style="font-weight:700;font-size:0.9rem;color:var(--text-primary,#1e293b);margin-bottom:2px;">' + escapeHtml(p.nombre) + '</div>'
                + (p.codigo ? '<div style="font-size:0.7rem;color:#94a3b8;margin-bottom:2px;">' + p.codigo + '</div>' : '')
                + '<div style="font-size:0.75rem;color:var(--text-secondary,#64748b);">' + (p.categoria||'—') + ' · ' + (p.marca||'—') + ' · ' + estBadge + '</div>'
                + '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;">'
                + '<span class="stock-marker ' + sc + '" style="font-size:0.75rem;padding:2px 8px;">' + p.cantidad + '</span>'
                + '<span style="font-weight:700;color:#059669;">$' + p.precio.toFixed(2) + '</span>'
                + '</div></div>';
        }).join('')
        + '</div>';
}
function guardarEdicionProducto(index) {
    inventario[index].nombre = document.getElementById(`edit-prod-nombre-${index}`).value;
    var codEl = document.getElementById(`edit-prod-cod-${index}`);
    if (codEl) inventario[index].codigo = codEl.value.trim();
    inventario[index].categoria = document.getElementById(`edit-prod-cat-${index}`).value;
    inventario[index].marca = document.getElementById(`edit-prod-mar-${index}`).value;
    inventario[index].cantidad = parseInt(document.getElementById(`edit-prod-cant-${index}`).value);
    inventario[index].precio = parseFloat(document.getElementById(`edit-prod-prec-${index}`).value);
    var descEl = document.getElementById(`edit-prod-desc-${index}`);
    if (descEl) inventario[index].descripcion = descEl.value.trim();
    var activoEl = document.getElementById(`edit-prod-activo-${index}`);
    if (activoEl) inventario[index].activo = activoEl.checked;
    productoEditandoIndex = null;
    actualizarSistema();
    renderizarTabla();
    mostrarToastNotificacion("Producto modificado");
}

// CLIENTES 
var _clientesFilter = 'all';
var _clientesExpanded = {};

window.Clientes = {
    // === PRODUCTO BUSCADOR ===
    filtrarProductos: function(input) {
        var wrapper = input.closest('.product-search-wrapper');
        if (!wrapper) return;
        var dropdown = wrapper.querySelector('.product-search-dropdown');
        var term = input.value.toLowerCase().trim();
        if (!term) { dropdown.classList.remove('show'); return; }
        var matches = inventario.filter(function(p) {
            return p.nombre.toLowerCase().includes(term)
                || (p.marca && p.marca.toLowerCase().includes(term))
                || (p.categoria && p.categoria.toLowerCase().includes(term));
        });
        if (matches.length === 0) {
            dropdown.innerHTML = '<div class="product-search-item no-results">Sin resultados</div>';
            dropdown.classList.add('show');
            return;
        }
        dropdown.innerHTML = matches.slice(0, 15).map(function(p) {
            var stockClass = p.cantidad <= 0 ? 'stock-rojo' : p.cantidad <= 5 ? 'stock-amarillo' : 'stock-verde';
            var stockLabel = p.cantidad <= 5 ? ' <span class="stock-marker ' + stockClass + '" style="font-size:0.65rem;padding:1px 6px;">' + p.cantidad + '</span>' : '';
            return '<div class="product-search-item" data-producto="' + escapeHtml(p.nombre) + '">'
                + '<span class="psi-nombre">' + escapeHtml(p.nombre) + '</span>'
                + '<span><span class="psi-precio">$' + p.precio.toFixed(2) + '</span>' + stockLabel + '</span>'
                + '</div>';
        }).join('');
        dropdown.classList.add('show');
        dropdown.querySelectorAll('.product-search-item').forEach(function(item) {
            item.addEventListener('mousedown', function(e) {
                e.preventDefault();
                var nombre = this.getAttribute('data-producto');
                input.value = nombre;
                dropdown.classList.remove('show');
                recalcularTotalProductos();
            });
        });
    },
    cerrarProductDropdown: function(input) {
        var wrapper = input.closest('.product-search-wrapper');
        if (wrapper) {
            var dropdown = wrapper.querySelector('.product-search-dropdown');
            if (dropdown) dropdown.classList.remove('show');
        }
    },
    // === CLIENTE EXISTENTE ===
    buscarExistente: function(termino) {
        var dropdown = document.getElementById('cli-resultados-existentes');
        if (!termino || termino.length < 2) { dropdown.classList.remove('show'); return; }
        var term = termino.toLowerCase().trim();
        var groups = buildClientGroups();
        var matches = [];
        Object.keys(groups).forEach(function(key) {
            var g = groups[key];
            if (g.nombre.toLowerCase().includes(term) || g.tel.toLowerCase().includes(term)) {
                matches.push(g);
            }
        });
        if (matches.length === 0) {
            dropdown.innerHTML = '<div class="existente-item" style="color:#94a3b8;justify-content:center;cursor:default;">Sin resultados</div>';
            dropdown.classList.add('show');
            return;
        }
        var totalEncontrados = matches.length;
        dropdown.innerHTML = '<div class="existente-item" style="color:#64748b;justify-content:center;cursor:default;font-size:0.8rem;border-bottom:1px solid #e2e8f0;padding:6px 16px;">' + totalEncontrados + ' cliente(s) encontrado(s)</div>';
        dropdown.innerHTML += matches.slice(0, 10).map(function(g) {
            return '<div class="existente-item" data-nombre="' + escapeHtml(g.nombre) + '" data-tel="' + escapeHtml(g.tel) + '">'
                + '<div><div class="ei-nombre">' + escapeHtml(g.nombre) + '</div>'
                + '<div class="ei-tel">📞 ' + escapeHtml(g.tel) + '</div></div>'
                + '<span class="ei-compras">' + g.entries.length + ' compra(s)</span>'
                + '</div>';
        }).join('');
        dropdown.classList.add('show');
        dropdown.querySelectorAll('.existente-item').forEach(function(item) {
            item.addEventListener('mousedown', function(e) {
                e.preventDefault();
                var nombre = this.getAttribute('data-nombre');
                var tel = this.getAttribute('data-tel');
                document.getElementById('cli-nombre').value = nombre;
                document.getElementById('cli-telefono').value = tel;
                dropdown.classList.remove('show');
                document.getElementById('cli-buscar-existente').value = '';
                mostrarToastNotificacion('Cliente "' + nombre + '" cargado. Complete la venta.');
            });
        });
    },
    setFilter: function(filter) {
        _clientesFilter = filter;
        document.querySelectorAll('.clientes-filter-btn').forEach(function(b) {
            b.classList.toggle('active', b.getAttribute('data-filter') === filter);
        });
        renderizarClientes();
    },
    toggleGroup: function(gi) {
        _clientesExpanded[gi] = !_clientesExpanded[gi];
        renderizarClientes();
    },
    abrirAbono: function(index) {
        var c = clientes[index];
        document.getElementById('abono-modal-titulo').innerText = 'Registrar Abono';
        var deuda = (c.total||0) - (c.pagado||0);
        document.getElementById('abono-modal-desc').innerHTML = 'Cliente: <strong>' + escapeHtml(c.nombre) + '</strong> — Deuda actual: <strong style="color:#ef4444;">$' + Math.max(0, deuda).toFixed(2) + '</strong>';
        document.getElementById('abono-usd').value = '';
        document.getElementById('abono-bs').value = '';
        document.getElementById('abono-modal').dataset.index = index;
        document.getElementById('abono-modal').dataset.tipo = 'single';
        document.getElementById('abono-modal').style.display = 'flex';
        autoCalcAbono();
    },
    abrirAbonoGrupo: function(gi) {
        var groups = buildClientGroups();
        var keys = Object.keys(groups);
        var g = groups[keys[gi]];
        var totalCompras = 0, totalPagado = 0;
        g.entries.forEach(function(e) {
            totalCompras += e.data.total || 0;
            totalPagado += e.data.pagado || 0;
        });
        var deuda = totalCompras - totalPagado;
        document.getElementById('abono-modal-titulo').innerText = 'Registrar Abono - ' + g.nombre;
        document.getElementById('abono-modal-desc').innerHTML = 'Cliente: <strong>' + escapeHtml(g.nombre) + '</strong> — Deuda total: <strong style="color:#ef4444;">$' + Math.max(0, deuda).toFixed(2) + '</strong>';
        document.getElementById('abono-usd').value = '';
        document.getElementById('abono-bs').value = '';
        document.getElementById('abono-modal').dataset.tipo = 'grupo';
        document.getElementById('abono-modal').dataset.grupo = gi;
        document.getElementById('abono-modal').dataset.nombre = g.nombre;
        document.getElementById('abono-modal').style.display = 'flex';
        autoCalcAbono();
    },
    cerrarAbono: function() {
        document.getElementById('abono-modal').style.display = 'none';
    },
    guardarAbono: function() {
        var usd = parseFloat(document.getElementById('abono-usd').value) || 0;
        var bs = parseFloat(document.getElementById('abono-bs').value) || 0;
        if (usd <= 0 && bs <= 0) { mostrarToastNotificacion('Ingrese un monto', 'error'); return; }
        var fecha = document.getElementById('abono-fecha').value || new Date().toISOString().split('T')[0];
        var tasa = parseFloat(document.getElementById('abono-tasa').value) || 0;
        var abonoRecord = { fecha: fecha, tasa: tasa, usd: usd, bs: bs };
        var tipo = document.getElementById('abono-modal').dataset.tipo;
        if (tipo === 'grupo') {
            var gi = parseInt(document.getElementById('abono-modal').dataset.grupo);
            var groups = buildClientGroups();
            var keys = Object.keys(groups);
            var g = groups[keys[gi]];
            var ultimo = g.entries[g.entries.length - 1];
            var idx = ultimo.index;
            if (!clientes[idx].abonos) clientes[idx].abonos = [];
            clientes[idx].abonos.push(abonoRecord);
            clientes[idx].pagado = (clientes[idx].pagado || 0) + usd;
            clientes[idx].pagadoBs = (clientes[idx].pagadoBs || 0) + bs;
            actualizarSistema();
            Clientes.cerrarAbono();
            renderizarVentas();
            renderizarClientesSimples();
            mostrarToastNotificacion('Abono registrado para ' + g.nombre + ': $' + usd.toFixed(2) + (bs > 0 ? ' + Bs. ' + bs.toFixed(2) : ''));
        } else {
            var index = parseInt(document.getElementById('abono-modal').dataset.index);
            var c = clientes[index];
            if (!c.abonos) c.abonos = [];
            c.abonos.push(abonoRecord);
            c.pagado = (c.pagado || 0) + usd;
            c.pagadoBs = (c.pagadoBs || 0) + bs;
            actualizarSistema();
            Clientes.cerrarAbono();
            renderizarVentas();
            renderizarClientesSimples();
            mostrarToastNotificacion('Abono registrado para ' + c.nombre + ': $' + usd.toFixed(2) + (bs > 0 ? ' + Bs. ' + bs.toFixed(2) : ''));
        }
    },
    toggleAbonoBox: function(gi) {
        var body = document.getElementById('abono-box-' + gi);
        var toggle = document.getElementById('abono-toggle-' + gi);
        if (body) {
            body.classList.toggle('abono-box-collapsed');
            if (toggle) toggle.innerText = body.classList.contains('abono-box-collapsed') ? '▶' : '▼';
        }
    },
    exportarPDF: function() {
        var lines = [];
        var sep = ' | ';
        lines.push('=== REPORTE DE CLIENTES ===');
        lines.push('');
        clientes.forEach(function(c, i) {
            var deuda = (c.total||0) - (c.pagado||0);
            lines.push((i+1) + '. ' + c.nombre + sep + c.tel + sep + 'Producto: ' + (c.productoVendido||'—') + sep + 'Total: $' + (c.total||0).toFixed(2) + sep + 'Pagado: $' + (c.pagado||0).toFixed(2) + sep + 'Deuda: $' + deuda.toFixed(2));
        });
        lines.push('');
        lines.push('Generado el ' + new Date().toLocaleDateString());
        var blob = new Blob([lines.join('\n')], { type: 'text/plain' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'clientes-reporte.txt';
        a.click();
        mostrarToastNotificacion('Reporte descargado');
    }
};

// VENTAS (copia de Clientes con IDs y vars independientes)
var _ventasFilter = 'all';
var _ventasExpanded = {};
var _ventasFechasSeleccionadas = [];
var _ventaProductosSeleccionados = [];

window.Ventas = {
    abrirSeleccionProductos: function() {
        document.getElementById('sel-prod-buscar').value = '';
        Ventas.filtrarSeleccionProductos();
        document.getElementById('seleccion-productos-modal').style.display = 'flex';
    },
    cerrarSeleccionProductos: function() {
        document.getElementById('seleccion-productos-modal').style.display = 'none';
    },
    filtrarSeleccionProductos: function() {
        var term = (document.getElementById('sel-prod-buscar').value || '').toLowerCase().trim();
        var tasa = obtenerTasaEfectiva();
        var list = document.getElementById('sel-prod-lista');
        var filtered = inventario.filter(function(p) {
            return !term || p.nombre.toLowerCase().includes(term)
                || (p.marca && p.marca.toLowerCase().includes(term))
                || (p.categoria && p.categoria.toLowerCase().includes(term));
        });
        var grupos = {};
        var ordenMarcas = [];
        filtered.forEach(function(p) {
            var mar = p.marca || 'Sin marca';
            if (!grupos[mar]) {
                grupos[mar] = [];
                ordenMarcas.push(mar);
            }
            grupos[mar].push(p);
        });
        var html = '';
        ordenMarcas.forEach(function(mar) {
            var items = grupos[mar];
            html += '<div style="margin-bottom:12px;">'
                + '<div style="font-weight:700;font-size:0.85rem;color:#1e293b;padding:8px 12px;background:#f1f5f9;border-radius:8px;margin-bottom:6px;">🏷️ ' + escapeHtml(mar) + ' <span style="font-weight:400;color:#94a3b8;font-size:0.75rem;">(' + items.length + ')</span></div>'
                + '<div style="display:flex;flex-direction:column;gap:4px;">';
            items.forEach(function(p) {
                var checked = _ventaProductosSeleccionados.some(function(sp) { return sp.nombre === p.nombre; });
                var sel = _ventaProductosSeleccionados.find(function(sp) { return sp.nombre === p.nombre; });
                var qtyVal = sel ? sel.cantidad : 1;
                var bsPrice = tasa > 0 ? (p.precio * tasa).toFixed(2) : (p.precio * getTasaActual()).toFixed(2);
                var stockClass = p.cantidad <= 0 ? 'stock-rojo' : p.cantidad <= 5 ? 'stock-amarillo' : 'stock-verde';
                html += '<label style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:' + (checked ? '#eef2ff' : '#f8fafc') + ';border:1px solid ' + (checked ? '#a5b4fc' : '#e2e8f0') + ';border-radius:8px;cursor:pointer;transition:all 0.1s;">'
                    + '<input type="checkbox" data-nombre="' + escapeHtml(p.nombre) + '" data-precio="' + p.precio + '" ' + (checked ? 'checked' : '') + ' style="accent-color:#6366f1;width:18px;height:18px;flex-shrink:0;" onchange="Ventas._toggleProducto(this)">'
                    + '<div style="flex:1;min-width:0;">'
                    + '<div style="font-weight:600;font-size:0.82rem;color:#1e293b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + escapeHtml(p.nombre) + '</div>'
                    + (p.categoria ? '<div style="font-size:0.7rem;color:#64748b;">' + escapeHtml(p.categoria) + '</div>' : '')
                    + '</div>'
                    + '<div style="text-align:right;flex-shrink:0;">'
                    + '<div style="font-weight:700;font-size:0.8rem;color:#059669;">$' + p.precio.toFixed(2) + '</div>'
                    + '<div style="font-size:0.7rem;color:#64748b;">Bs. ' + bsPrice + '</div>'
                    + '</div>'
                    + '<div style="display:flex;align-items:center;gap:4px;flex-shrink:0;">'
                    + '<span class="stock-marker ' + stockClass + '" style="font-size:0.65rem;padding:1px 6px;">' + p.cantidad + '</span>'
                    + '<input type="number" class="sel-prod-qty" value="' + qtyVal + '" min="1" max="' + Math.max(1, p.cantidad || 999) + '" data-nombre="' + escapeHtml(p.nombre) + '" onchange="Ventas._actualizarQty(this)" onclick="event.stopPropagation()" style="width:48px;height:28px;padding:2px 4px;border:1px solid #e2e8f0;border-radius:6px;font-family:inherit;font-size:0.78rem;text-align:center;background:#fff;">'
                    + '</div>'
                    + '</label>';
            });
            html += '</div></div>';
        });
        if (!html) html = '<div style="text-align:center;padding:40px;color:#94a3b8;">No se encontraron productos.</div>';
        list.innerHTML = html;
        Ventas._actualizarContador();
    },
    _toggleProducto: function(cb) {
        var nombre = cb.getAttribute('data-nombre');
        var precio = parseFloat(cb.getAttribute('data-precio'));
        var qtyInput = cb.closest('label').querySelector('.sel-prod-qty');
        var qty = qtyInput ? parseInt(qtyInput.value) || 1 : 1;
        if (cb.checked) {
            if (!_ventaProductosSeleccionados.some(function(sp) { return sp.nombre === nombre; })) {
                _ventaProductosSeleccionados.push({ nombre: nombre, cantidad: qty, precio: precio });
            }
        } else {
            _ventaProductosSeleccionados = _ventaProductosSeleccionados.filter(function(sp) { return sp.nombre !== nombre; });
        }
        var label = cb.closest('label');
        if (label) {
            label.style.background = cb.checked ? '#eef2ff' : '#f8fafc';
            label.style.borderColor = cb.checked ? '#a5b4fc' : '#e2e8f0';
        }
        Ventas._actualizarContador();
    },
    _actualizarQty: function(inp) {
        var nombre = inp.getAttribute('data-nombre');
        var qty = parseInt(inp.value) || 1;
        var sel = _ventaProductosSeleccionados.find(function(sp) { return sp.nombre === nombre; });
        if (sel) sel.cantidad = qty;
        Ventas._actualizarContador();
    },
    _actualizarContador: function() {
        var totalItems = _ventaProductosSeleccionados.reduce(function(sum, sp) { return sum + (sp.cantidad || 1); }, 0);
        document.getElementById('sel-prod-count').textContent = totalItems + ' unidad(es) en ' + _ventaProductosSeleccionados.length + ' producto(s)';
    },
    confirmarSeleccionProductos: function() {
        var container = document.getElementById('venta-productos-seleccionados');
        var tasa = obtenerTasaEfectiva();
        var totalUSD = 0;
        container.innerHTML = _ventaProductosSeleccionados.map(function(sp) {
            var prod = inventario.find(function(p) { return p.nombre === sp.nombre; });
            var foto = prod && prod.fotos && prod.fotos[0] ? prod.fotos[0] : null;
            var subtotal = sp.precio * (sp.cantidad || 1);
            totalUSD += subtotal;
            return '<span style="display:inline-flex;align-items:center;gap:6px;padding:5px 10px;background:#eef2ff;border:1px solid #c7d2fe;border-radius:8px;font-size:0.78rem;font-weight:500;color:#4338ca;">'
                + (foto ? '<img src="' + foto + '" style="width:20px;height:20px;border-radius:4px;object-fit:cover;">' : '')
                + escapeHtml(sp.nombre)
                + ' <span style="color:#64748b;font-weight:400;">x' + (sp.cantidad || 1) + '</span>'
                + ' <span style="color:#059669;">$' + subtotal.toFixed(2) + '</span>'
                + '<span style="cursor:pointer;color:#94a3b8;margin-left:2px;" onclick="Ventas._quitarProductoSeleccionado(\'' + escapeJsString(sp.nombre) + '\')">&times;</span>'
                + '</span>';
        }).join('');
        if (totalUSD > 0) {
            var totalInput = document.getElementById('venta-total');
            totalInput.value = totalUSD.toFixed(2);
            totalInput.dispatchEvent(new Event('input', { bubbles: true }));
        } else {
            document.getElementById('venta-total').value = '';
            document.getElementById('venta-total-bs').value = '';
        }
        document.getElementById('seleccion-productos-modal').style.display = 'none';
    },
    _quitarProductoSeleccionado: function(nombre) {
        _ventaProductosSeleccionados = _ventaProductosSeleccionados.filter(function(sp) { return sp.nombre !== nombre; });
        Ventas.confirmarSeleccionProductos();
    },
    limpiarSeleccionProductos: function() {
        _ventaProductosSeleccionados = [];
        Ventas.filtrarSeleccionProductos();
        Ventas._actualizarContador();
    },
    setFilter: function(filter) {
        _ventasFilter = filter;
        document.querySelectorAll('#ventas-filter-tabs .clientes-filter-btn').forEach(function(b) {
            b.classList.toggle('active', b.getAttribute('data-filter') === filter);
        });
        renderizarVentas();
    },
    toggleGroup: function(gi) {
        _ventasExpanded[gi] = !_ventasExpanded[gi];
        renderizarVentas();
    },
    abrirSelectorFechas: function() {
        var fechasUnicas = {};
        clientes.forEach(function(c) {
            var f = (c.fechaRegistro || '').split('T')[0];
            if (f) fechasUnicas[f] = true;
        });
        var fechas = Object.keys(fechasUnicas).sort().reverse();
        var html = '';
        if (fechas.length === 0) {
            html = '<div style="color:#94a3b8;text-align:center;padding:30px;">No hay fechas disponibles</div>';
        } else {
            var meses = {};
            fechas.forEach(function(f) {
                var d = new Date(f + 'T12:00:00');
                var mesKey = d.getFullYear() + '-' + (d.getMonth() + 1);
                var mesLabel = d.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
                if (!meses[mesKey]) meses[mesKey] = { label: mesLabel, fechas: [] };
                meses[mesKey].fechas.push(f);
            });
            var mesKeys = Object.keys(meses).sort().reverse();
            mesKeys.forEach(function(mk) {
                var m = meses[mk];
                var todasChecked = m.fechas.every(function(f) { return _ventasFechasSeleccionadas.indexOf(f) !== -1; });
                var algunasChecked = m.fechas.some(function(f) { return _ventasFechasSeleccionadas.indexOf(f) !== -1; });
                html += '<div style="margin-bottom:10px;">'
                    + '<div style="display:flex;align-items:center;gap:10px;padding:8px 10px;background:#f1f5f9;border-radius:8px;margin-bottom:4px;">'
                    + '<input type="checkbox" data-mesheader="' + mk + '" onchange="Ventas._toggleMes(this, \'' + mk + '\')" ' + (todasChecked ? 'checked' : '') + ' style="accent-color:#6366f1;width:16px;height:16px;flex-shrink:0;">'
                    + '<span style="font-weight:700;font-size:0.85rem;color:#1e293b;text-transform:capitalize;">' + m.label + '</span>'
                    + '<span style="font-size:0.75rem;color:#94a3b8;">(' + m.fechas.length + ' fecha' + (m.fechas.length !== 1 ? 's' : '') + ')</span>'
                    + '</div>'
                    + '<div style="display:flex;flex-wrap:wrap;gap:4px;padding-left:4px;">';
                m.fechas.forEach(function(f) {
                    var d = new Date(f + 'T12:00:00');
                    var label = d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
                    var checked = _ventasFechasSeleccionadas.indexOf(f) !== -1;
                    html += '<label style="display:flex;align-items:center;gap:6px;padding:5px 10px;background:' + (checked ? '#eef2ff' : '#f8fafc') + ';border:1px solid ' + (checked ? '#a5b4fc' : '#e2e8f0') + ';border-radius:6px;cursor:pointer;transition:all 0.1s;font-size:0.8rem;">'
                        + '<input type="checkbox" value="' + f + '" data-mes="' + mk + '" ' + (checked ? 'checked' : '') + ' style="accent-color:#6366f1;width:14px;height:14px;flex-shrink:0;" onchange="Ventas._actualizarMesCheck(\'' + mk + '\')">'
                        + '<span style="font-weight:' + (checked ? '600' : '400') + ';">' + label + '</span>'
                        + '</label>';
                });
                html += '</div></div>';
            });
        }
        document.getElementById('fecha-selector-lista').innerHTML = html;
        document.getElementById('fecha-selector-modal').style.display = 'flex';
    },
    _toggleMes: function(cb, mesKey) {
        var checked = cb.checked;
        var labels = document.querySelectorAll('#fecha-selector-lista input[type=checkbox]');
        labels.forEach(function(inp) {
            if (inp.getAttribute('data-mes') === mesKey) inp.checked = checked;
        });
    },
    _actualizarMesCheck: function(mesKey) {
        var todas = true;
        document.querySelectorAll('#fecha-selector-lista input[type=checkbox][data-mes="' + mesKey + '"]').forEach(function(inp) {
            if (!inp.checked) todas = false;
        });
        document.querySelectorAll('#fecha-selector-lista input[type=checkbox][data-mesheader="' + mesKey + '"]').forEach(function(inp) {
            inp.checked = todas;
        });
    },
    cerrarSelectorFechas: function() {
        document.getElementById('fecha-selector-modal').style.display = 'none';
    },
    aplicarFechas: function() {
        var checks = document.querySelectorAll('#fecha-selector-lista input[type=checkbox]:checked');
        _ventasFechasSeleccionadas = Array.from(checks).map(function(cb) { return cb.value; }).filter(function(v) { return v && /^\d{4}-\d{2}-\d{2}$/.test(v); });
        document.getElementById('fecha-selector-modal').style.display = 'none';
        var span = document.getElementById('dash-fechas-seleccionadas');
        if (span) {
            span.innerText = _ventasFechasSeleccionadas.length > 0 ? _ventasFechasSeleccionadas.length + ' fecha(s) seleccionada(s)' : '';
        }
        renderizarVentas();
    },
    limpiarFiltroFecha: function() {
        _ventasFechasSeleccionadas = [];
        var span = document.getElementById('dash-fechas-seleccionadas');
        if (span) span.innerText = '';
        renderizarVentas();
    },
    abrirAbono: function(index) {
        var c = clientes[index];
        document.getElementById('abono-modal-titulo').innerText = 'Registrar Abono';
        var deuda = (c.total||0) - (c.pagado||0);
        document.getElementById('abono-modal-desc').innerHTML = 'Cliente: <strong>' + escapeHtml(c.nombre) + '</strong> — Deuda actual: <strong style="color:#ef4444;">$' + Math.max(0, deuda).toFixed(2) + '</strong>';
        document.getElementById('abono-usd').value = '';
        document.getElementById('abono-bs').value = '';
        document.getElementById('abono-modal').dataset.index = index;
        document.getElementById('abono-modal').dataset.tipo = 'single';
        document.getElementById('abono-modal').style.display = 'flex';
        autoCalcAbono();
    },
    abrirAbonoGrupo: function(gi) {
        var groups = buildVentaGroups();
        var keys = Object.keys(groups);
        var g = groups[keys[gi]];
        var totalCompras = 0, totalPagado = 0;
        g.entries.forEach(function(e) {
            totalCompras += e.data.total || 0;
            totalPagado += e.data.pagado || 0;
        });
        var deuda = totalCompras - totalPagado;
        document.getElementById('abono-modal-titulo').innerText = 'Registrar Abono - ' + g.nombre;
        document.getElementById('abono-modal-desc').innerHTML = 'Cliente: <strong>' + escapeHtml(g.nombre) + '</strong> — Deuda total: <strong style="color:#ef4444;">$' + Math.max(0, deuda).toFixed(2) + '</strong>';
        document.getElementById('abono-usd').value = '';
        document.getElementById('abono-bs').value = '';
        document.getElementById('abono-modal').dataset.tipo = 'grupo';
        document.getElementById('abono-modal').dataset.grupo = gi;
        document.getElementById('abono-modal').dataset.nombre = g.nombre;
        document.getElementById('abono-modal').style.display = 'flex';
        autoCalcAbono();
    },
    cerrarAbono: function() {
        document.getElementById('abono-modal').style.display = 'none';
    },
    guardarAbono: function() {
        var usd = parseFloat(document.getElementById('abono-usd').value) || 0;
        var bs = parseFloat(document.getElementById('abono-bs').value) || 0;
        if (usd <= 0 && bs <= 0) { mostrarToastNotificacion('Ingrese un monto', 'error'); return; }
        var fecha = document.getElementById('abono-fecha').value || new Date().toISOString().split('T')[0];
        var tasa = parseFloat(document.getElementById('abono-tasa').value) || 0;
        var abonoRecord = { fecha: fecha, tasa: tasa, usd: usd, bs: bs };
        var tipo = document.getElementById('abono-modal').dataset.tipo;
        if (tipo === 'grupo') {
            var gi = parseInt(document.getElementById('abono-modal').dataset.grupo);
            var groups = buildVentaGroups();
            var keys = Object.keys(groups);
            var g = groups[keys[gi]];
            var ultimo = g.entries[g.entries.length - 1];
            var idx = ultimo.index;
            if (!clientes[idx].abonos) clientes[idx].abonos = [];
            clientes[idx].abonos.push(abonoRecord);
            clientes[idx].pagado = (clientes[idx].pagado || 0) + usd;
            clientes[idx].pagadoBs = (clientes[idx].pagadoBs || 0) + bs;
            actualizarSistema();
            Ventas.cerrarAbono();
            renderizarVentas();
            renderizarClientesSimples();
            mostrarToastNotificacion('Abono registrado para ' + g.nombre + ': $' + usd.toFixed(2) + (bs > 0 ? ' + Bs. ' + bs.toFixed(2) : ''));
        } else {
            var index = parseInt(document.getElementById('abono-modal').dataset.index);
            var c = clientes[index];
            if (!c.abonos) c.abonos = [];
            c.abonos.push(abonoRecord);
            c.pagado = (c.pagado || 0) + usd;
            c.pagadoBs = (c.pagadoBs || 0) + bs;
            actualizarSistema();
            Ventas.cerrarAbono();
            renderizarVentas();
            renderizarClientesSimples();
            mostrarToastNotificacion('Abono registrado para ' + c.nombre + ': $' + usd.toFixed(2) + (bs > 0 ? ' + Bs. ' + bs.toFixed(2) : ''));
        }
    },
    toggleAbonoBox: function(gi) {
        var body = document.getElementById('abono-box-' + gi);
        var toggle = document.getElementById('abono-toggle-' + gi);
        if (body) {
            body.classList.toggle('abono-box-collapsed');
            if (toggle) toggle.innerText = body.classList.contains('abono-box-collapsed') ? '▶' : '▼';
        }
    }
};

function getStatusData(c) {
    var total = c.total || 0;
    var pagado = c.pagado || 0;
    var deuda = Math.max(0, total - pagado);
    var pct = total > 0 ? Math.min(100, (pagado / total) * 100) : 0;
    var status;
    if (deuda <= 0) status = 'pagado';
    else if (pagado > 0) status = 'parcial';
    else status = 'deuda';
    return { total: total, pagado: pagado, deuda: deuda, pct: pct, status: status };
}

function renderProgressBar(sd) {
    var color = sd.status === 'pagado' ? '#22c55e' : sd.status === 'parcial' ? '#f59e0b' : '#ef4444';
    var label = sd.status === 'pagado' ? '✅ Pagado' : '$' + sd.deuda.toFixed(2) + ' de deuda';
    return '<div class="progress-bar-container">'
        + '<div class="progress-bar-track"><div class="progress-bar-fill" style="width:' + sd.pct + '%;background:' + color + ';"></div></div>'
        + '<div class="progress-bar-labels"><span style="color:' + color + ';font-weight:600;">$' + sd.pagado.toFixed(2) + '</span><span>' + label + '</span></div>'
        + '</div>';
}

function mostrarInfoProducto(nombreProd) {
    var prod = inventario.find(function(p) { return p.nombre === nombreProd; });
    if (!prod) return;
    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:100000;display:flex;align-items:center;justify-content:center;';
    var card = document.createElement('div');
    card.style.cssText = 'background:white;border-radius:16px;padding:24px;max-width:360px;width:90%;box-shadow:0 25px 50px rgba(0,0,0,0.25);text-align:center;';
    var fotoHtml = (prod.fotos && prod.fotos.length > 0)
        ? '<img src="' + prod.fotos[0] + '" style="width:100%;max-height:200px;object-fit:contain;border-radius:12px;margin-bottom:12px;">'
        : '<div style="width:100%;height:120px;background:#f1f5f9;border-radius:12px;display:flex;align-items:center;justify-content:center;color:#94a3b8;margin-bottom:12px;">Sin foto</div>';
    card.innerHTML = fotoHtml
        + '<div style="font-weight:700;font-size:1.1rem;color:#1e293b;">' + escapeHtml(prod.nombre) + '</div>'
        + '<div style="color:#64748b;font-size:0.85rem;margin-top:4px;">' + (prod.marca || '') + (prod.marca && prod.categoria ? ' · ' : '') + (prod.categoria || '') + '</div>'
        + '<div style="font-size:1.3rem;font-weight:700;color:#059669;margin-top:8px;">$' + prod.precio.toFixed(2) + '</div>'
        + '<div style="margin-top:4px;font-size:0.85rem;color:#64748b;">Stock: ' + prod.cantidad + '</div>'
        + '<button onclick="this.parentElement.parentElement.remove()" style="margin-top:16px;padding:10px 24px;border:none;border-radius:10px;background:#6366f1;color:white;font-weight:600;cursor:pointer;">Cerrar</button>';
    overlay.appendChild(card);
    overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };
    document.body.appendChild(overlay);
}

function getTasaActual() {
    var modo = localStorage.getItem('modoTasa');
    return parseFloat(localStorage.getItem(modo === 'auto' ? 'tasaAuto' : 'tasaCambio')) || 0;
}

function procesarImagen(file, folder, maxDim) {
    return new Promise(async function(resolve) {
        try {
            if (window.Upload && typeof window.Upload.uploadImage === 'function') {
                var url = await window.Upload.uploadImage(file, folder, maxDim || 1200, 0.85);
                if (url) { resolve(url); return; }
            }
        } catch (e) { console.warn('uploadImage falló, usando base64:', e); }
        // Fallback: base64
        try {
            var reader = new FileReader();
            reader.onload = function() { resolve(reader.result); };
            reader.onerror = function() { resolve(''); };
            reader.readAsDataURL(file);
        } catch (e) { resolve(''); }
    });
}
function formatearTelefono(tel) {
    if (!tel || tel === '—') return '—';
    var d = tel.replace(/[^0-9]/g, '');
    if (d.length >= 12 && d.indexOf('58') === 0) {
        var pais = d.substring(0, 2);
        var resto = d.substring(2);
        return '+ ' + pais + ' ' + resto;
    }
    return tel;
}

function previsualizarRecibos(files, containerId) {
    var area = document.getElementById(containerId || 'recibo-preview-area');
    if (!area) return;
    area.innerHTML = '';
    if (!files || files.length === 0) return;
    Array.from(files).forEach(function(file) {
        if (!file.type.startsWith('image/')) return;
        var reader = new FileReader();
        reader.onload = function(e) {
            var img = document.createElement('img');
            img.src = e.target.result;
            img.className = 'rp-thumb';
            img.title = file.name;
            img.style.cursor = 'pointer';
            img.onclick = function() { ampliarImagenRecibo(img.src); };
            area.appendChild(img);
        };
        reader.readAsDataURL(file);
    });
}

function obtenerTasaEfectiva() {
    var modo = localStorage.getItem('modoTasa');
    if (modo === 'auto') {
        return parseFloat(localStorage.getItem('tasaAuto')) || 0;
    }
    return parseFloat(localStorage.getItem('tasaCambio')) || 0;
}

function autoCalcAbono() {
    var fechaInput = document.getElementById('abono-fecha');
    var tasaInput = document.getElementById('abono-tasa');
    var usdInput = document.getElementById('abono-usd');
    var bsInput = document.getElementById('abono-bs');
    if (fechaInput) {
        fechaInput.value = new Date().toISOString().split('T')[0];
    }
    if (tasaInput) {
        var tasa = (localStorage.getItem('modoTasa') === 'auto' ? parseFloat(localStorage.getItem('tasaAuto')) : parseFloat(localStorage.getItem('tasaCambio'))) || 0;
        tasaInput.value = tasa.toFixed(2);
    }
    if (usdInput && bsInput) {
        usdInput.oninput = function() {
            var t = parseFloat(tasaInput?.value || 0);
            if (t > 0 && this.value) {
                bsInput.value = (parseFloat(this.value) * t).toFixed(2);
            } else if (!this.value) {
                bsInput.value = '';
            }
        };
        tasaInput.oninput = function() {
            var u = parseFloat(usdInput.value || 0);
            var t = parseFloat(this.value || 0);
            if (t > 0 && u > 0) {
                bsInput.value = (u * t).toFixed(2);
            } else if (!this.value || !usdInput.value) {
                bsInput.value = '';
            }
        };
    }
}

function autoCalcBs(srcId, dstId) {
    document.getElementById(srcId)?.addEventListener('input', function() {
        var tasa = obtenerTasaEfectiva();
        if (tasa > 0 && this.value) {
            document.getElementById(dstId).value = (parseFloat(this.value) * tasa).toFixed(2);
        }
    });
}

if (document.getElementById('form-cliente')) {
    autoCalcBs('cli-total', 'cli-total-bs');
    autoCalcBs('cli-pagado', 'cli-pagado-bs');

    document.getElementById('form-cliente').addEventListener('submit', async (e) => {
        e.preventDefault();
        let nombreCli = '';
        try {
            const filesRecibos = document.getElementById('cli-recibo').files;
            let listaRecibosUrls = [];
            for(let i=0; i<filesRecibos.length; i++) {
                listaRecibosUrls.push(await procesarImagen(filesRecibos[i], 'recibos', 800));
            }
            nombreCli = document.getElementById('cli-nombre').value;
            const productoInputs = document.querySelectorAll('.cli-producto-input');
            const productos = [];
            const cantidades = [];
            const fotosAutodetectadas = [];
            const fotosSet = new Set();
            productoInputs.forEach(function(inp) {
                var val = inp.value.trim();
                if (val) {
                    productos.push(val);
                    var fila = inp.closest('.producto-fila');
                    var cant = parseInt(fila.querySelector('.cli-producto-cant')?.value || 1);
                    cantidades.push(cant);
                    var prod = inventario.find(function(p) { return p.nombre === val; });
                    if (prod && prod.fotos && prod.fotos.length > 0) {
                        var primeraFoto = prod.fotos[0];
                        if (!fotosSet.has(primeraFoto)) {
                            fotosSet.add(primeraFoto);
                            fotosAutodetectadas.push(primeraFoto);
                        }
                    }
                }
            });

            var tasaGuardada = (localStorage.getItem('modoTasa') === 'auto' ? parseFloat(localStorage.getItem('tasaAuto')) : parseFloat(localStorage.getItem('tasaCambio'))) || 0;
            clientes.push({
                fechaRegistro: document.getElementById('cli-fecha-registro').value,
                nombre: nombreCli,
                tel: document.getElementById('cli-telefono').value,
                productos: productos,
                cantidades: cantidades,
                total: parseFloat(document.getElementById('cli-total').value || 0),
                totalBs: parseFloat(document.getElementById('cli-total-bs').value || 0),
                pagado: parseFloat(document.getElementById('cli-pagado').value || 0),
                pagadoBs: parseFloat(document.getElementById('cli-pagado-bs').value || 0),
                fotoProducto: fotosAutodetectadas,
                recibo: listaRecibosUrls,
                tasa: tasaGuardada
            });
            productos.forEach(function(prodName, pi) {
                var prodInv = inventario.find(function(p) { return p.nombre === prodName; });
                if (prodInv) {
                    var antes = parseInt(prodInv.cantidad) || 0;
                    prodInv.cantidad = Math.max(0, antes - (cantidades[pi] || 1));
                    registrarCambioStock(prodName, antes, prodInv.cantidad, 'Venta');
                }
            });
            actualizarSistema();
            window._expandirGrupoVenta = (nombreCli + '|' + document.getElementById('cli-telefono').value).toLowerCase();
            renderizarVentas();
        } catch (err) {
            console.error('Error al registrar venta:', err);
            mostrarToastNotificacion('Error: ' + err.message, 'error');
        }
        e.target.reset();
        var numFotos = document.getElementById('num-fotos');
        if (numFotos) numFotos.innerText = "Ninguno";
        document.getElementById('recibo-preview-area').innerHTML = '';
        document.getElementById('cli-buscar-existente').value = '';
        document.getElementById('cli-resultados-existentes').classList.remove('show');
        toggleFormulario('form-container-cliente');
        if (nombreCli) {
            var totalVentaVal = parseFloat(document.getElementById('cli-total').value || 0);
            registrarActividad('Venta registrada', nombreCli + ' - $' + totalVentaVal.toFixed(2));
            mostrarToastNotificacion(`✅ Venta registrada para ${nombreCli}`);
        }
    });

    // Envío de cliente en clientes (formulario cliente individual en sección Ventas)
    document.getElementById('form-cliente-existente')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        var nombreCli = document.getElementById('cli-nombre-existente').value.trim();
        var telCli = document.getElementById('cli-tel-existente').value.trim();
        var productos = [];
        var cantidades = [];
        var filas = document.querySelectorAll('#tabla-productos-venta .fila-producto');
        filas.forEach(function(f) {
            var sel = f.querySelector('.prod-select');
            var cant = f.querySelector('.prod-cant');
            if (sel && cant) {
                var nombre = sel.value;
                if (nombre) { productos.push(nombre); cantidades.push(parseInt(cant.value) || 1); }
            }
        });
        var listaRecibosUrls = [];
        var reciboFiles = document.getElementById('cli-recibo')?.files;
        if (reciboFiles && reciboFiles.length > 0) {
            for (var ri = 0; ri < reciboFiles.length; ri++) {
                listaRecibosUrls.push(await procesarImagen(reciboFiles[ri], 'recibos', 800));
            }
        }
        var fotosAutodetectadas = [];
        productos.forEach(function(p) {
            var prodInv = inventario.find(function(ip) { return ip.nombre === p; });
            if (prodInv && prodInv.fotos && prodInv.fotos.length > 0) {
                var primeraFoto = prodInv.fotos[0];
                if (primeraFoto && fotosAutodetectadas.indexOf(primeraFoto) === -1) {
                    fotosAutodetectadas.push(primeraFoto);
                }
            }
        });
        try {
            var tasaGuardada = (localStorage.getItem('modoTasa') === 'auto' ? parseFloat(localStorage.getItem('tasaAuto')) : parseFloat(localStorage.getItem('tasaCambio'))) || 0;
            clientes.push({
                fechaRegistro: document.getElementById('cli-fecha-registro-existente').value,
                nombre: nombreCli,
                tel: telCli,
                productos: productos,
                cantidades: cantidades,
                total: parseFloat(document.getElementById('cli-total-existente').value || 0),
                totalBs: parseFloat(document.getElementById('cli-total-bs-existente').value || 0),
                pagado: parseFloat(document.getElementById('cli-pagado-existente').value || 0),
                pagadoBs: parseFloat(document.getElementById('cli-pagado-bs-existente').value || 0),
                fotoProducto: fotosAutodetectadas,
                recibo: listaRecibosUrls,
                tasa: tasaGuardada
            });
            productos.forEach(function(prodName, pi) {
                var prodInv = inventario.find(function(p) { return p.nombre === prodName; });
                if (prodInv) {
                    var antes = parseInt(prodInv.cantidad) || 0;
                    prodInv.cantidad = Math.max(0, antes - (cantidades[pi] || 1));
                    registrarCambioStock(prodName, antes, prodInv.cantidad, 'Venta');
                }
            });
            actualizarSistema();
            window._expandirGrupoVenta = (nombreCli + '|' + telCli).toLowerCase();
            renderizarVentas();
        } catch (err) {
            console.error('Error al registrar venta:', err);
            mostrarToastNotificacion('Error: ' + err.message, 'error');
        }
        e.target.reset();
        var nf = document.getElementById('num-fotos-existente');
        if (nf) nf.innerText = "Ninguno";
        document.getElementById('recibo-preview-area-existente').innerHTML = '';
        toggleFormulario('form-container-cliente-existente');
        if (nombreCli) {
            var totalVentaVal2 = parseFloat(document.getElementById('cli-total-existente').value || 0);
            registrarActividad('Venta registrada', nombreCli + ' - $' + totalVentaVal2.toFixed(2));
            mostrarToastNotificacion(`✅ Venta registrada para ${nombreCli}`);
        }
    });
}

// FORMULARIO REGISTRAR CLIENTE SIMPLE
if (document.getElementById('form-cliente-simple')) {
    document.getElementById('form-cliente-simple').addEventListener('submit', function(e) {
        e.preventDefault();
        var nombre = document.getElementById('cli-nombre-simple').value.trim();
        var tel = document.getElementById('cli-telefono-simple').value.trim();
        var email = document.getElementById('cli-email-simple').value.trim();
        if (!nombre || !tel) { mostrarToastNotificacion('Complete nombre y teléfono', 'error'); return; }
        var existeEnVentas = clientes.some(function(c) { return c.nombre === nombre && c.tel === tel; });
        var usuariosExist = JSON.parse(localStorage.getItem('usuariosRegistrados') || '[]');
        var existeEnWeb = usuariosExist.some(function(u) { return u.nombre === nombre && u.tel === tel; });
        if (existeEnVentas || existeEnWeb) { mostrarToastNotificacion('Cliente ya registrado', 'error'); return; }
        usuariosExist.push({ id: Date.now().toString(), nombre: nombre, tel: tel, email: email || '', fechaRegistro: new Date().toISOString() });
        localStorage.setItem('usuariosRegistrados', JSON.stringify(usuariosExist));
        actualizarSistema();
        renderizarClientesSimples();
        e.target.reset();
        toggleFormulario('form-container-cliente');
        mostrarToastNotificacion('Cliente registrado: ' + nombre);
    });
}

// FORMULARIO REGISTRAR VENTA
if (document.getElementById('form-venta')) {
    autoCalcBs('venta-total', 'venta-total-bs');
    autoCalcBs('venta-pagado', 'venta-pagado-bs');

    document.getElementById('form-venta').addEventListener('submit', async (e) => {
        e.preventDefault();
        let nombreCli = '';
        var totalVenta = 0;
        try {
            const filesRecibos = document.getElementById('venta-recibo').files;
            let listaRecibosUrls = [];
            for(let i=0; i<filesRecibos.length; i++) {
                listaRecibosUrls.push(await procesarImagen(filesRecibos[i], 'recibos', 800));
            }
            nombreCli = document.getElementById('venta-nombre').value;
            if (!_ventaProductosSeleccionados || _ventaProductosSeleccionados.length === 0) {
                throw new Error('Debe seleccionar al menos un producto');
            }
            const productos = [];
            const cantidades = [];
            const fotosAutodetectadas = [];
            const fotosSet = new Set();
            var totalVenta = 0;
            (_ventaProductosSeleccionados || []).forEach(function(sp) {
                productos.push(sp.nombre);
                cantidades.push(sp.cantidad || 1);
                totalVenta += sp.precio * (sp.cantidad || 1);
                var prod = inventario.find(function(p) { return p.nombre === sp.nombre; });
                if (prod && prod.fotos && prod.fotos.length > 0) {
                    var primeraFoto = prod.fotos[0];
                    if (!fotosSet.has(primeraFoto)) {
                        fotosSet.add(primeraFoto);
                        fotosAutodetectadas.push(primeraFoto);
                    }
                }
            });

            var tasaGuardada = (localStorage.getItem('modoTasa') === 'auto' ? parseFloat(localStorage.getItem('tasaAuto')) : parseFloat(localStorage.getItem('tasaCambio'))) || 0;
            clientes.push({
                fechaRegistro: document.getElementById('venta-fecha-registro').value,
                nombre: nombreCli,
                tel: document.getElementById('venta-telefono').value,
                productos: productos,
                cantidades: cantidades,
                total: parseFloat(document.getElementById('venta-total').value || 0),
                totalBs: parseFloat(document.getElementById('venta-total-bs').value || 0),
                pagado: parseFloat(document.getElementById('venta-pagado').value || 0),
                pagadoBs: parseFloat(document.getElementById('venta-pagado-bs').value || 0),
                fotoProducto: fotosAutodetectadas,
                recibo: listaRecibosUrls,
                tasa: tasaGuardada
            });
            productos.forEach(function(prodName, pi) {
                var prodInv = inventario.find(function(p) { return p.nombre === prodName; });
                if (prodInv) {
                    var antes = parseInt(prodInv.cantidad) || 0;
                    prodInv.cantidad = Math.max(0, antes - (cantidades[pi] || 1));
                    registrarCambioStock(prodName, antes, prodInv.cantidad, 'Venta');
                }
            });
            actualizarSistema();
            window._expandirGrupoVenta = (nombreCli + '|' + document.getElementById('venta-telefono').value).toLowerCase();
            renderizarVentas();
            renderizarClientesSimples();
        } catch (err) {
            console.error('Error al registrar venta:', err);
            mostrarToastNotificacion('Error: ' + err.message, 'error');
        }
        e.target.reset();
        _ventaProductosSeleccionados = [];
        document.getElementById('venta-productos-seleccionados').innerHTML = '';
        var numFotos = document.getElementById('num-fotos-venta');
        if (numFotos) numFotos.innerText = "Ninguno";
        document.getElementById('recibo-preview-area-venta').innerHTML = '';
        document.getElementById('venta-cliente-select').value = '';
        toggleFormulario('form-container-venta');
        if (nombreCli) {
            registrarActividad('Venta registrada', nombreCli + ' - $' + totalVenta.toFixed(2));
            mostrarToastNotificacion('✅ Venta registrada para ' + nombreCli);
        }
    });
}

function buildClientGroups() {
    var terminoBusqueda = (document.getElementById('buscar-cliente')?.value.toLowerCase() || '').trim();
    var groups = {};
    clientes.forEach(function(c, i) {
        if (terminoBusqueda) {
            var matchName = c.nombre.toLowerCase().includes(terminoBusqueda);
            var prods = Array.isArray(c.productos) ? c.productos : (c.productoVendido ? [c.productoVendido] : []);
            var matchProd = prods.some(function(p) { return p.toLowerCase().includes(terminoBusqueda); });
            if (!matchName && !matchProd) return;
        }
        var sd = getStatusData(c);
        if (_clientesFilter === 'paid' && sd.status !== 'pagado') return;
        if (_clientesFilter === 'debt' && sd.status === 'pagado') return;
        var key = (c.nombre + '|' + c.tel).toLowerCase();
        if (!groups[key]) groups[key] = { nombre: c.nombre, tel: c.tel, entries: [] };
        groups[key].entries.push({ index: i, data: c });
    });
    return groups;
}

function buildVentaGroups() {
    var terminoBusqueda = (document.getElementById('buscar-venta')?.value.toLowerCase() || '').trim();
    var groups = {};
    clientes.forEach(function(c, i) {
        if (terminoBusqueda) {
            var matchName = c.nombre.toLowerCase().includes(terminoBusqueda);
            var prods = Array.isArray(c.productos) ? c.productos : (c.productoVendido ? [c.productoVendido] : []);
            var matchProd = prods.some(function(p) { return p.toLowerCase().includes(terminoBusqueda); });
            if (!matchName && !matchProd) return;
        }
        var sd = getStatusData(c);
        if (_ventasFilter === 'paid' && sd.status !== 'pagado') return;
        if (_ventasFilter === 'debt' && sd.status === 'pagado') return;
        var key = (c.nombre + '|' + c.tel).toLowerCase();
        if (!groups[key]) groups[key] = { nombre: c.nombre, tel: c.tel, entries: [] };
        groups[key].entries.push({ index: i, data: c });
    });
    return groups;
}

function renderizarClientes() {
    const container = document.getElementById('clientes-table-container');
    if (!container) return;
    var groups = buildClientGroups();
    var groupKeys = Object.keys(groups);

    if (groupKeys.length === 0) {
        container.innerHTML = '<div style="text-align:center;padding:40px;color:#94a3b8;">No se encontraron clientes.</div>';
        return;
    }

    var html = '<div class="clientes-cards">';

    groupKeys.forEach(function(key, gi) {
        var g = groups[key];
        var totalCompras = 0;
        var totalPagado = 0;
        g.entries.forEach(function(e) {
            totalCompras += e.data.total || 0;
            totalPagado += e.data.pagado || 0;
        });
        var sd = getStatusData({ total: totalCompras, pagado: totalPagado });
        var expanded = _clientesExpanded[gi] || false;
        if (!expanded && window._expandirGrupoCliente && key === window._expandirGrupoCliente) {
            expanded = true;
            _clientesExpanded[gi] = true;
        }

        var statusLabel = sd.status === 'pagado' ? '✅ Pagado' : sd.status === 'parcial' ? '⚠️ Parcial' : '❌ Deuda';
        var statusClass = sd.status === 'pagado' ? 'pagado' : sd.status === 'parcial' ? 'deuda-parcial' : 'deuda-total';

        html += '<div class="cliente-card">';
        html += '<div class="cliente-card-header">';
        html += '<div class="cliente-card-toggle' + (expanded ? ' open' : '') + '" onclick="Clientes.toggleGroup(' + gi + ')">▶</div>';
        html += '<div class="cliente-card-info" onclick="Clientes.toggleGroup(' + gi + ')">';
        html += '<div class="cliente-card-name">' + escapeHtml(g.nombre) + '</div>';
        html += '<div class="cliente-card-contact">📞 ' + escapeHtml(g.tel) + ' · ' + g.entries.length + ' compra' + (g.entries.length !== 1 ? 's' : '') + '</div>';
        html += '</div>';
        html += '<div class="cliente-card-progress">';
        html += renderProgressBar(sd);
        html += '</div>';
        html += '<div class="cliente-card-actions">';
        html += '<button onclick="Clientes.abrirAbonoGrupo(' + gi + ')" class="btn-edit-action" style="background:#dbeafe;color:#1e40af;" title="Registrar abono">💰 Abono</button>';
        html += '</div>';
        html += '</div>';

        if (expanded) {
            html += '<div class="cliente-card-body">';

            // Abono box (collapsible)
            var abonosExisten = false;
            g.entries.forEach(function(e) {
                if (e.data.abonos && e.data.abonos.length > 0) abonosExisten = true;
            });
            if (abonosExisten || totalCompras > 0) {
                var abonoBoxId = 'abono-box-' + gi;
                html += '<div class="abono-box">';
                html += '<div class="abono-box-title" onclick="Clientes.toggleAbonoBox(' + gi + ')" style="cursor:pointer;">💰 Resumen de Pagos <span style="margin-left:auto;font-size:0.7rem;color:#94a3b8;" id="abono-toggle-' + gi + '">▼</span></div>';
                html += '<div class="abono-box-body" id="' + abonoBoxId + '">';
                html += '<div class="abono-box-grid">';
                html += '<div class="abono-box-item"><span class="abi-label">Total</span><span class="abi-value">$' + totalCompras.toFixed(2) + '</span></div>';
                html += '<div class="abono-box-item"><span class="abi-label">Pagado</span><span class="abi-value paid">$' + totalPagado.toFixed(2) + '</span></div>';
                html += '<div class="abono-box-item"><span class="abi-label">Deuda</span><span class="abi-value debt">$' + sd.deuda.toFixed(2) + '</span></div>';
                var tasa_ = (localStorage.getItem('modoTasa') === 'auto' ? parseFloat(localStorage.getItem('tasaAuto')) : parseFloat(localStorage.getItem('tasaCambio'))) || 0;
                html += '<div class="abono-box-item"><span class="abi-label">Tasa del día</span><span class="abi-value">Bs. ' + tasa_.toFixed(2) + '</span></div>';
                html += '</div>';

                var allAbonos = [];
                g.entries.forEach(function(e) {
                    if (e.data.abonos) {
                        e.data.abonos.forEach(function(a) {
                            allAbonos.push({ fecha: a.fecha, usd: a.usd, bs: a.bs, tasa: a.tasa });
                        });
                    }
                });
                if (allAbonos.length > 0) {
                    allAbonos.sort(function(a, b) { return a.fecha < b.fecha ? 1 : -1; });
                    html += '<div class="abonos-historial">';
                    html += '<div class="abonos-historial-title">Historial de pagos</div>';
                    allAbonos.forEach(function(a) {
                        html += '<div class="abono-entry">';
                        html += '<span class="ae-fecha">' + (a.fecha || '—') + '</span>';
                        html += '<span class="ae-usd">$' + (a.usd || 0).toFixed(2) + '</span>';
                        html += '<span class="ae-bs">Bs. ' + (a.bs || 0).toFixed(2) + '</span>';
                        html += '<span class="ae-tasa">@ ' + (a.tasa || 0).toFixed(2) + '</span>';
                        html += '</div>';
                    });
                    html += '</div>';
                }
                html += '</div>'; // abono-box-body
                html += '</div>'; // abono-box
            }

            html += '<table class="modern-table"><thead><tr>'
                + '<th style="width:30px;"></th>'
                + '<th>Fecha</th>'
                + '<th>Producto + Foto</th>'
                + '<th>Monto</th>'
                + '<th>Recibos</th>'
                + '<th style="text-align:center;width:60px;">Editar</th>'
                + '</tr></thead><tbody>';

            g.entries.forEach(function(e) {
                var i = e.index;
                var c = e.data;
                var s = getStatusData(c);
                var fotosProd = c.fotoProducto ? (Array.isArray(c.fotoProducto) ? c.fotoProducto : [c.fotoProducto]) : [];
                var fotosRecibos = c.recibo ? (Array.isArray(c.recibo) ? c.recibo : [c.recibo]) : [];

                var tasa = (localStorage.getItem('modoTasa') === 'auto' ? parseFloat(localStorage.getItem('tasaAuto')) : parseFloat(localStorage.getItem('tasaCambio'))) || 0;
                var totalBs = c.totalBs || (tasa > 0 ? (c.total || 0) * tasa : 0);

                var prods = Array.isArray(c.productos) ? c.productos : (c.productoVendido ? [c.productoVendido] : ['—']);
                var cantidades = c.cantidades || [];
                var productoHtml = prods.map(function(p, idx) {
                    var qty = cantidades[idx] || 1;
                    var prodInv = inventario.find(function(ip) { return ip.nombre === p; });
                    var fotoUrl = prodInv && prodInv.fotos && prodInv.fotos.length > 0 ? prodInv.fotos[0] : null;
                    var fotoImg = fotoUrl ? '<img src="' + fotoUrl + '" class="cli-prod-thumb" alt="">' : '<div class="cli-prod-thumb cli-prod-thumb-placeholder">' + (p ? p.charAt(0).toUpperCase() : '—') + '</div>';
                    return '<div class="cli-prod-cell" onclick="mostrarInfoProducto(\'' + escapeJsString(p) + '\')">' + fotoImg + '<span class="cli-prod-name">' + escapeHtml(p) + (qty > 1 ? ' <strong>x' + qty + '</strong>' : '') + '</span></div>';
                }).join('');

                var montoHtml = '<div style="white-space:nowrap;"><strong style="color:#1e293b;">$' + (c.total||0).toFixed(2) + '</strong>'
                    + '<br><span style="color:#64748b;font-size:0.85rem;">Bs. ' + totalBs.toFixed(2) + '</span></div>';

                var reciboRender = fotosRecibos.length > 0
                    ? '<div class="mini-fotos-stack" onclick="abrirManagerRecibos(' + i + ')">' + fotosRecibos.slice(0, 2).map(function(img){return '<img src="' + img + '" class="img-preview-recibo">';}).join('') + (fotosRecibos.length > 2 ? '<span class="badge-mas-fotos">+' + (fotosRecibos.length-2) + '</span>' : '') + '</div>'
                    : '<button class="btn-edit-action" onclick="abrirManagerRecibos(' + i + ')" style="font-size:0.75rem;">➕ Subir</button>';

                var rowClass = s.status === 'pagado' ? 'tr-pagado' : s.status === 'deuda' ? 'tr-deuda' : 'tr-parcial';
                html += '<tr class="' + rowClass + '">'
                    + '<td></td>'
                    + '<td><span style="font-size:0.85rem;color:#64748b;">' + (c.fechaRegistro||'—') + '</span></td>'
                    + '<td>' + productoHtml + '</td>'
                    + '<td>' + montoHtml + '</td>'
                    + '<td>' + reciboRender + '</td>'
                    + '<td style="text-align:center;"><button onclick="activarEdicionCliente(' + i + ')" class="btn-edit-action" style="padding:4px 10px;font-size:0.8rem;" title="Editar">✏️</button></td>'
                    + '</tr>';

                var abonos = c.abonos || [];
                var statusColor = s.status === 'pagado' ? '#16a34a' : s.status === 'parcial' ? '#d97706' : '#ef4444';
                var statusLabel = s.status === 'pagado' ? '✅ Pagado' : s.status === 'parcial' ? '⚠️ Parcial' : '❌ Deuda';

                html += '<tr class="cli-pago-summary-row"><td colspan="6"><div class="cli-pago-summary">'
                    + '<div class="cli-pago-bar">'
                    + '<span class="cli-pago-badge" style="background:' + statusColor + ';">' + statusLabel + '</span>'
                    + '<span class="cli-pago-amount"><strong>Total:</strong> $' + (c.total||0).toFixed(2) + '</span>'
                    + '<span class="cli-pago-amount"><strong>Pagado:</strong> $' + (c.pagado||0).toFixed(2) + '</span>'
                    + '<span class="cli-pago-amount"><strong>Deuda:</strong> $' + s.deuda.toFixed(2) + '</span>'
                    + '<button class="btn-edit-action" onclick="Clientes.abrirAbono(' + i + ')" style="padding:4px 10px;font-size:0.8rem;background:#dbeafe;color:#1e40af;">💰 Abono</button>'
                    + '</div>'
                    + (abonos.length > 0 ? '<div class="cli-pago-abonos">' + abonos.map(function(a) { return '<span class="cli-pago-abono-entry">' + (a.fecha||'—') + ' · $' + (a.usd||0).toFixed(2) + (a.bs > 0 ? ' + Bs. ' + a.bs.toFixed(2) : '') + (a.tasa > 0 ? ' @ ' + a.tasa.toFixed(2) : '') + '</span>'; }).join('') + '</div>' : '')
                    + '</div></td></tr>';
            });

            html += '</tbody></table>';
            html += '</div>';
        }
        html += '</div>';
    });

    html += '</div>';
    container.innerHTML = html;
    window._expandirGrupoCliente = null;
}

function renderizarVentas() {
    const container = document.getElementById('ventas-table-container');
    if (!container) return;

    // Populate date range info
    var span = document.getElementById('dash-fechas-disponibles');
    if (span) {
        var fechasUnicas = {};
        clientes.forEach(function(c) {
            var f = (c.fechaRegistro || '').split('T')[0];
            if (f) fechasUnicas[f] = true;
        });
        var totalFechas = Object.keys(fechasUnicas).length;
        span.innerText = totalFechas > 0 ? '🗓️ ' + totalFechas + ' fechas' : '';
    }

    var terminoBusqueda = (document.getElementById('buscar-venta')?.value.toLowerCase() || '').trim();
    var filtered = [];
    clientes.forEach(function(c, i) {
        var sd = getStatusData(c);
        if (_ventasFilter === 'paid' && sd.status !== 'pagado') return;
        if (_ventasFilter === 'debt' && sd.status === 'pagado') return;
        if (terminoBusqueda) {
            var matchName = c.nombre.toLowerCase().includes(terminoBusqueda);
            var prods = Array.isArray(c.productos) ? c.productos : (c.productoVendido ? [c.productoVendido] : []);
            var matchProd = prods.some(function(p) { return p.toLowerCase().includes(terminoBusqueda); });
            if (!matchName && !matchProd) return;
        }
        if (_ventasFechasSeleccionadas.length > 0) {
            var fechaVenta = (c.fechaRegistro || '').split('T')[0];
            if (_ventasFechasSeleccionadas.indexOf(fechaVenta) === -1) return;
        }
        filtered.push({ index: i, data: c });
    });

    if (filtered.length === 0) {
        container.innerHTML = '<div style="text-align:center;padding:40px;color:#94a3b8;">No se encontraron ventas.</div>';
        return;
    }

    filtered.sort(function(a, b) { var fa = a.data.fechaRegistro || '', fb = b.data.fechaRegistro || ''; if (fb < fa) return -1; if (fb > fa) return 1; return 0; });

    var html = '<div class="table-wrapper"><table class="modern-table"><thead><tr>'
        + '<th>Fecha</th>'
        + '<th>Cliente</th>'
        + '<th>Productos</th>'
        + '<th>Total</th>'
        + '<th>Pagado</th>'
        + '<th>Deuda</th>'
        + '<th style="text-align:center;">Acciones</th>'
        + '</tr></thead><tbody>';

    var lastDate = null;
    filtered.forEach(function(item) {
        var c = item.data;
        var fechaKey = (c.fechaRegistro || '').split('T')[0];
        if (fechaKey && fechaKey !== lastDate) {
            lastDate = fechaKey;
            try {
                var d = new Date(fechaKey + 'T12:00:00');
                var diaSemana = d.toLocaleDateString('es-ES', { weekday: 'long' });
                var diaNum = d.toLocaleDateString('es-ES', { day: 'numeric' });
                var mes = d.toLocaleDateString('es-ES', { month: 'long' });
                var label = diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1) + ' ' + diaNum + ' de ' + mes;
                var hoy = new Date();
                var ayer = new Date(hoy); ayer.setDate(hoy.getDate() - 1);
                if (fechaKey === hoy.toISOString().split('T')[0]) label = '📅 Hoy — ' + label;
                else if (fechaKey === ayer.toISOString().split('T')[0]) label = '📅 Ayer — ' + label;
                html += '<tr class="date-header-row"><td colspan="7" style="padding:10px 12px;background:#f1f5f9;font-weight:700;font-size:0.85rem;color:#1e293b;border-bottom:2px solid #e2e8f0;">' + label + '</td></tr>';
            } catch(e) {}
        }
        var s = getStatusData(c);
        var prods = Array.isArray(c.productos) ? c.productos : (c.productoVendido ? [c.productoVendido] : ['—']);
        var prodsStr = prods.slice(0, 2).join(', ') + (prods.length > 2 ? ' +' + (prods.length - 2) : '');
        var statusColor = s.status === 'pagado' ? '#16a34a' : s.status === 'parcial' ? '#d97706' : '#ef4444';
        var statusIcon = s.status === 'pagado' ? '✅' : s.status === 'parcial' ? '⚠️' : '❌';
        var rowClass = s.status === 'pagado' ? 'tr-pagado' : s.status === 'deuda' ? 'tr-deuda' : 'tr-parcial';

        html += '<tr class="' + rowClass + '">'
            + '<td><span style="font-size:0.85rem;color:#64748b;">' + (c.fechaRegistro || '—') + '</span></td>'
            + '<td><strong>' + escapeHtml(c.nombre) + '</strong></td>'
            + '<td><span style="font-size:0.85rem;">' + escapeHtml(prodsStr) + '</span></td>'
            + '<td><strong>$' + (c.total || 0).toFixed(2) + '</strong></td>'
            + '<td>$' + (c.pagado || 0).toFixed(2) + '</td>'
            + '<td><span style="color:' + statusColor + ';font-weight:600;">' + statusIcon + ' $' + s.deuda.toFixed(2) + '</span></td>'
            + '<td style="text-align:center;display:flex;gap:4px;justify-content:center;">'
            + '<button class="btn-edit-action" onclick="abrirDetalleVenta(' + item.index + ')" style="padding:4px 10px;font-size:0.8rem;">🔍 Ver</button>'
            + (s.status !== 'pagado' ? '<button class="btn-edit-action" onclick="Ventas.abrirAbono(' + item.index + ')" style="padding:4px 10px;font-size:0.8rem;background:#dbeafe;color:#1e40af;">💰 Abono</button>' : '')
            + '</td>'
            + '</tr>';
    });

    html += '</tbody></table></div>';
    container.innerHTML = html;
}

window.limpiarFiltroFechaVenta = function() {
    Ventas.limpiarFiltroFecha();
};

window.exportarVentasCSV = function() {
    var rows = [['Fecha','Cliente','Teléfono','Productos','Total USD','Total BS','Pagado USD','Deuda USD']];
    clientes.forEach(function(c) {
        var prods = Array.isArray(c.productos) ? c.productos.join(', ') : (c.productoVendido || '—');
        var sd = getStatusData(c);
        rows.push([
            c.fechaRegistro || '—',
            c.nombre,
            c.tel || '—',
            prods,
            (c.total || 0).toFixed(2),
            (c.totalBs || 0).toFixed(2),
            (c.pagado || 0).toFixed(2),
            sd.deuda.toFixed(2)
        ]);
    });
    var csv = rows.map(function(r) { return r.map(function(v) { return '"' + String(v).replace(/"/g, '""') + '"'; }).join(','); }).join('\n');
    var blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'ventas_export.csv'; a.click();
    mostrarToastNotificacion('📥 Ventas exportadas');
};

// Notification: check for new pedidos every 30s
var _pedidosCount = (JSON.parse(localStorage.getItem('pedidosPendientes')) || []).filter(function(p) { return (p.estado || 'pendiente') === 'pendiente'; }).length;
setInterval(function() {
    var pedidos = JSON.parse(localStorage.getItem('pedidosPendientes')) || [];
    var pendientes = pedidos.filter(function(p) { return (p.estado || 'pendiente') === 'pendiente'; });
    if (pendientes.length > _pedidosCount) {
        _pedidosCount = pendientes.length;
        try {
            var ctx = new (window.AudioContext || window.webkitAudioContext)();
            var osc = ctx.createOscillator(); osc.type = 'sine'; osc.frequency.value = 800;
            var gain = ctx.createGain(); gain.gain.value = 0.3;
            osc.connect(gain); gain.connect(ctx.destination);
            osc.start(); setTimeout(function() { osc.stop(); }, 200);
        } catch(e) {}
        mostrarToastNotificacion('🔔 Nuevo pedido recibido!');
    } else if (pendientes.length < _pedidosCount) {
        _pedidosCount = pendientes.length;
    }
}, 30000);

var _clientesEditandoKey = null;

function renderizarClientesSimples() {
    const tbody = document.getElementById('tabla-clientes-simples');
    if (!tbody) return;

    var usuariosWeb = JSON.parse(localStorage.getItem('usuariosRegistrados') || '[]');
    var terminoBusqueda = (document.getElementById('buscar-cliente-simple')?.value.toLowerCase() || '').trim();
    var groups = {};

    // Agrupar desde clientes[] (ventas)
    clientes.forEach(function(c) {
        if (terminoBusqueda && !c.nombre.toLowerCase().includes(terminoBusqueda)) return;
        var key = (c.nombre + '|' + c.tel).toLowerCase();
        if (!groups[key]) groups[key] = { nombre: c.nombre, tel: c.tel, email: c.email || '', compras: 0, total: 0 };
        groups[key].compras++;
        groups[key].total += c.total || 0;
    });

    // Agregar clientes desde pedidos pendientes/aprobados/entregados
    try {
        var pedidos = JSON.parse(localStorage.getItem('pedidosPendientes') || '[]');
        pedidos.forEach(function(p) {
            var nom = p.userNombre || '';
            var tel = p.userTel || '';
            if (!nom && !tel) return;
            if (terminoBusqueda && !nom.toLowerCase().includes(terminoBusqueda)) return;
            var key = (nom + '|' + tel).toLowerCase();
            if (!groups[key]) {
                groups[key] = { nombre: nom, tel: tel, email: p.userEmail || '', compras: 0, total: 0 };
            }
        });
    } catch (e) {}

    // Enriquecer con email de usuarios web
    var webEmailMap = {};
    usuariosWeb.forEach(function(u) {
        var key = (u.nombre + '|' + u.tel).toLowerCase();
        webEmailMap[key] = u.email || '';
    });
    Object.keys(groups).forEach(function(key) {
        if (webEmailMap[key]) groups[key].email = webEmailMap[key];
    });

    // Agregar usuarios web sin ventas
    usuariosWeb.forEach(function(u) {
        var key = (u.nombre + '|' + u.tel).toLowerCase();
        if (!groups[key]) {
            if (terminoBusqueda && !u.nombre.toLowerCase().includes(terminoBusqueda)) return;
            groups[key] = { nombre: u.nombre, tel: u.tel, email: u.email || '', compras: 0, total: 0 };
        }
    });

    var keys = Object.keys(groups);
    if (keys.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:30px;color:#94a3b8;">No se encontraron clientes.</td></tr>';
        return;
    }

    tbody.innerHTML = keys.map(function(key) {
        var g = groups[key];
        var editing = (_clientesEditandoKey === key);
        var editNombre = escapeHtml(g.nombre);
        var editTel = escapeHtml(g.tel);
        var editEmail = escapeHtml(g.email);

        if (editing) {
            return '<tr class="editing-row" data-key="' + escapeHtml(key) + '">'
                + '<td><input type="text" id="cli-edit-nombre" value="' + editNombre + '" class="table-input-compact" style="width:140px;" placeholder="Nombre"></td>'
                + '<td><input type="tel" id="cli-edit-tel" value="' + editTel + '" class="table-input-compact" style="width:130px;" placeholder="Teléfono"></td>'
                + '<td><input type="email" id="cli-edit-email" value="' + editEmail + '" class="table-input-compact" style="width:160px;" placeholder="Correo"></td>'
                + '<td>' + g.compras + '</td>'
                + '<td><strong>$' + g.total.toFixed(2) + '</strong></td>'
                + '<td class="table-actions-cell" style="justify-content:center;gap:4px;">'
                + '<button onclick="guardarClienteEditado(\'' + escapeJsString(key) + '\')" class="btn-save" style="padding:4px 8px;font-size:0.75rem;" title="Guardar">💾</button>'
                + '<button onclick="cancelarClienteEditado(\'' + escapeJsString(key) + '\')" class="btn-cancel" style="padding:4px 8px;font-size:0.75rem;" title="Cancelar">✖️</button>'
                + '<button onclick="eliminarClienteSimple(\'' + escapeJsString(key) + '\')" class="btn-delete" style="padding:4px 8px;font-size:0.75rem;" title="Eliminar">🗑️</button>'
                + '</td></tr>';
        }

        return '<tr data-key="' + escapeHtml(key) + '">'
            + '<td><strong>' + escapeHtml(g.nombre) + '</strong></td>'
            + '<td>📞 ' + escapeHtml(g.tel) + '</td>'
            + '<td>' + (g.email ? '✉️ ' + escapeHtml(g.email) : '<span style="color:#94a3b8;">—</span>') + '</td>'
            + '<td>' + g.compras + ' compra' + (g.compras !== 1 ? 's' : '') + '</td>'
            + '<td><strong>$' + g.total.toFixed(2) + '</strong></td>'
            + '<td class="table-actions-cell" style="justify-content:center;gap:4px;">'
            + '<button onclick="iniciarEdicionClienteSimple(\'' + escapeJsString(key) + '\')" class="btn-edit-action" style="padding:4px 8px;font-size:0.75rem;" title="Editar">✏️</button>'
            + '<button onclick="eliminarClienteSimple(\'' + escapeJsString(key) + '\')" class="btn-delete" style="padding:4px 8px;font-size:0.75rem;" title="Eliminar">🗑️</button>'
            + '</td></tr>';
    }).join('');
}

window.iniciarEdicionClienteSimple = function(key) {
    _clientesEditandoKey = key;
    renderizarClientesSimples();
};

window.cancelarEdicionClienteSimple = function() {
    _clientesEditandoKey = null;
    renderizarClientesSimples();
};

window.guardarClienteEditado = function(oldKey) {
    var nuevoNombre = document.getElementById('cli-edit-nombre').value.trim();
    var nuevoTel = document.getElementById('cli-edit-tel').value.trim();
    var nuevoEmail = document.getElementById('cli-edit-email').value.trim();
    if (!nuevoNombre || !nuevoTel) { mostrarToastNotificacion('Nombre y teléfono son requeridos', 'error'); return; }

    var parts = oldKey.split('|');
    var oldNombre = parts[0];
    var oldTel = parts[1];

    // Actualizar clientes[] (ventas)
    clientes.forEach(function(c) {
        if (c.nombre === oldNombre && c.tel === oldTel) {
            c.nombre = nuevoNombre;
            c.tel = nuevoTel;
            c.email = nuevoEmail || '';
        }
    });

    // Actualizar usuariosRegistrados
    var usuarios = JSON.parse(localStorage.getItem('usuariosRegistrados') || '[]');
    var modificado = false;
    usuarios.forEach(function(u) {
        if (u.nombre === oldNombre && u.tel === oldTel) {
            u.nombre = nuevoNombre;
            u.tel = nuevoTel;
            u.email = nuevoEmail || u.email || '';
            modificado = true;
        }
    });
    if (!modificado && nuevoEmail) {
        usuarios.push({ id: Date.now().toString(), nombre: nuevoNombre, tel: nuevoTel, email: nuevoEmail, fechaRegistro: new Date().toISOString() });
        modificado = true;
    }
    if (modificado) localStorage.setItem('usuariosRegistrados', JSON.stringify(usuarios));

    actualizarSistema();
    _clientesEditandoKey = null;
    renderizarClientesSimples();
    renderizarVentas();
    mostrarToastNotificacion('Cliente actualizado');
};

window.eliminarClienteSimple = async function(key) {
    var parts = key.split('|');
    var nombre = parts[0];
    var tel = parts[1];
    if (!(await mostrarConfirmacion('¿Eliminar el perfil de "' + nombre + '" de la lista de clientes? Las ventas registradas en Ventas no se eliminarán.'))) return;

    // Eliminar solo de usuariosRegistrados (perfil del cliente)
    // Las ventas en clientes[] se conservan para la sección Ventas
    var usuarios = JSON.parse(localStorage.getItem('usuariosRegistrados') || '[]');
    var nuevos = usuarios.filter(function(u) { return !(u.nombre === nombre && u.tel === tel); });
    if (nuevos.length !== usuarios.length) localStorage.setItem('usuariosRegistrados', JSON.stringify(nuevos));

    actualizarSistema();
    _clientesEditandoKey = null;
    renderizarClientesSimples();
    renderizarVentas();
    mostrarToastNotificacion('Perfil de cliente eliminado');
};

function activarEdicionCliente(index) { abrirModalEdicionCliente(index); }
function cancelarEdicionCliente() { clienteEditandoIndex = null; renderizarClientes(); if (document.getElementById('sec-ventas').classList.contains('active')) renderizarVentas(); renderizarClientesSimples(); }

var editModalClienteIndex = null;
var editModalProdContador = 0;

window.abrirModalEdicionCliente = function(index) {
    editModalClienteIndex = index;
    var c = clientes[index];
    document.getElementById('edit-cliente-modal-titulo').innerText = 'Editar Venta - ' + (c.nombre || '');
    document.getElementById('edit-modal-fecha').value = c.fechaRegistro || '';
    document.getElementById('edit-modal-nombre').value = c.nombre || '';
    document.getElementById('edit-modal-tel').value = c.tel || '';
    document.getElementById('edit-modal-total').value = c.total || 0;
    document.getElementById('edit-modal-totalbs').value = c.totalBs || 0;
    document.getElementById('edit-modal-pagado').value = c.pagado || 0;
    document.getElementById('edit-modal-pagadobs').value = c.pagadoBs || 0;

    // Usar tasa actual desde localStorage, fallback a la calculada de la venta
    var tasaActual = (localStorage.getItem('modoTasa') === 'auto' ? parseFloat(localStorage.getItem('tasaAuto')) : parseFloat(localStorage.getItem('tasaCambio'))) || 0;
    if (!tasaActual && c.total && c.total > 0 && c.totalBs && c.totalBs > 0) {
        tasaActual = c.totalBs / c.total;
    }
    var tasaFinal = tasaActual || 0;
    document.getElementById('edit-modal-tasa').value = tasaFinal.toFixed(2);

    // Auto-calc totalBs cuando cambie total
    var totalInput = document.getElementById('edit-modal-total');
    if (totalInput && !totalInput._autoCalcEditTotal) {
        totalInput._autoCalcEditTotal = true;
        totalInput.addEventListener('input', function() {
            var tasa = parseFloat(document.getElementById('edit-modal-tasa').value) || 0;
            var totBsInput = document.getElementById('edit-modal-totalbs');
            if (tasa > 0 && this.value) {
                totBsInput.value = (parseFloat(this.value) * tasa).toFixed(2);
            }
        });
    }

    // Auto-calc pagadoBs cuando cambie pagado
    var pagadoInput = document.getElementById('edit-modal-pagado');
    if (pagadoInput && !pagadoInput._autoCalcEdit) {
        pagadoInput._autoCalcEdit = true;
        pagadoInput.addEventListener('input', function() {
            var tasa = parseFloat(document.getElementById('edit-modal-tasa').value) || 0;
            var pagadobsInput = document.getElementById('edit-modal-pagadobs');
            if (tasa > 0 && this.value) {
                pagadobsInput.value = (parseFloat(this.value) * tasa).toFixed(2);
            } else if (!this.value) {
                pagadobsInput.value = '';
            }
        });
    }

    var lista = document.getElementById('edit-modal-productos-lista');
    lista.innerHTML = '';
    editModalProdContador = 0;
    var prods = Array.isArray(c.productos) ? c.productos : (c.productoVendido ? [c.productoVendido] : []);
    var cantidades = c.cantidades || [];
    if (prods.length === 0) prods = [''];
    prods.forEach(function(p, idx) {
        var qty = cantidades[idx] || 1;
        agregarFilaProductoEdicionModal(p, qty);
    });
    document.getElementById('editar-cliente-modal').style.display = 'flex';
};

window.cerrarModalEdicionCliente = function() {
    document.getElementById('editar-cliente-modal').style.display = 'none';
    editModalClienteIndex = null;
    renderizarVentas();
    renderizarClientesSimples();
};

window.agregarFilaProductoEdicionModal = function(valor, cantidad) {
    var id = editModalProdContador++;
    var lista = document.getElementById('edit-modal-productos-lista');
    var div = document.createElement('div');
    div.className = 'producto-fila';
    div.style.marginBottom = '6px';
    div.id = 'edit-modal-prod-fila-' + id;
    var sel = document.createElement('select');
    sel.id = 'edit-modal-prod-' + id;
    sel.className = 'table-input-compact';
    sel.style.flex = '1';
    sel.innerHTML = '<option value="">Seleccionar...</option>' + inventario.map(function(p) { return '<option value="' + escapeHtml(p.nombre) + '">' + escapeHtml(p.nombre) + '</option>'; }).join('');
    if (valor) sel.value = valor;
    sel.onchange = function() { actualizarTotalFromModal(); };
    div.appendChild(sel);
    var cantInput = document.createElement('input');
    cantInput.type = 'number';
    cantInput.className = 'table-input-compact';
    cantInput.id = 'edit-modal-prod-cant-' + id;
    cantInput.value = cantidad || 1;
    cantInput.min = 1;
    cantInput.style.width = '55px';
    cantInput.style.textAlign = 'center';
    cantInput.oninput = function() { actualizarTotalFromModal(); };
    div.appendChild(cantInput);
    var rmBtn = document.createElement('button');
    rmBtn.type = 'button';
    rmBtn.className = 'btn-remove-prod';
    rmBtn.textContent = '✕';
    rmBtn.onclick = function() {
        if (lista.children.length > 1) { div.remove(); actualizarTotalFromModal(); }
    };
    div.appendChild(rmBtn);
    lista.appendChild(div);
    return id;
};

window.actualizarTotalFromModal = function() {
    var total = 0;
    var filas = document.querySelectorAll('#edit-modal-productos-lista .producto-fila');
    filas.forEach(function(fila) {
        var sel = fila.querySelector('select');
        var cant = parseInt(fila.querySelector('input[type="number"]')?.value || 1);
        var prod = inventario.find(function(p) { return p.nombre === sel?.value; });
        if (prod) total += prod.precio * Math.max(1, cant);
    });
    var totInput = document.getElementById('edit-modal-total');
    var totBsInput = document.getElementById('edit-modal-totalbs');
    var tasaInput = document.getElementById('edit-modal-tasa');
    if (totInput && total > 0) totInput.value = total.toFixed(2);
    var tasa = parseFloat(tasaInput?.value) || (localStorage.getItem('modoTasa') === 'auto' ? parseFloat(localStorage.getItem('tasaAuto')) : parseFloat(localStorage.getItem('tasaCambio'))) || 0;
    if (tasaInput && tasa > 0 && !tasaInput.value) tasaInput.value = tasa.toFixed(2);
    if (totBsInput && tasa > 0 && total > 0) totBsInput.value = (total * tasa).toFixed(2);
};

window.guardarModalEdicionCliente = function() {
    var index = editModalClienteIndex;
    if (index === null) return;

    // Restore stock from original products before overwriting
    var oldProds = clientes[index].productos || [];
    var oldCants = clientes[index].cantidades || [];
    oldProds.forEach(function(prodName, pi) {
        var prodInv = inventario.find(function(p) { return p.nombre === prodName; });
        if (prodInv) {
            prodInv.cantidad = (parseInt(prodInv.cantidad) || 0) + (parseInt(oldCants[pi]) || 1);
        }
    });

    clientes[index].fechaRegistro = document.getElementById('edit-modal-fecha').value;
    clientes[index].nombre = document.getElementById('edit-modal-nombre').value;
    clientes[index].tel = document.getElementById('edit-modal-tel').value;
    var prods = [];
    var cantidades = [];
    var fotosAuto = [];
    var fotosSetEdit = new Set();
    document.querySelectorAll('#edit-modal-productos-lista .producto-fila').forEach(function(fila) {
        var sel = fila.querySelector('select');
        if (sel && sel.value) {
            prods.push(sel.value);
            var cant = parseInt(fila.querySelector('input[type="number"]')?.value || 1);
            cantidades.push(cant);
            var pAlmacen = inventario.find(function(p) { return p.nombre === sel.value; });
            if (pAlmacen && pAlmacen.fotos && pAlmacen.fotos.length > 0) {
                var primera = pAlmacen.fotos[0];
                if (!fotosSetEdit.has(primera)) {
                    fotosSetEdit.add(primera);
                    fotosAuto.push(primera);
                }
            }
        }
    });
    // Deduct stock for new products
    prods.forEach(function(prodName, pi) {
        var prodInv = inventario.find(function(p) { return p.nombre === prodName; });
        if (prodInv) {
            var antes = parseInt(prodInv.cantidad) || 0;
            prodInv.cantidad = Math.max(0, antes - (cantidades[pi] || 1));
        }
    });
    clientes[index].productos = prods;
    clientes[index].cantidades = cantidades;
    if (fotosAuto.length > 0) clientes[index].fotoProducto = fotosAuto;
    clientes[index].total = parseFloat(document.getElementById('edit-modal-total').value || 0);
    clientes[index].totalBs = parseFloat(document.getElementById('edit-modal-totalbs').value || 0);
    clientes[index].pagado = parseFloat(document.getElementById('edit-modal-pagado').value || 0);
    clientes[index].pagadoBs = parseFloat(document.getElementById('edit-modal-pagadobs').value || 0);
    actualizarSistema();
    cerrarModalEdicionCliente();
    mostrarToastNotificacion("Cambios guardados");
};

window.eliminarModalEdicionCliente = async function() {
    var index = editModalClienteIndex;
    if (index === null) return;
    if (!(await mostrarConfirmacion("¿Eliminar esta venta?"))) return;
    clientes.splice(index, 1);
    actualizarSistema();
    cerrarModalEdicionCliente();
};

// GESTOR DE FOTOS DE PRODUCTO (INVENTARIO)
let managerProductoIndexActivo = null;
let managerProductoFotoIndexSeleccionada = null;

window.abrirManagerFotosProducto = function(index) {
    managerProductoIndexActivo = index;
    const prod = inventario[index];
    if (!prod.fotos) prod.fotos = [];
    document.getElementById('prod-fotos-modal-titulo').innerText = `Fotos de: ${prod.nombre}`;
    managerProductoFotoIndexSeleccionada = prod.fotos.length > 0 ? 0 : null;
    document.getElementById('producto-fotos-manager-modal').style.display = 'flex';
    prodFotosRefrescarModal();
};

window.cerrarManagerFotosProducto = function() {
    document.getElementById('producto-fotos-manager-modal').style.display = 'none';
    renderizarTabla();
};

function prodFotosRefrescarModal() {
    const fotos = inventario[managerProductoIndexActivo].fotos || [];
    const principal = fotos.length > 0 ? fotos[0] : null;
    const adicionales = fotos.slice(1);
    const grande = document.getElementById('prod-fotos-grande-target');
    const lista = document.getElementById('prod-fotos-lista-miniaturas');
    const principalArea = document.getElementById('prod-foto-principal-area');

    // SECCIÓN 1: Foto principal
    var uploadBtn = '<input type="file" id="input-prod-principal" accept="image/*" style="display:none;" onchange="prodFotosAgregarPrincipal(event)">'
        + '<button class="btn-edit-action" onclick="document.getElementById(\'input-prod-principal\').click()" style="padding:6px 16px;font-weight:600;font-size:0.8rem;">📁 Subir foto</button>';
    if (principal) {
        principalArea.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;gap:6px;">'
            + '<img src="' + principal + '" style="width:100px;height:100px;object-fit:cover;border-radius:10px;border:3px solid #6366f1;">'
            + uploadBtn
            + '</div>';
    } else {
        principalArea.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;gap:6px;">'
            + '<div style="color:#94a3b8;font-size:0.85rem;">Sin foto principal</div>'
            + uploadBtn
            + '</div>';
    }

    // SECCIÓN 2: Fotos adicionales (miniaturas)
    if (adicionales.length > 0) {
        lista.innerHTML = adicionales.map(function(img, idx) {
            var realIdx = idx + 1;
            return '<img src="' + img + '" class="img-manager-thumb ' + (realIdx === managerProductoFotoIndexSeleccionada ? 'selected-active' : '') + '" onclick="prodFotosSeleccionarFoto(' + realIdx + ')">';
        }).join('');
    } else {
        lista.innerHTML = '';
    }
    document.getElementById('prod-fotos-adicionales-count').innerText = adicionales.length > 0 ? '(' + adicionales.length + ')' : '';

    // SECCIÓN 3: Previsualización y edición
    if (managerProductoFotoIndexSeleccionada !== null && fotos[managerProductoFotoIndexSeleccionada]) {
        grande.src = fotos[managerProductoFotoIndexSeleccionada];
        grande.style.display = "block";
    } else if (fotos.length > 0) {
        grande.src = fotos[0];
        grande.style.display = "block";
    } else {
        grande.src = "";
        grande.style.display = "none";
    }
}

function prodFotosSeleccionarFoto(idx) {
    managerProductoFotoIndexSeleccionada = idx;
    prodFotosRefrescarModal();
}

async function prodFotosProcesarReemplazo(event) {
    if (managerProductoFotoIndexSeleccionada === null) return;
    const file = event.target.files[0];
    if (!file) return;
    const b64 = await new Promise(r => { const reader = new FileReader(); reader.onload = () => r(reader.result); reader.readAsDataURL(file); });
    inventario[managerProductoIndexActivo].fotos[managerProductoFotoIndexSeleccionada] = b64;
    event.target.value = "";
    actualizarSistema();
    prodFotosRefrescarModal();
}

async function prodFotosEliminarSeleccionada() {
    if (managerProductoFotoIndexSeleccionada === null) return;
    if (!(await mostrarConfirmacion("¿Eliminar esta foto?"))) return;
    inventario[managerProductoIndexActivo].fotos.splice(managerProductoFotoIndexSeleccionada, 1);
    managerProductoFotoIndexSeleccionada = inventario[managerProductoIndexActivo].fotos.length > 0 ? 0 : null;
    actualizarSistema();
    prodFotosRefrescarModal();
}

async function prodFotosAgregarMas(event) {
    const files = event.target.files;
    for (let i = 0; i < files.length; i++) {
        const b64 = await new Promise(r => { const reader = new FileReader(); reader.onload = () => r(reader.result); reader.readAsDataURL(files[i]); });
        inventario[managerProductoIndexActivo].fotos.push(b64);
    }
    managerProductoFotoIndexSeleccionada = inventario[managerProductoIndexActivo].fotos.length - 1;
    event.target.value = "";
    actualizarSistema();
    prodFotosRefrescarModal();
}

async function prodFotosAgregarPrincipal(event) {
    const file = event.target.files[0];
    if (!file) return;
    const b64 = await new Promise(r => { const reader = new FileReader(); reader.onload = () => r(reader.result); reader.readAsDataURL(file); });
    const fotos = inventario[managerProductoIndexActivo].fotos;
    if (fotos.length > 0) {
        fotos[0] = b64;
    } else {
        fotos.push(b64);
    }
    managerProductoFotoIndexSeleccionada = 0;
    event.target.value = "";
    actualizarSistema();
    prodFotosRefrescarModal();
}

async function prodFotosEstablecerComoPrincipal() {
    if (managerProductoFotoIndexSeleccionada === null || managerProductoFotoIndexSeleccionada === 0) return;
    if (!(await mostrarConfirmacion("¿Establecer esta foto como principal? Se moverá al inicio."))) return;
    const fotos = inventario[managerProductoIndexActivo].fotos;
    var idx = managerProductoFotoIndexSeleccionada;
    var foto = fotos.splice(idx, 1)[0];
    fotos.unshift(foto);
    managerProductoFotoIndexSeleccionada = 0;
    actualizarSistema();
    prodFotosRefrescarModal();
}

// GESTOR DE FOTO ÚNICA (CATEGORÍAS Y MARCAS)
let singleFotoManagerTipo = null;
let singleFotoManagerIndex = null;

window.abrirManagerSingleFoto = function(tipo, index) {
    singleFotoManagerTipo = tipo;
    singleFotoManagerIndex = index;
    const arr = tipo === 'categoria' ? categories : marcas;
    const item = arr[index];
    const label = tipo === 'categoria' ? 'Categoría' : 'Marca';
    document.getElementById('single-foto-modal-titulo').innerText = `Foto de ${label}: ${item.nombre}`;
    document.getElementById('single-foto-modal-desc').innerText = `Reemplace o elimine la foto de esta ${label.toLowerCase()}.`;
    const img = document.getElementById('single-foto-grande-target');
    if (item.foto) {
        img.src = item.foto;
        img.style.display = 'block';
    } else {
        img.src = '';
        img.style.display = 'none';
    }
    document.getElementById('single-foto-manager-modal').style.display = 'flex';
};

window.cerrarManagerSingleFoto = function() {
    document.getElementById('single-foto-manager-modal').style.display = 'none';
    const tipo = singleFotoManagerTipo;
    if (tipo === 'categoria') renderizarCategorias();
    else renderizarMarcas();
};

async function singleFotoReemplazar(event) {
    const file = event.target.files[0];
    if (!file) return;
    const b64 = await new Promise(r => { const reader = new FileReader(); reader.onload = () => r(reader.result); reader.readAsDataURL(file); });
    const arr = singleFotoManagerTipo === 'categoria' ? categories : marcas;
    arr[singleFotoManagerIndex].foto = b64;
    event.target.value = "";
    actualizarSistema();
    const img = document.getElementById('single-foto-grande-target');
    img.src = b64;
    img.style.display = 'block';
}

async function singleFotoEliminar() {
    if (!(await mostrarConfirmacion(`¿Eliminar la foto de ${singleFotoManagerTipo === 'categoria' ? 'esta categoría' : 'esta marca'}?`))) return;
    const arr = singleFotoManagerTipo === 'categoria' ? categories : marcas;
    arr[singleFotoManagerIndex].foto = "";
    actualizarSistema();
    const img = document.getElementById('single-foto-grande-target');
    img.src = '';
    img.style.display = 'none';
}

// VISUALIZADOR MODAL DE IMÁGENES
function abrirManagerFotoProducto(clienteIndex) {
    managerProdClienteIndexActivo = clienteIndex;
    const cliente = clientes[clienteIndex];
    const fotos = cliente.fotoProducto || [];
    var prodName = Array.isArray(cliente.productos) && cliente.productos.length > 0 ? cliente.productos[0] : (cliente.productoVendido || 'Producto');
    document.getElementById('prod-modal-titulo').innerText = `Imágenes del Producto: ${prodName}`;
    managerProdFotoIndexSeleccionada = fotos.length > 0 ? 0 : null;
    document.getElementById('producto-foto-manager-modal').style.display = 'flex';
    prodRefrescarModal();
}
function cerrarManagerFotoProducto() {
    document.getElementById('producto-foto-manager-modal').style.display = 'none';
}
function prodRefrescarModal() {
    const listaContenedor = document.getElementById('prod-lista-miniaturas');
    const visualizadorGrande = document.getElementById('prod-grande-target');
    const fotos = clientes[managerProdClienteIndexActivo].fotoProducto || [];
    listaContenedor.innerHTML = fotos.map((img, idx) => `<img src="${String(img).replace(/"/g, '&quot;')}" class="img-manager-thumb ${idx === managerProdFotoIndexSeleccionada ? 'selected-active' : ''}" onclick="prodSeleccionarFoto(${idx})">`).join('');
    if(managerProdFotoIndexSeleccionada !== null && fotos[managerProdFotoIndexSeleccionada]) {
        visualizadorGrande.src = fotos[managerProdFotoIndexSeleccionada];
        visualizadorGrande.style.display = "block";
    } else { visualizadorGrande.src = ""; visualizadorGrande.style.display = "none"; }
}
function prodSeleccionarFoto(index) { managerProdFotoIndexSeleccionada = index; prodRefrescarModal(); }

// GESTOR DE RECIBOS
function abrirManagerRecibos(clienteIndex) {
    managerClienteIndexActivo = clienteIndex;
    const cliente = clientes[clienteIndex];
    if(!cliente.recibo) cliente.recibo = [];
    document.getElementById('recibos-modal-titulo').innerText = `Recibos de: ${cliente.nombre}`;
    managerFotoIndexSeleccionada = cliente.recibo.length > 0 ? 0 : null;
    document.getElementById('recibos-manager-modal').style.display = 'flex';
    recibosRefrescarModal();
}
function cerrarManagerRecibos() {
    document.getElementById('recibos-manager-modal').style.display = 'none';
    renderizarVentas();
    renderizarClientesSimples();
}

function abrirDetalleVenta(index) {
    var c = clientes[index];
    if (!c) return;
    var s = getStatusData(c);
    var prods = Array.isArray(c.productos) ? c.productos : (c.productoVendido ? [c.productoVendido] : []);
    var cantidades = c.cantidades || [];

    var tasaActual = (localStorage.getItem('modoTasa') === 'auto' ? parseFloat(localStorage.getItem('tasaAuto')) : parseFloat(localStorage.getItem('tasaCambio'))) || 0;
    var totalBs = c.totalBs || (tasaActual > 0 ? (c.total || 0) * tasaActual : 0);
    var tasaGuardada = c.tasa || (c.total > 0 ? ((c.totalBs || 0) / c.total) : 0);

    var statusColor = s.status === 'pagado' ? '#16a34a' : s.status === 'parcial' ? '#d97706' : '#ef4444';
    var statusLabel = s.status === 'pagado' ? '✅ Pagado' : s.status === 'parcial' ? '⚠️ Parcial' : '❌ Deuda';

    var productosHtml = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px;margin-top:4px;">'
        + prods.map(function(p, idx) {
            var qty = cantidades[idx] || 1;
            var prodInv = inventario.find(function(ip) { return ip.nombre === p; });
            var fotoUrl = prodInv && prodInv.fotos && prodInv.fotos.length > 0 ? prodInv.fotos[0] : null;
            var fotoHtml = fotoUrl ? '<img src="' + fotoUrl + '" style="width:100%;height:100%;object-fit:contain;border-radius:6px;">' : '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:1.8rem;color:#94a3b8;">📦</div>';
            return '<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:10px;display:flex;flex-direction:column;gap:6px;">'
                + '<div style="width:100%;height:80px;background:white;border-radius:6px;overflow:hidden;display:flex;align-items:center;justify-content:center;">' + fotoHtml + '</div>'
                + '<div style="font-weight:600;font-size:0.85rem;text-align:center;">' + escapeHtml(p) + '</div>'
                + '<div style="display:flex;justify-content:space-between;align-items:center;font-size:0.8rem;">'
                + '<span style="color:#64748b;">x' + qty + '</span>'
                + '<span style="font-weight:700;color:#059669;">$' + ((prodInv ? prodInv.precio : 0) * qty).toFixed(2) + '</span>'
                + '</div></div>';
        }).join('')
        + '</div>';

    var fotosRecibos = c.recibo ? (Array.isArray(c.recibo) ? c.recibo : [c.recibo]) : [];
    var recibosHtml = fotosRecibos.length > 0
        ? '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:4px;">'
            + fotosRecibos.map(function(img) {
                return '<div style="width:80px;height:80px;background:#f8fafc;border:2px solid #e2e8f0;border-radius:10px;overflow:hidden;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:border-color 0.15s;box-shadow:0 1px 4px rgba(0,0,0,0.06);" onclick="ampliarImagen(this)" data-src="' + img + '">'
                    + '<img src="' + img + '" style="width:100%;height:100%;object-fit:cover;">'
                    + '</div>';
            }).join('')
            + '</div>'
        : '<span style="color:#94a3b8;">Sin recibos</span>';

    var tasaRow = tasaGuardada > 0
        ? '<div><span style="color:#64748b;font-size:0.8rem;">Tasa aplicada</span><div style="font-weight:600;">Bs. ' + tasaGuardada.toFixed(2) + '</div></div>'
        : '';

    document.getElementById('detalle-venta-titulo').innerText = 'Detalle de Venta - ' + c.nombre;
    document.getElementById('detalle-venta-body').innerHTML = '<div style="display:grid;gap:16px;">'
        + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;background:#f8fafc;padding:16px;border-radius:12px;">'
        + '<div><span style="color:#64748b;font-size:0.8rem;">Cliente</span><div style="font-weight:600;">' + escapeHtml(c.nombre) + '</div></div>'
        + '<div><span style="color:#64748b;font-size:0.8rem;">Teléfono</span><div>' + escapeHtml(c.tel || '—') + '</div></div>'
        + '<div><span style="color:#64748b;font-size:0.8rem;">Fecha</span><div>' + (c.fechaRegistro || '—') + '</div></div>'
        + '<div><span style="color:#64748b;font-size:0.8rem;">Estado</span><div><span style="background:' + statusColor + ';color:white;padding:2px 10px;border-radius:12px;font-size:0.8rem;">' + statusLabel + '</span></div></div>'
        + '<div><span style="color:#64748b;font-size:0.8rem;">Total</span><div style="font-weight:700;font-size:1.1rem;">$' + (c.total||0).toFixed(2) + '</div></div>'
        + '<div><span style="color:#64748b;font-size:0.8rem;">Total Bs.</span><div>Bs. ' + totalBs.toFixed(2) + '</div></div>'
        + '<div><span style="color:#64748b;font-size:0.8rem;">Pagado</span><div style="color:#16a34a;font-weight:600;">$' + (c.pagado||0).toFixed(2) + '</div></div>'
        + '<div><span style="color:#64748b;font-size:0.8rem;">Deuda</span><div style="color:' + statusColor + ';font-weight:600;">$' + s.deuda.toFixed(2) + '</div></div>'
        + tasaRow
        + '</div>'
        + '<div><strong style="color:#1e293b;">Productos</strong>' + productosHtml + '</div>'
        + '<div><strong style="color:#1e293b;">Recibos</strong>' + recibosHtml + '</div>'
        + '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px;">'
        + '<button class="btn-edit-action" onclick="abrirManagerRecibos(' + index + ')" style="background:#fef3c7;color:#92400e;padding:8px 16px;">📎 Recibos</button>'
        + '<button class="btn-edit-action" onclick="activarEdicionCliente(' + index + ');cerrarDetalleVenta();" style="padding:8px 16px;">✏️ Editar</button>'
        + '</div>'
        + '</div>';

    document.getElementById('detalle-venta-modal').style.display = 'flex';
}

function ampliarImagen(el) {
    var src = typeof el === 'string' ? el : (el.getAttribute ? el.getAttribute('data-src') || el.src : '');
    if (!src) return;
    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:200000;display:flex;align-items:center;justify-content:center;cursor:zoom-out;';
    overlay.onclick = function() { overlay.remove(); };
    var img = document.createElement('img');
    img.src = src;
    img.style.cssText = 'max-width:90vw;max-height:90vh;border-radius:12px;box-shadow:0 30px 80px rgba(0,0,0,0.4);object-fit:contain;';
    overlay.appendChild(img);
    document.body.appendChild(overlay);
}

function cerrarDetalleVenta() {
    document.getElementById('detalle-venta-modal').style.display = 'none';
}
function recibosRefrescarModal() {
    const listaContenedor = document.getElementById('recibos-lista-miniaturas');
    const visualizadorGrande = document.getElementById('recibo-grande-target');
    const fotos = clientes[managerClienteIndexActivo].recibo;
    listaContenedor.innerHTML = fotos.map((img, idx) => `<img src="${String(img).replace(/"/g, '&quot;')}" class="img-manager-thumb ${idx === managerFotoIndexSeleccionada ? 'selected-active' : ''}" onclick="recibosSeleccionarFoto(${idx})">`).join('');
    if(managerFotoIndexSeleccionada !== null && fotos[managerFotoIndexSeleccionada]) {
        visualizadorGrande.src = fotos[managerFotoIndexSeleccionada];
        visualizadorGrande.style.display = "block";
    } else { visualizadorGrande.src = ""; visualizadorGrande.style.display = "none"; }
}
function recibosSeleccionarFoto(index) { managerFotoIndexSeleccionada = index; recibosRefrescarModal(); }

async function recibosProcesarReemplazo(event) {
    if(managerFotoIndexSeleccionada === null) return;
    const file = event.target.files[0];
    if(!file) return;
    const b64 = await new Promise(r => { const reader = new FileReader(); reader.onload = () => r(reader.result); reader.readAsDataURL(file); });
    clientes[managerClienteIndexActivo].recibo[managerFotoIndexSeleccionada] = b64;
    event.target.value = ""; 
    actualizarSistema(); recibosRefrescarModal();
}
async function recibosEliminarSeleccionada() {
    if(managerFotoIndexSeleccionada === null) return;
    if(!(await mostrarConfirmacion("¿Deseas remover esta foto?"))) return;
    clientes[managerClienteIndexActivo].recibo.splice(managerFotoIndexSeleccionada, 1);
    managerFotoIndexSeleccionada = clientes[managerClienteIndexActivo].recibo.length > 0 ? 0 : null;
    actualizarSistema(); recibosRefrescarModal();
}
async function recibosAgregarMasFotosNuevas(event) {
    const files = event.target.files;
    for(let i=0; i<files.length; i++) {
        const b64 = await new Promise(r => { const reader = new FileReader(); reader.onload = () => r(reader.result); reader.readAsDataURL(files[i]); });
        clientes[managerClienteIndexActivo].recibo.push(b64);
    }
    managerFotoIndexSeleccionada = clientes[managerClienteIndexActivo].recibo.length - 1;
    event.target.value = ""; 
    actualizarSistema(); recibosRefrescarModal();
}

// ALERTA STOCK BAJO
window.actualizarAlertaStockBajo = function() {
    var banner = document.getElementById('low-stock-banner');
    var count = document.getElementById('low-stock-count');
    if (!banner || !count) return;
    var bajos = inventario.filter(function(p) { return p.cantidad > 0 && p.cantidad <= 5; });
    if (bajos.length > 0) {
        count.textContent = bajos.length;
        banner.style.display = 'flex';
    } else {
        banner.style.display = 'none';
    }
};



// MULTI-ADMIN
function renderizarAdminUsers() {
    var container = document.getElementById('admin-users-list');
    if (!container) return;
    var users = JSON.parse(localStorage.getItem('adminUsers') || '[]');
    var currentUser = localStorage.getItem('dash_user') || 'admin';
    if (!users.length) { container.innerHTML = '<div style="color:#94a3b8;padding:12px;text-align:center;">Sin usuarios configurados.</div>'; return; }
    container.innerHTML = '<div style="display:flex;flex-direction:column;gap:6px;">' + users.map(function(u, i) {
        var roles = { admin: 'Admin', editor: 'Editor', viewer: 'Visor' };
        var isCurrent = u.usuario === currentUser;
        var badgeClass = u.rol === 'admin' ? 'badge-estado activo' : (u.rol === 'editor' ? 'badge-pendiente' : 'badge-estado inactivo');
        return '<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:#f8fafc;border-radius:10px;border:1px solid var(--border-light);">'
            + '<div><span style="font-weight:600;font-size:0.9rem;">' + u.usuario + '</span>'
            + (isCurrent ? ' <span style="font-size:0.75rem;color:#6366f1;">(tú)</span>' : '')
            + '<br><span class="' + badgeClass + '" style="font-size:0.75rem;padding:2px 8px;">' + (roles[u.rol] || u.rol) + '</span></div>'
            + (u.rol !== 'admin' || users.length > 1 ? '<button class="btn-edit-action" onclick="eliminarAdminUser(' + i + ')" style="padding:4px 10px;font-size:0.75rem;background:#fef2f2;border-color:#fecaca;color:#dc2626;">🗑️</button>' : '')
            + '</div>';
    }).join('') + '</div>';
}

window.eliminarAdminUser = function(index) {
    var users = JSON.parse(localStorage.getItem('adminUsers') || '[]');
    var currentUser = localStorage.getItem('dash_user') || 'admin';
    if (users[index].usuario === 'admin' && users.filter(function(u) { return u.rol === 'admin'; }).length <= 1) {
        mostrarToastNotificacion('No puedes eliminar el único administrador', 'error');
        return;
    }
    if (users[index].usuario === currentUser) {
        mostrarToastNotificacion('No puedes eliminarte a ti mismo', 'error');
        return;
    }
    if (!confirm('¿Eliminar usuario "' + users[index].usuario + '"?')) return;
    users.splice(index, 1);
    localStorage.setItem('adminUsers', JSON.stringify(users));
    renderizarAdminUsers();
    mostrarToastNotificacion('Usuario eliminado');
};

window.resetAdminUsers = function() {
    if (!confirm('¿Restaurar el admin por defecto? Esto eliminará todos los usuarios actuales.')) return;
    var defaultUsers = [{ usuario: 'admin', pass: '__PLAINTEXT__admin123', rol: 'admin', creado: new Date().toISOString() }];
    localStorage.setItem('adminUsers', JSON.stringify(defaultUsers));
    localStorage.removeItem('dash_authenticated');
    localStorage.removeItem('dash_user');
    localStorage.removeItem('dash_user_rol');
    renderizarAdminUsers();
    mostrarToastNotificacion('🔄 Admin restaurado. Recargando...');
    setTimeout(function() { location.reload(); }, 1500);
};

// PERSISTENCIA COHERENTE
function safeSetItem(key, val) {
    try { localStorage.setItem(key, val); return true; } catch (e) {
        if (e.name === 'QuotaExceededError' || e.code === 22) {
            mostrarToastNotificacion('⚠️ Espacio insuficiente en el almacenamiento. Las fotos grandes consumen mucho espacio.', 'error');
        } else {
            mostrarToastNotificacion('Error al guardar: ' + e.message, 'error');
        }
        console.warn('[safeSetItem] Error guardando ' + key + ':', e);
        return false;
    }
}

function actualizarSistema() {
    safeSetItem('inventario', JSON.stringify(inventario));
    safeSetItem('clientes', JSON.stringify(clientes));
    safeSetItem('categoriasObj', JSON.stringify(categories));
    safeSetItem('marcasObj', JSON.stringify(marcas));
    actualizarDashboard();
}

async function eliminarRegistro(tipo, i) {
    if(!(await mostrarConfirmacion("¿Deseas eliminar este registro?"))) return;
    if(tipo === 'inv') inventario.splice(i, 1);
    else clientes.splice(i, 1);
    actualizarSistema();
    mostrarSeccion(tipo === 'inv' ? 'sec-productos' : 'sec-clientes', tipo === 'inv' ? 'inventario' : '');
}

function ampliarImagenRecibo(src) {
    const modal = document.getElementById('image-modal');
    const img = document.getElementById('modal-img-target');
    if(modal && img) { modal.style.display = "flex"; img.src = src; }
}
function cerrarModalImagen() { document.getElementById('image-modal').style.display = "none"; }

// CONFIGURACIÓN INICIAL Y CARGA DE IMÁGENES COMPACTA
document.addEventListener('DOMContentLoaded', () => {
    inicializarDragCards();
    actualizarDashboard();
    actualizarSelectClientes();
    
    // Listeners para los textos de estado de los inputs file
    document.getElementById('cat-foto')?.addEventListener('change', (e) => {
        const i = document.getElementById('num-fotos-cat');
        if(i) { i.innerText = e.target.files.length > 0 ? "✔️ Seleccionada" : "Ninguna"; i.style.color = "var(--success)"; }
    });
    document.getElementById('mar-foto')?.addEventListener('change', (e) => {
        const i = document.getElementById('num-fotos-mar');
        if(i) { i.innerText = e.target.files.length > 0 ? "✔️ Seleccionada" : "Ninguna"; i.style.color = "var(--success)"; }
    });
    document.getElementById('cli-recibo')?.addEventListener('change', (e) => {
        const i = document.getElementById('num-fotos');
        if(i) { i.innerText = e.target.files.length > 0 ? `✔️ ${e.target.files.length} cargada(s)` : "Ninguno"; i.style.color = "var(--success)"; }
        previsualizarRecibos(e.target.files, 'recibo-preview-area');
    });
    document.getElementById('venta-recibo')?.addEventListener('change', (e) => {
        const i = document.getElementById('num-fotos-venta');
        if(i) { i.innerText = e.target.files.length > 0 ? `✔️ ${e.target.files.length} cargada(s)` : "Ninguno"; i.style.color = "var(--success)"; }
        previsualizarRecibos(e.target.files, 'recibo-preview-area-venta');
    });
    document.getElementById('prod-foto')?.addEventListener('change', (e) => {
        const i = document.getElementById('num-fotos-prod');
        if(i) { i.innerText = e.target.files.length > 0 ? `✔️ ${e.target.files.length} cargada(s)` : "Ninguna"; i.style.color = "var(--success)"; }
    });

    // Envío de Categorías con foto
    document.getElementById('form-categoria')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nom = document.getElementById('cat-nombre').value.trim();
        const f = document.getElementById('cat-foto').files[0];
        let foto = "";
        if(f) foto = await procesarImagen(f, 'categories', 400);
        
        if(nom && !categories.some(c => c.nombre === nom)) {
            categories.push({ nombre: nom, foto: foto });
            actualizarSistema(); renderizarCategorias(); e.target.reset();
            document.getElementById('num-fotos-cat').innerText = "Ninguna";
            toggleFormulario('form-container-categoria');
            mostrarToastNotificacion("Categoría creada con éxito");
            registrarActividad('Categoría creada', nom);
        }
    });

    // Envío de Marcas con foto
    document.getElementById('form-marca')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nom = document.getElementById('mar-nombre').value.trim();
        const f = document.getElementById('mar-foto').files[0];
        let foto = "";
        if(f) foto = await procesarImagen(f, 'brands', 400);
        
        if(nom && !marcas.some(m => m.nombre === nom)) {
            marcas.push({ nombre: nom, foto: foto });
            actualizarSistema(); renderizarMarcas(); e.target.reset();
            document.getElementById('num-fotos-mar').innerText = "Ninguna";
            toggleFormulario('form-container-marca');
            mostrarToastNotificacion("Marca creada con éxito");
            registrarActividad('Marca creada', nom);
        }
    });

    // ========== PEDIDOS (desde la tienda online) MEJORADO ==========
    window.Pedidos = {
        _filtro: 'all',

        setFilter: function(f) {
            this._filtro = f;
            document.querySelectorAll('#pedidos-filter-tabs .clientes-filter-btn').forEach(function(b) { b.classList.remove('active'); });
            var btn = document.querySelector('#pedidos-filter-tabs .clientes-filter-btn[data-filter="' + f + '"]');
            if (btn) btn.classList.add('active');
            this.render();
        },

        getEstadoBadge: function(estado) {
            var map = {
                'pendiente': { bg: '#fef3c7', color: '#92400e', label: '⏳ Pendiente' },
                'aprobado':  { bg: '#dcfce7', color: '#166534', label: '✅ Aprobado' },
                'cancelado': { bg: '#fee2e2', color: '#991b1b', label: '❌ Cancelado' },
                'entregado': { bg: '#d1fae5', color: '#065f46', label: '📦 Entregado' }
            };
            var m = map[estado] || map['pendiente'];
            return '<span class="badge-producto" style="background:' + m.bg + '; color:' + m.color + ';padding:3px 12px;border-radius:20px;font-size:0.75rem;font-weight:600;">' + m.label + '</span>';
        },

        render: function() {
            const tbody = document.getElementById('tabla-pedidos');
            if (!tbody) return;
            const pedidos = JSON.parse(localStorage.getItem('pedidosPendientes')) || [];
            var termino = (document.getElementById('buscar-pedido')?.value?.toLowerCase() || '').trim();

            var filtered = pedidos.filter(function(p, i) {
                if (window.Pedidos._filtro !== 'all' && p.estado !== window.Pedidos._filtro) return false;
                if (termino) {
                    var nom = (p.userNombre || '').toLowerCase();
                    var prods = (p.items || []).map(function(it) { return it.nombre; }).join(' ').toLowerCase();
                    var tel = (p.userTel || '').toLowerCase();
                    if (!nom.includes(termino) && !prods.includes(termino) && !tel.includes(termino)) return false;
                }
                return true;
            });

            if (filtered.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:30px;color:#94a3b8;">' + (termino ? 'Sin resultados para "' + termino + '"' : 'No hay pedidos aún.') + '</td></tr>';
                return;
            }

            tbody.innerHTML = filtered.map(function(entry) {
                var i = pedidos.indexOf(entry);
                var p = entry;
                var itemsHtml = (p.items || []).map(function(it) { return '<div style="font-size:0.8rem;">' + escapeHtml(it.nombre) + ' <span style="color:#64748b;">x' + (it.cantidad || 1) + '</span></div>'; }).join('');
                var fecha = p.fecha || '—';
                var fechaObj = new Date(p.fechaCompleta || p.fecha);
                var fechaStr = fechaObj instanceof Date && !isNaN(fechaObj) ? fechaObj.toLocaleDateString('es-VE', { day:'2-digit', month:'short' }) : fecha;

                var nombreCliente = p.userNombre || 'Anónimo';
                var telefono = p.userTel || '—';
                var email = p.userEmail || '—';
                var waLink = telefono !== '—' ? 'https://wa.me/' + telefono.replace(/[^0-9]/g, '') : null;
                var telDisplay = telefono === '—' ? '—' : formatearTelefono(telefono);

                var badgeEstado = window.Pedidos.getEstadoBadge(p.estado || 'pendiente');

                var editBtn = '<button onclick="Pedidos.editar(' + i + ')" class="btn-edit-action" style="padding:5px 10px;">✏️</button>';
                var acciones = '';
                if (p.estado === 'pendiente') {
                    acciones = '<button onclick="Pedidos.aprobar(' + i + ')" class="btn-edit-action" style="background:#dcfce7;color:#16a34a;border:1px solid #bbf7d0;padding:5px 12px;font-weight:600;">✅ Guardar</button>'
                        + '<button onclick="Pedidos.cancelar(' + i + ')" class="btn-edit-action" style="background:#fee2e2;color:#dc2626;border:1px solid #fecaca;padding:5px 12px;font-weight:600;">❌ Cancelar</button>';
                } else if (p.estado === 'aprobado') {
                    acciones = '<button onclick="Pedidos.entregar(' + i + ')" class="btn-edit-action" style="background:#d1fae5;color:#065f46;border:1px solid #a7f3d0;padding:5px 12px;font-weight:600;">📦 Entregar</button>'
                        + '<button onclick="Pedidos.eliminar(' + i + ')" class="btn-edit-action" style="background:#f1f5f9;color:#64748b;border:1px solid #e2e8f0;padding:5px 12px;">🗑️</button>';
                } else if (p.estado === 'entregado') {
                    acciones = '<button onclick="Pedidos.eliminar(' + i + ')" class="btn-edit-action" style="background:#f1f5f9;color:#64748b;border:1px solid #e2e8f0;padding:5px 12px;">🗑️</button>';
                } else if (p.estado === 'cancelado') {
                    acciones = '<button onclick="Pedidos.reabrir(' + i + ')" class="btn-edit-action" style="background:#fef3c7;color:#92400e;border:1px solid #fde68a;padding:5px 12px;font-weight:600;">🔄 Reabrir</button>'
                        + '<button onclick="Pedidos.eliminar(' + i + ')" class="btn-edit-action" style="background:#f1f5f9;color:#64748b;border:1px solid #e2e8f0;padding:5px 12px;">🗑️</button>';
                }
                acciones += editBtn + '<button onclick="Pedidos.verDetalle(' + i + ')" class="btn-edit-action" style="padding:5px 10px;">🔍</button>'
                    + (telefono !== '—' ? '<button onclick="Pedidos.contactar(' + i + ')" class="btn-edit-action" style="padding:5px 10px;background:#dcfce7;border-color:#bbf7d0;color:#16a34a;">📱</button>' : '');

                return '<tr>'
                    + '<td style="font-size:0.8rem;color:#64748b;white-space:nowrap;">' + fechaStr + '</td>'
                    + '<td><strong>' + escapeHtml(nombreCliente) + '</strong></td>'
                    + '<td style="font-size:0.8rem;">'
                        + (waLink ? '<a href="' + waLink + '" target="_blank" style="color:#22c55e;text-decoration:none;">📱 ' + telDisplay + '</a>' : '<span style="color:#94a3b8;">📱 ' + telDisplay + '</span>')
                        + (email && email !== '—' ? '<br><span style="color:#64748b;">✉️ ' + email + '</span>' : '')
                    + '</td>'
                    + '<td style="font-size:0.8rem;">' + itemsHtml + '</td>'
                    + '<td><strong>$' + (p.totalUSD || 0).toFixed(2) + '</strong><br><span style="font-size:0.75rem;color:#64748b;">Bs. ' + (p.totalBS || 0).toFixed(2) + '</span></td>'
                    + '<td>' + badgeEstado + '</td>'
                    + '<td class="table-actions-cell" style="gap:4px;justify-content:center;">' + acciones + '</td>'
                    + '</tr>';
            }).join('');
        },

        verDetalle: function(i) {
            const pedidos = JSON.parse(localStorage.getItem('pedidosPendientes')) || [];
            var p = pedidos[i];
            if (!p) return;
            var modal = document.getElementById('pedido-detalle-modal');
            var body = document.getElementById('pedido-detalle-body');
            document.getElementById('pedido-detalle-titulo').textContent = '📋 Detalle del Pedido';
            var fechaObj = new Date(p.fechaCompleta || p.fecha);
            var fechaStr = fechaObj instanceof Date && !isNaN(fechaObj) ? fechaObj.toLocaleString('es-VE') : (p.fecha || '—');

            var itemsHtml = (p.items || []).map(function(it, idx) {
                return '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #f1f5f9;">'
                    + '<div style="display:flex;align-items:center;gap:10px;">'
                    + (it.foto ? '<img src="' + it.foto + '" style="width:40px;height:40px;object-fit:cover;border-radius:6px;">' : '<div style="width:40px;height:40px;background:#f1f5f9;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:1.2rem;">📦</div>')
                    + '<div><strong style="font-size:0.9rem;">' + escapeHtml(it.nombre) + '</strong>'
                    + (it.categoria ? '<br><span style="font-size:0.7rem;color:#94a3b8;">' + it.categoria + (it.marca ? ' · ' + it.marca : '') + '</span>' : '')
                    + '</div></div>'
                    + '<div style="text-align:right;"><span style="font-weight:600;">$' + (it.precio || 0).toFixed(2) + '</span><br><span style="font-size:0.75rem;color:#64748b;">x' + (it.cantidad || 1) + '</span></div>'
                    + '</div>';
            }).join('');

            var waLink = p.userTel && p.userTel !== '—' ? 'https://wa.me/' + p.userTel.replace(/[^0-9]/g, '') : null;

            body.innerHTML = '<div style="padding:4px;">'
                + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px;padding:16px;background:#f8fafc;border-radius:12px;">'
                + '<div><div style="font-size:0.7rem;color:#94a3b8;text-transform:uppercase;font-weight:600;">Cliente</div><div style="font-weight:600;">' + escapeHtml(p.userNombre || 'Anónimo') + '</div></div>'
                + '<div><div style="font-size:0.7rem;color:#94a3b8;text-transform:uppercase;font-weight:600;">Fecha</div><div>' + fechaStr + '</div></div>'
                + (p.userTel && p.userTel !== '—' ? '<div><div style="font-size:0.7rem;color:#94a3b8;text-transform:uppercase;font-weight:600;">Teléfono</div><div>' + (waLink ? '<a href="' + waLink + '" target="_blank" style="color:#22c55e;text-decoration:none;">📱 ' + formatearTelefono(p.userTel) + '</a>' : '📱 ' + formatearTelefono(p.userTel)) + '</div></div>' : '')
                + (p.userEmail && p.userEmail !== '—' ? '<div><div style="font-size:0.7rem;color:#94a3b8;text-transform:uppercase;font-weight:600;">Email</div><div>✉️ ' + p.userEmail + '</div></div>' : '')
                + '<div><div style="font-size:0.7rem;color:#94a3b8;text-transform:uppercase;font-weight:600;">Estado</div><div>' + Pedidos.getEstadoBadge(p.estado || 'pendiente') + '</div></div>'
                + '<div><div style="font-size:0.7rem;color:#94a3b8;text-transform:uppercase;font-weight:600;">ID Pedido</div><div style="font-size:0.8rem;color:#64748b;">' + (p.id || '—') + '</div></div>'
                + '</div>'
                + '<h4 style="margin:0 0 12px;font-size:0.95rem;">Productos</h4>'
                + itemsHtml
                + '<div style="display:flex;justify-content:space-between;margin-top:16px;padding-top:12px;border-top:2px solid #e2e8f0;">'
                + '<div><span style="font-weight:700;font-size:1.1rem;">Total: $' + (p.totalUSD || 0).toFixed(2) + '</span></div>'
                + '<div><span style="font-weight:600;color:#64748b;">Bs. ' + (p.totalBS || 0).toFixed(2) + '</span></div>'
                + '</div>'
                + '</div>';
            modal.style.display = 'flex';
        },

        cerrarDetalle: function() {
            document.getElementById('pedido-detalle-modal').style.display = 'none';
        },

        // Close edit modal on backdrop click
        _init: function() {
            var editModal = document.getElementById('pedido-editar-modal');
            if (editModal) {
                editModal.addEventListener('click', function(e) {
                    if (e.target === editModal) Pedidos._cancelarEdicion();
                });
            }
        },

        aprobar: function(i) {
            const pedidos = JSON.parse(localStorage.getItem('pedidosPendientes')) || [];
            if (!pedidos[i]) return;
            if (pedidos[i].estado === 'aprobado') return;
            const p = pedidos[i];
            pedidos[i].estado = 'aprobado';
            var fotosItems = [];
            var fotosSet = {};
            (p.items || []).forEach(function(it) {
                if (it.foto && !fotosSet[it.foto]) { fotosSet[it.foto] = true; fotosItems.push(it.foto); }
            });
            var productosArr = (p.items || []).map(function(it) { return it.nombre; });
            var cantidadesArr = (p.items || []).map(function(it) { return it.cantidad || 1; });
            var tasaActual = (localStorage.getItem('modoTasa') === 'auto' ? parseFloat(localStorage.getItem('tasaAuto')) : parseFloat(localStorage.getItem('tasaCambio'))) || 0;
            clientes.push({
                fechaRegistro: p.fecha,
                nombre: p.userNombre || 'Cliente Web ' + (p.id || ''),
                tel: p.userTel || '—',
                productos: productosArr,
                cantidades: cantidadesArr,
                productoVendido: productosArr.join(', '),
                total: p.totalUSD || 0,
                totalBs: p.totalBS || 0,
                pagado: 0,
                pagadoBs: 0,
                fotoProducto: fotosItems,
                recibo: [],
                origen: 'tienda-online',
                pedidoId: p.id,
                tasa: tasaActual
            });
            localStorage.setItem('clientes', JSON.stringify(clientes));
            localStorage.setItem('pedidosPendientes', JSON.stringify(pedidos));
            actualizarSistema();
            Pedidos.render();
            registrarActividad('Pedido aprobado', (p.userNombre || 'Anónimo') + ' - $' + (p.totalUSD || 0).toFixed(2));
            mostrarToastNotificacion('✅ Pedido guardado en Ventas');
        },

        cancelar: async function(i) {
            if (!(await mostrarConfirmacion('¿Cancelar este pedido?'))) return;
            const pedidos = JSON.parse(localStorage.getItem('pedidosPendientes')) || [];
            if (!pedidos[i]) return;
            pedidos[i].estado = 'cancelado';
            localStorage.setItem('pedidosPendientes', JSON.stringify(pedidos));
            actualizarSistema();
            Pedidos.render();
            registrarActividad('Pedido cancelado', pedidos[i].userNombre || 'Anónimo');
            mostrarToastNotificacion('❌ Pedido cancelado');
        },

        entregar: async function(i) {
            if (!(await mostrarConfirmacion('¿Marcar este pedido como entregado?'))) return;
            const pedidos = JSON.parse(localStorage.getItem('pedidosPendientes')) || [];
            if (!pedidos[i]) return;
            var p = pedidos[i];
            pedidos[i].estado = 'entregado';
            (p.items || []).forEach(function(it) {
                var prodInv = inventario.find(function(pr) { return pr.nombre === it.nombre; });
                if (prodInv) {
                    var antes = parseInt(prodInv.cantidad) || 0;
                    prodInv.cantidad = Math.max(0, antes - (it.cantidad || 1));
                    registrarCambioStock(it.nombre, antes, prodInv.cantidad, 'Pedido entregado');
                }
            });
            localStorage.setItem('inventario', JSON.stringify(inventario));
            localStorage.setItem('pedidosPendientes', JSON.stringify(pedidos));
            actualizarSistema();
            Pedidos.render();
            registrarActividad('Pedido entregado', p.userNombre || 'Anónimo');
            mostrarToastNotificacion('📦 Pedido marcado como entregado');
        },

        eliminar: async function(i) {
            if (!(await mostrarConfirmacion('¿Eliminar este pedido permanentemente?'))) return;
            const pedidos = JSON.parse(localStorage.getItem('pedidosPendientes')) || [];
            pedidos.splice(i, 1);
            localStorage.setItem('pedidosPendientes', JSON.stringify(pedidos));
            actualizarSistema();
            Pedidos.render();
            mostrarToastNotificacion('Pedido eliminado');
        },

        editar: function(i) {
            const pedidos = JSON.parse(localStorage.getItem('pedidosPendientes')) || [];
            var p = pedidos[i];
            if (!p) return;
            Pedidos._editIndex = i;
            var modal = document.getElementById('pedido-editar-modal');
            var body = document.getElementById('pedido-editar-body');
            var html = '<div style="display:flex;flex-direction:column;gap:14px;padding:4px 0;">'
                + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">'
                + '<div><label style="display:block;font-size:0.75rem;font-weight:600;color:#64748b;margin-bottom:3px;">Cliente</label>'
                + '<input id="edit-pedido-nombre" value="' + escapeHtml(p.userNombre || '') + '" style="width:100%;padding:8px 10px;border:1px solid #e2e8f0;border-radius:8px;font-size:0.85rem;"></div>'
                + '<div><label style="display:block;font-size:0.75rem;font-weight:600;color:#64748b;margin-bottom:3px;">Teléfono</label>'
                + '<input id="edit-pedido-tel" value="' + escapeHtml(p.userTel || '') + '" style="width:100%;padding:8px 10px;border:1px solid #e2e8f0;border-radius:8px;font-size:0.85rem;"></div>'
                + '<div><label style="display:block;font-size:0.75rem;font-weight:600;color:#64748b;margin-bottom:3px;">Email</label>'
                + '<input id="edit-pedido-email" value="' + escapeHtml(p.userEmail || '') + '" style="width:100%;padding:8px 10px;border:1px solid #e2e8f0;border-radius:8px;font-size:0.85rem;"></div>'
                + '<div><label style="display:block;font-size:0.75rem;font-weight:600;color:#64748b;margin-bottom:3px;">Total USD</label>'
                + '<input id="edit-pedido-usd" type="number" step="0.01" value="' + (p.totalUSD || 0) + '" style="width:100%;padding:8px 10px;border:1px solid #e2e8f0;border-radius:8px;font-size:0.85rem;"></div>'
                + '<div><label style="display:block;font-size:0.75rem;font-weight:600;color:#64748b;margin-bottom:3px;">Total Bs.</label>'
                + '<input id="edit-pedido-bs" type="number" step="0.01" value="' + (p.totalBS || 0) + '" style="width:100%;padding:8px 10px;border:1px solid #e2e8f0;border-radius:8px;font-size:0.85rem;"></div>'
                + '<div><label style="display:block;font-size:0.75rem;font-weight:600;color:#64748b;margin-bottom:3px;">Estado</label>'
                + '<select id="edit-pedido-estado" style="width:100%;padding:8px 10px;border:1px solid #e2e8f0;border-radius:8px;font-size:0.85rem;">'
                + '<option value="pendiente"' + (p.estado === 'pendiente' ? ' selected' : '') + '>Pendiente</option>'
                + '<option value="aprobado"' + (p.estado === 'aprobado' ? ' selected' : '') + '>Aprobado</option>'
                + '<option value="entregado"' + (p.estado === 'entregado' ? ' selected' : '') + '>Entregado</option>'
                + '<option value="cancelado"' + (p.estado === 'cancelado' ? ' selected' : '') + '>Cancelado</option>'
                + '</select></div>'
                + '</div>'
                + '<div><label style="display:block;font-size:0.75rem;font-weight:600;color:#64748b;margin-bottom:3px;">Productos (edita nombres, cantidades y precios)</label>'
                + '<div id="edit-pedido-items" style="display:flex;flex-direction:column;gap:6px;">'
                + (p.items || []).map(function(it, idx) {
                    var fotoPreview = it.foto ? '<img src="' + it.foto + '" style="width:32px;height:32px;object-fit:cover;border-radius:4px;">' : '<span style="font-size:1rem;">📦</span>';
                    return '<div class="edit-pedido-item-row" style="display:flex;align-items:center;gap:6px;padding:6px 8px;background:#f8fafc;border-radius:8px;">'
                        + fotoPreview
                        + '<input class="edit-item-nombre" value="' + escapeHtml(it.nombre) + '" placeholder="Nombre" style="flex:2;min-width:0;padding:6px 8px;border:1px solid #e2e8f0;border-radius:6px;font-size:0.8rem;">'
                        + '<input class="edit-item-cant" type="number" min="1" value="' + (it.cantidad || 1) + '" style="width:50px;padding:6px 8px;border:1px solid #e2e8f0;border-radius:6px;font-size:0.8rem;text-align:center;">'
                        + '<input class="edit-item-precio" type="number" step="0.01" value="' + (it.precio || 0) + '" placeholder="$" style="width:70px;padding:6px 8px;border:1px solid #e2e8f0;border-radius:6px;font-size:0.8rem;">'
                        + '<button onclick="this.parentElement.remove()" style="background:none;border:none;color:#ef4444;cursor:pointer;font-size:1rem;padding:4px;">✕</button>'
                        + '</div>';
                }).join('')
                + '</div>'
                + '<button onclick="Pedidos._agregarItemEdicion()" style="margin-top:6px;padding:6px 14px;background:#f1f5f9;border:1px dashed #cbd5e1;border-radius:8px;cursor:pointer;font-size:0.8rem;color:#64748b;">➕ Agregar producto</button>'
                + '</div>'
                + '<div><label style="display:block;font-size:0.75rem;font-weight:600;color:#64748b;margin-bottom:3px;">Notas internas</label>'
                + '<textarea id="edit-pedido-notas" style="width:100%;padding:8px 10px;border:1px solid #e2e8f0;border-radius:8px;font-size:0.85rem;resize:vertical;min-height:50px;" placeholder="Notas del pedido...">' + escapeHtml(p.notas || '') + '</textarea></div>'
                + '</div>'
                + '<div style="display:flex;gap:10px;justify-content:flex-end;margin-top:10px;">'
                + '<button onclick="Pedidos._cancelarEdicion()" style="padding:8px 20px;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:8px;cursor:pointer;font-weight:600;">Cancelar</button>'
                + '<button onclick="Pedidos._guardarEdicion()" style="padding:8px 20px;background:#6366f1;color:white;border:none;border-radius:8px;cursor:pointer;font-weight:600;">💾 Guardar cambios</button>'
                + '</div>';
            body.innerHTML = html;
            modal.style.display = 'flex';
        },

        _agregarItemEdicion: function() {
            var container = document.getElementById('edit-pedido-items');
            var row = document.createElement('div');
            row.className = 'edit-pedido-item-row';
            row.style.cssText = 'display:flex;align-items:center;gap:6px;padding:6px 8px;background:#f8fafc;border-radius:8px;';
            row.innerHTML = '<span style="font-size:1rem;">📦</span>'
                + '<input class="edit-item-nombre" placeholder="Nombre" style="flex:2;min-width:0;padding:6px 8px;border:1px solid #e2e8f0;border-radius:6px;font-size:0.8rem;">'
                + '<input class="edit-item-cant" type="number" min="1" value="1" style="width:50px;padding:6px 8px;border:1px solid #e2e8f0;border-radius:6px;font-size:0.8rem;text-align:center;">'
                + '<input class="edit-item-precio" type="number" step="0.01" value="0" style="width:70px;padding:6px 8px;border:1px solid #e2e8f0;border-radius:6px;font-size:0.8rem;">'
                + '<button onclick="this.parentElement.remove()" style="background:none;border:none;color:#ef4444;cursor:pointer;font-size:1rem;padding:4px;">✕</button>';
            container.appendChild(row);
        },

        _guardarEdicion: function() {
            var idx = Pedidos._editIndex;
            if (idx === undefined || idx === null) return;
            const pedidos = JSON.parse(localStorage.getItem('pedidosPendientes')) || [];
            var p = pedidos[idx];
            if (!p) return;

            p.userNombre = document.getElementById('edit-pedido-nombre').value.trim();
            p.userTel = document.getElementById('edit-pedido-tel').value.trim();
            p.userEmail = document.getElementById('edit-pedido-email').value.trim();
            p.totalUSD = parseFloat(document.getElementById('edit-pedido-usd').value) || 0;
            p.totalBS = parseFloat(document.getElementById('edit-pedido-bs').value) || 0;
            p.estado = document.getElementById('edit-pedido-estado').value;
            p.notas = document.getElementById('edit-pedido-notas').value.trim();

            var itemRows = document.querySelectorAll('#edit-pedido-items .edit-pedido-item-row');
            var nuevosItems = [];
            itemRows.forEach(function(row) {
                var nombre = row.querySelector('.edit-item-nombre').value.trim();
                var cant = parseInt(row.querySelector('.edit-item-cant').value) || 1;
                var precio = parseFloat(row.querySelector('.edit-item-precio').value) || 0;
                if (nombre) {
                    nuevosItems.push({ nombre: nombre, cantidad: cant, precio: precio, foto: (p.items && p.items[nuevosItems.length] ? p.items[nuevosItems.length].foto : null) });
                }
            });
            p.items = nuevosItems;

            // Recalcular totales desde items si el usuario no los editó manualmente
            // pero respetamos lo que puso en los inputs de total

            pedidos[idx] = p;
            localStorage.setItem('pedidosPendientes', JSON.stringify(pedidos));
            Pedidos._editIndex = null;
            document.getElementById('pedido-editar-modal').style.display = 'none';
            Pedidos.render();
            registrarActividad('Pedido editado', p.userNombre || 'Anónimo');
            mostrarToastNotificacion('✅ Pedido actualizado');
        },

        _cancelarEdicion: function() {
            Pedidos._editIndex = null;
            document.getElementById('pedido-editar-modal').style.display = 'none';
        },

        reabrir: async function(i) {
            if (!(await mostrarConfirmacion('¿Reabrir este pedido como pendiente?'))) return;
            const pedidos = JSON.parse(localStorage.getItem('pedidosPendientes')) || [];
            if (!pedidos[i]) return;
            var p = pedidos[i];
            // If was 'entregado', restore stock
            if (p.estado === 'entregado') {
                (p.items || []).forEach(function(it) {
                    var prodInv = inventario.find(function(pr) { return pr.nombre === it.nombre; });
                    if (prodInv) {
                        var antes = parseInt(prodInv.cantidad) || 0;
                        prodInv.cantidad = antes + (it.cantidad || 1);
                        registrarCambioStock(it.nombre, antes, prodInv.cantidad, 'Pedido reabierto');
                    }
                });
                localStorage.setItem('inventario', JSON.stringify(inventario));
            }
            pedidos[i].estado = 'pendiente';
            localStorage.setItem('pedidosPendientes', JSON.stringify(pedidos));
            actualizarSistema();
            Pedidos.render();
            registrarActividad('Pedido reabierto', p.userNombre || 'Anónimo');
            mostrarToastNotificacion('🔄 Pedido reabierto');
        },

        contactar: function(i) {
            const pedidos = JSON.parse(localStorage.getItem('pedidosPendientes')) || [];
            var p = pedidos[i];
            if (!p || !p.userTel || p.userTel === '—') return;
            var tel = p.userTel.replace(/[^0-9]/g, '');
            if (!tel) return;
            var baseUrl = window.LETTERING_BASE || '';
            var orderLink = (window.location.origin + baseUrl) + '/ver-pedido.html?id=' + encodeURIComponent(p.id || ('PED-' + Date.now()));
            var totalItems = (p.items || []).length;
            var msg = '🛍️ *Pedido ' + (p.id || '—') + '*\n\n'
                + '📋 ' + totalItems + ' producto' + (totalItems !== 1 ? 's' : '') + '\n'
                + '💵 Total: $' + (p.totalUSD || 0).toFixed(2) + '\n\n'
                + '🔗 *Ver detalle completo:*\n' + orderLink;
            window.open('https://wa.me/' + encodeURIComponent(tel.replace(/[^0-9]/g, '')) + '?text=' + encodeURIComponent(msg), '_blank');
        }
    };

    Pedidos._init();

    // Update the mostrarSeccion override to use new Pedidos.render
    // (handled below)

    // ========== CONFIGURACIÓN ==========
    function cargarConfiguracion() {
        const modo = localStorage.getItem('modoTasa') === 'auto' ? 'auto' : 'manual';
        document.querySelectorAll('input[name="modo-tasa"]').forEach(r => r.checked = r.value === modo);
        const modoAutoLabel = document.getElementById('modo-auto-label');
        const modoManualLabel = document.getElementById('modo-manual-label');
        if (modoAutoLabel) modoAutoLabel.style.borderColor = modo === 'auto' ? 'var(--primary, #4f46e5)' : 'var(--border)';
        if (modoManualLabel) modoManualLabel.style.borderColor = modo === 'manual' ? 'var(--primary, #4f46e5)' : 'var(--border)';

        const autoSection = document.getElementById('tasa-auto-section');
        const manualSection = document.getElementById('tasa-manual-section');
        if (autoSection) autoSection.style.display = modo === 'auto' ? 'block' : 'none';
        if (manualSection) manualSection.style.display = modo === 'manual' ? 'block' : 'none';

        if (modo === 'auto') {
            const fuente = localStorage.getItem('fuenteTasa') === 'paralelo' ? 'paralelo' : 'oficial';
            document.querySelectorAll('input[name="fuente-tasa"]').forEach(r => r.checked = r.value === fuente);
            const autoRate = localStorage.getItem('tasaAuto');
            const rateEl = document.getElementById('cfg-auto-rate');
            if (rateEl) {
                const tasaVal = parseFloat(autoRate);
                rateEl.textContent = !isNaN(tasaVal) && tasaVal > 0 ? 'Bs. ' + tasaVal.toFixed(2) : 'Bs. — (Usa "Actualizar ahora")';
            }
            const updateEl = document.getElementById('cfg-auto-update');
            if (updateEl) {
                const lastUpd = localStorage.getItem('ultimaActualizacionTasa') || '';
                updateEl.textContent = lastUpd ? new Date(lastUpd).toLocaleString('es-VE') : '—';
            }
        } else {
            const tasa = localStorage.getItem('tasaCambio') || '0';
            const tasaInput = document.getElementById('cfg-tasa');
            if (tasaInput) {
                tasaInput.value = tasa;
                actualizarPreviewTasa();
            }
        }

        const contacto = JSON.parse(localStorage.getItem('contactoInfo') || '{}');
        const wa = document.getElementById('cfg-whatsapp');
        const ig = document.getElementById('cfg-instagram');
        const fb = document.getElementById('cfg-facebook');
        if (wa) wa.value = contacto.whatsapp || '584121234567';
        if (ig) ig.value = contacto.instagram || 'https://instagram.com/letteringvzla';
        if (fb) fb.value = contacto.facebook || 'https://facebook.com/letteringvzla';
    }

    function actualizarPreviewTasa() {
        const tasa = parseFloat(document.getElementById('cfg-tasa')?.value || 0);
        const prev = document.getElementById('cfg-preview');
        if (prev) prev.textContent = `$10.00 → Bs. ${(10 * tasa).toFixed(2)}`;
    }

    document.getElementById('cfg-tasa')?.addEventListener('input', actualizarPreviewTasa);

    document.getElementById('form-tasa')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const tasa = parseFloat(document.getElementById('cfg-tasa').value);
        if (isNaN(tasa) || tasa <= 0) {
            mostrarToastNotificacion('Tasa inválida', 'error');
            return;
        }
        localStorage.setItem('tasaCambio', String(tasa));
        try { document.dispatchEvent(new CustomEvent('tasaCambiada', { detail: { tasa: tasa } })); } catch (x) {}
        mostrarToastNotificacion('Tasa de cambio actualizada. Ya se refleja en la tienda online.');
    });

    window.cambiarModoTasa = function(modo) {
        localStorage.setItem('modoTasa', modo);
        cargarConfiguracion();
        try { document.dispatchEvent(new CustomEvent('tasaCambiada', { detail: { tasa: getTasaActual() } })); } catch (x) {}
        if (modo === 'auto') actualizarTasaAuto();
    };

    window.cambiarFuenteTasa = function(fuente) {
        localStorage.setItem('fuenteTasa', fuente);
        if (localStorage.getItem('modoTasa') === 'auto') {
            actualizarTasaAuto();
        }
    };

    window.actualizarTasaAuto = function() {
        const btn = document.getElementById('btn-actualizar-auto');
        const originalText = btn ? btn.innerHTML : '';
        if (btn) { btn.disabled = true; btn.innerHTML = '⏳ Actualizando...'; }

        const API_URL = 'https://ve.dolarapi.com/v1/dolares';
        fetch(API_URL)
            .then(function(r) { return r.json(); })
            .then(function(data) {
                const fuente = localStorage.getItem('fuenteTasa') === 'paralelo' ? 'paralelo' : 'oficial';
                let entry = data.find(function(d) { return d.fuente === fuente; });
                if (!entry || !entry.promedio || entry.promedio <= 0) {
                    entry = data.find(function(d) { return d.fuente === 'oficial'; });
                }
                if (entry && entry.promedio && entry.promedio > 0) {
                    localStorage.setItem('tasaAuto', String(entry.promedio));
                    localStorage.setItem('ultimaActualizacionTasa', entry.fechaActualizacion || new Date().toISOString());
                    try { document.dispatchEvent(new CustomEvent('tasaCambiada', { detail: { tasa: entry.promedio } })); } catch (x) {}
                    cargarConfiguracion();
                    mostrarToastNotificacion('Tasa actualizada: Bs. ' + entry.promedio.toFixed(2) + ' por $1 (' + (entry.fuente || fuente) + ')');
                } else {
                    mostrarToastNotificacion('No se pudo obtener la tasa de la API', 'error');
                }
            })
            .catch(function(err) {
                mostrarToastNotificacion('Error al conectar con la API: ' + err.message, 'error');
            })
            .finally(function() {
                if (btn) { btn.disabled = false; btn.innerHTML = originalText; }
            });
    };

    document.getElementById('form-contacto-info')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const info = {
            whatsapp: document.getElementById('cfg-whatsapp').value.trim(),
            instagram: document.getElementById('cfg-instagram').value.trim(),
            facebook: document.getElementById('cfg-facebook').value.trim()
        };
        localStorage.setItem('contactoInfo', JSON.stringify(info));
        mostrarToastNotificacion('Información de contacto guardada');
    });

    document.getElementById('form-cambiar-pass')?.addEventListener('submit', (e) => {
        e.preventDefault();
        var actual = document.getElementById('cfg-pass-actual').value;
        var nueva = document.getElementById('cfg-pass-nueva').value;
        var confirmar = document.getElementById('cfg-pass-confirmar').value;
        var error = document.getElementById('cfg-pass-error');
        var currentUser = localStorage.getItem('dash_user') || 'admin';
        var users = JSON.parse(localStorage.getItem('adminUsers') || '[]');
        var userObj = users.find(function(u) { return u.usuario === currentUser; });
        if (!userObj || btoa(actual) !== userObj.pass) {
            error.textContent = 'La contraseña actual no es correcta';
            error.style.display = 'block';
            return;
        }
        if (nueva.length < 4) {
            error.textContent = 'La nueva contraseña debe tener al menos 4 caracteres';
            error.style.display = 'block';
            return;
        }
        if (nueva !== confirmar) {
            error.textContent = 'Las contraseñas no coinciden';
            error.style.display = 'block';
            return;
        }
        error.style.display = 'none';
        userObj.pass = btoa(nueva);
        localStorage.setItem('adminUsers', JSON.stringify(users));
        registrarActividad('Contraseña cambiada', 'Usuario: ' + currentUser);
        mostrarToastNotificacion('✅ Contraseña cambiada exitosamente');
        document.getElementById('form-cambiar-pass').reset();
    });

    // Actualizar tasa en formulario cuando cambie
    document.addEventListener('tasaCambiada', function() {
        actualizarTasaFormulario();
    });

    // Admin users form
    document.getElementById('form-add-admin')?.addEventListener('submit', function(e) {
        e.preventDefault();
        var user = document.getElementById('cfg-admin-user').value.trim();
        var pass = document.getElementById('cfg-admin-pass').value;
        var rol = document.getElementById('cfg-admin-rol').value;
        var err = document.getElementById('cfg-admin-error');
        if (user.length < 3) { err.textContent = 'Usuario debe tener al menos 3 caracteres'; err.style.display = 'block'; return; }
        if (pass.length < 4) { err.textContent = 'Contraseña debe tener al menos 4 caracteres'; err.style.display = 'block'; return; }
        var users = JSON.parse(localStorage.getItem('adminUsers') || '[]');
        if (users.some(function(u) { return u.usuario === user; })) {
            err.textContent = 'El usuario ya existe'; err.style.display = 'block'; return;
        }
        err.style.display = 'none';
        users.push({ usuario: user, pass: '__PLAINTEXT__' + pass, rol: rol, creado: new Date().toISOString() });
        localStorage.setItem('adminUsers', JSON.stringify(users));
        renderizarAdminUsers();
        document.getElementById('form-add-admin').reset();
        registrarActividad('Usuario creado', 'Usuario: ' + user + ', Rol: ' + rol);
        mostrarToastNotificacion('Usuario "' + user + '" agregado');
    });

    // Cargar config al entrar a la sección
    const originalMostrarSeccion = mostrarSeccion;
    mostrarSeccion = function(id, sub) {
        originalMostrarSeccion(id, sub);
        if (id === 'sec-config') { cargarConfiguracion(); renderizarAdminUsers(); renderizarActivityLog(); }
        if (id === 'sec-pedidos') window.Pedidos.render();
        if (id === 'sec-ventas') {
            renderizarVentas();
        }
    };

    // ========== MIGRACION A SUPABASE ==========
    window.migrarDatosALaNube = async function() {
        var btn = document.getElementById('btn-migrar');
        var status = document.getElementById('migracion-status');
        if (!btn || !status) return;
        if (!window.DB || !window.DashboardSupabase) {
            status.textContent = '❌ Supabase no está configurado. Verifica la anon key.';
            status.style.color = '#ef4444';
            return;
        }

        btn.disabled = true;
        btn.innerHTML = '⏳ Migrando categorías...';
        status.textContent = '';

        try {
            status.textContent = '⏳ Sincronizando categorías...';
            await window.DashboardSupabase.syncCategories();
            status.textContent = '⏳ Sincronizando marcas...';
            await window.DashboardSupabase.syncBrands();
            status.textContent = '⏳ Sincronizando productos (con imágenes)...';
            await window.DashboardSupabase.syncProducts();
            status.textContent = '⏳ Sincronizando pedidos...';
            await window.DashboardSupabase.syncOrders();
            status.textContent = '⏳ Sincronizando clientes y ventas...';
            await window.DashboardSupabase.syncClients();
            status.textContent = '⏳ Sincronizando historial de ventas...';
            await window.DashboardSupabase.syncSalesHistory();

            var inv = JSON.parse(localStorage.getItem('inventario') || '[]');
            var cats = JSON.parse(localStorage.getItem('categoriasObj') || '[]');
            var brs = JSON.parse(localStorage.getItem('marcasObj') || '[]');
            var pedidos = JSON.parse(localStorage.getItem('pedidosPendientes') || '[]');
            var clientes = JSON.parse(localStorage.getItem('clientes') || '[]');

            status.innerHTML = '✅ Migración completada: '
                + cats.length + ' categorías, '
                + brs.length + ' marcas, '
                + inv.length + ' productos, '
                + pedidos.length + ' pedidos, '
                + clientes.length + ' clientes/ventas.'
                + '<br><small style="color:#64748b;">Los datos ahora se sincronizan automáticamente con Supabase.</small>';
            status.style.color = '#22c55e';
            mostrarToastNotificacion('✅ Migración completada a Supabase');
        } catch (e) {
            status.innerHTML = '❌ Error: ' + e.message;
            status.style.color = '#ef4444';
            mostrarToastNotificacion('Error en migración: ' + e.message, 'error');
            console.error('Migration error:', e);
        }

        btn.disabled = false;
        btn.innerHTML = '☁️ Migrar datos a Supabase';
    };

    window.migrarImagenesANube = async function() {
        if (!window.Upload || !window.Upload.migrateBase64ToStorage) {
            mostrarToastNotificacion('❌ Upload module not available', 'error');
            return;
        }
        var total = 0;
        for (var i = 0; i < inventario.length; i++) {
            var fotos = inventario[i].fotos || [];
            for (var j = 0; j < fotos.length; j++) {
                if (fotos[j].startsWith('data:')) {
                    try {
                        var url = await window.Upload.migrateBase64ToStorage(fotos[j], 'productos');
                        fotos[j] = url;
                        total++;
                    } catch(e) { console.warn('Error migrando foto', e); }
                }
            }
        }
        for (var ci = 0; ci < clientes.length; ci++) {
            var recibos = clientes[ci].recibo || [];
            for (var rj = 0; rj < recibos.length; rj++) {
                if (recibos[rj].startsWith('data:')) {
                    try {
                        var url = await window.Upload.migrateBase64ToStorage(recibos[rj], 'recibos');
                        recibos[rj] = url;
                        total++;
                    } catch(e) { console.warn('Error migrando recibo', e); }
                }
            }
        }
        actualizarSistema();
        mostrarToastNotificacion('🖼️ ' + total + ' imágenes migradas a Supabase');
    };

    window.renderizarStockLog = function() {
        var log = JSON.parse(localStorage.getItem('stockLog') || '[]');
        var container = document.getElementById('stock-log-container');
        if (!container) return;
        if (log.length === 0) {
            container.innerHTML = '<div style="color:#94a3b8;padding:12px;">Sin cambios registrados aún.</div>';
            return;
        }
        container.innerHTML = log.slice().reverse().slice(0, 50).map(function(entry) {
            var d = new Date(entry.fecha);
            var fechaStr = d.toLocaleDateString('es-ES') + ' ' + d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
            return '<div style="padding:6px 0;border-bottom:1px solid #f1f5f9;">'
                + '<strong>' + entry.producto + '</strong>: '
                + entry.desde + ' → ' + entry.hasta
                + ' <span style="color:#64748b;">(' + entry.motivo + ')</span>'
                + '<br><span style="font-size:0.7rem;color:#94a3b8;">' + fechaStr + '</span></div>';
        }).join('');
    };

    // Auto-actualizar tasa cada 24h
    (function() {
        if (localStorage.getItem('modoTasa') === 'auto') {
            var ultima = localStorage.getItem('ultimaActualizacionTasa');
            var necesita = true;
            if (ultima) {
                try {
                    var diffHoras = (Date.now() - new Date(ultima).getTime()) / 3600000;
                    if (diffHoras < 24) necesita = false;
                } catch(e) {}
            }
            if (necesita && typeof window.actualizarTasaAuto === 'function') {
                setTimeout(window.actualizarTasaAuto, 1000);
            }
        }
    })();

    // Close fecha selector modal on backdrop click
    document.getElementById('fecha-selector-modal')?.addEventListener('click', function(e) {
        if (e.target === this) Ventas.cerrarSelectorFechas();
    });
});