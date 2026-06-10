$(document).ready(function () {
    let table = null;
    let allRows = []; // Almacén global de filas procesadas para los filtros dinámicos
    let currentView = 'detalle'; // Vista activa por defecto: 'detalle', 'tienda', 'division', 'categoria', 'grupo'

    // Retorna la cabecera HTML correspondiente para cada vista (con clases para centrar)
    function getHeadersForView(view) {
        if (view === 'detalle') {
            return `
                <thead>
                    <tr class="table-dark">
                        <th>Compañía</th>
                        <th>Tienda</th>
                        <th>División</th>
                        <th>Categoría</th>
                        <th>Grupo</th>
                        <th class="text-center">Sugerido</th>
                        <th class="text-center">Saldo Tienda</th>
                        <th class="text-center">Necesidad</th>
                        <th class="text-center">Exceso</th>
                    </tr>
                </thead>
                <tbody></tbody>
            `;
        } else if (view === 'tienda') {
            return `
                <thead>
                    <tr class="table-dark">
                        <th>Compañía</th>
                        <th>Tienda</th>
                        <th class="text-center">Sugerido</th>
                        <th class="text-center">Saldo Tienda</th>
                        <th class="text-center">Necesidad</th>
                        <th class="text-center">Exceso</th>
                    </tr>
                </thead>
                <tbody></tbody>
            `;
        } else if (view === 'division') {
            return `
                <thead>
                    <tr class="table-dark">
                        <th>División</th>
                        <th class="text-center">Sugerido</th>
                        <th class="text-center">Saldo Tienda</th>
                        <th class="text-center">Necesidad</th>
                        <th class="text-center">Exceso</th>
                    </tr>
                </thead>
                <tbody></tbody>
            `;
        } else if (view === 'categoria') {
            return `
                <thead>
                    <tr class="table-dark">
                        <th>Categoría</th>
                        <th class="text-center">Sugerido</th>
                        <th class="text-center">Saldo Tienda</th>
                        <th class="text-center">Necesidad</th>
                        <th class="text-center">Exceso</th>
                    </tr>
                </thead>
                <tbody></tbody>
            `;
        } else if (view === 'grupo') {
            return `
                <thead>
                    <tr class="table-dark">
                        <th>Grupo</th>
                        <th class="text-center">Sugerido</th>
                        <th class="text-center">Saldo Tienda</th>
                        <th class="text-center">Necesidad</th>
                        <th class="text-center">Exceso</th>
                    </tr>
                </thead>
                <tbody></tbody>
            `;
        }
    }

    // Inicializa o re-inicializa el DataTable de forma dinámica según la vista
    function initDataTable(view) {
        if (table) {
            table.destroy();
        }

        // Reemplazar la estructura de cabeceras en el DOM
        $('#tablaInventario').html(getHeadersForView(view));

        // Determinar en qué índice de columna se encuentra la "Necesidad" y "Exceso"
        let targetNeedIdx = (view === 'detalle') ? 7 : (view === 'tienda' ? 4 : 3);
        let targetExcessIdx = (view === 'detalle') ? 8 : (view === 'tienda' ? 5 : 4);
        // Índices para columnas numéricas que llevan formato con comas de miles
        let numericTargets = (view === 'detalle') ? [5, 6] : (view === 'tienda' ? [2, 3] : [1, 2]);

        table = $('#tablaInventario').DataTable({
            language: {
                url: '//cdn.datatables.net/plug-ins/1.13.6/i18n/es-ES.json'
            },
            pageLength: 25,
            responsive: true,
            order: [[targetNeedIdx, 'desc']], // Ordenar por Necesidad descendente por defecto
            deferRender: true,   // Solo dibuja en el DOM las filas visibles en pantalla
            processing: true,
            columnDefs: [
                {
                    targets: targetNeedIdx,
                    className: 'text-center', // Centrar los valores de Necesidad en la tabla
                    render: function (data, type, row) {
                        if (type === 'display' && data > 0) {
                            return `<span class="necesidad-alta">${Math.round(data).toLocaleString('en-US')}</span>`;
                        }
                        return (type === 'display' && typeof data === 'number') ? Math.round(data).toLocaleString('en-US') : data;
                    }
                },
                {
                    targets: targetExcessIdx,
                    className: 'text-center', // Centrar los valores de Exceso en la tabla
                    render: function (data, type, row) {
                        if (type === 'display' && data > 0) {
                            return `<span class="exceso-alto">${Math.round(data).toLocaleString('en-US')}</span>`;
                        }
                        return (type === 'display' && typeof data === 'number') ? Math.round(data).toLocaleString('en-US') : data;
                    }
                },
                {
                    targets: numericTargets,
                    className: 'text-center', // Centrar los valores de Sugerido y Saldo Tienda en la tabla
                    render: function (data, type, row) {
                        if (type === 'display' && typeof data === 'number') {
                            return Math.round(data).toLocaleString('en-US');
                        }
                        return data;
                    }
                }
            ]
        });

        // Vincular el evento draw para el buscador interno de DataTables (por si buscan algo en la cajita de texto)
        table.on('draw', function () {
            updateKPIsFromVisible();
        });
    }

    // Retorna las filas de allRows filtradas según los selects de la interfaz
    function getFilteredRows() {
        let selectedCompania = $('#filtroCompania').val();
        let selectedTienda = $('#filtroTienda').val();
        let selectedDivision = $('#filtroDivision').val();
        let selectedCategoria = $('#filtroCategoria').val();
        let selectedGrupo = $('#filtroGrupo').val();
        let selectedEstado = $('#filtroEstado').val();

        let filtered = [];
        let len = allRows.length;
        for (let i = 0; i < len; i++) {
            let row = allRows[i];
            // row: [compania, tienda, division, categoria, grupo, sugerido, saldoTienda, necesidad, exceso]
            if (selectedCompania && row[0] !== selectedCompania) continue;
            if (selectedTienda && row[1] !== selectedTienda) continue;
            if (selectedDivision && row[2] !== selectedDivision) continue;
            if (selectedCategoria && row[3] !== selectedCategoria) continue;
            if (selectedGrupo && row[4] !== selectedGrupo) continue;
            
            // Filtro por Estado de Alerta (necesidad, exceso, optimo)
            if (selectedEstado === 'necesidad' && row[7] <= 0) continue;
            if (selectedEstado === 'exceso' && row[8] <= 0) continue;
            if (selectedEstado === 'optimo' && (row[7] > 0 || row[8] > 0)) continue;

            filtered.push(row);
        }
        return filtered;
    }

    // Actualiza el tema de colores en base a la compañía seleccionada (AEC=Azul, LV=Morado)
    function updateThemeColor() {
        let selectedCompania = $('#filtroCompania').val();
        if (selectedCompania === 'LV') {
            document.documentElement.style.setProperty('--theme-primary', 'var(--vitrina-purple)');
        } else {
            // El Compadre o "Todas las compañías" se queda con el azul corporativo
            document.documentElement.style.setProperty('--theme-primary', 'var(--compadre-blue)');
        }
    }

    // Agrupaciones y Sumarizaciones
    function aggregateByTienda(filteredRows) {
        let map = new Map();
        let len = filteredRows.length;
        for (let i = 0; i < len; i++) {
            let row = filteredRows[i];
            let key = row[0] + '|||' + row[1]; // compania + tienda
            if (!map.has(key)) {
                map.set(key, { sugerido: 0, saldoTienda: 0, necesidad: 0, exceso: 0 });
            }
            let agg = map.get(key);
            agg.sugerido += row[5];
            agg.saldoTienda += row[6];
            agg.necesidad += row[7];
            agg.exceso += row[8];
        }
        let result = [];
        map.forEach(function (value, key) {
            let parts = key.split('|||');
            result.push([parts[0], parts[1], value.sugerido, value.saldoTienda, value.necesidad, value.exceso]);
        });
        return result;
    }

    function aggregateByDivision(filteredRows) {
        let map = new Map();
        let len = filteredRows.length;
        for (let i = 0; i < len; i++) {
            let row = filteredRows[i];
            let key = row[2]; // division
            if (!map.has(key)) {
                map.set(key, { sugerido: 0, saldoTienda: 0, necesidad: 0, exceso: 0 });
            }
            let agg = map.get(key);
            agg.sugerido += row[5];
            agg.saldoTienda += row[6];
            agg.necesidad += row[7];
            agg.exceso += row[8];
        }
        let result = [];
        map.forEach(function (value, key) {
            result.push([key, value.sugerido, value.saldoTienda, value.necesidad, value.exceso]);
        });
        return result;
    }

    function aggregateByCategoria(filteredRows) {
        let map = new Map();
        let len = filteredRows.length;
        for (let i = 0; i < len; i++) {
            let row = filteredRows[i];
            let key = row[3]; // categoria
            if (!map.has(key)) {
                map.set(key, { sugerido: 0, saldoTienda: 0, necesidad: 0, exceso: 0 });
            }
            let agg = map.get(key);
            agg.sugerido += row[5];
            agg.saldoTienda += row[6];
            agg.necesidad += row[7];
            agg.exceso += row[8];
        }
        let result = [];
        map.forEach(function (value, key) {
            result.push([key, value.sugerido, value.saldoTienda, value.necesidad, value.exceso]);
        });
        return result;
    }

    function aggregateByGrupo(filteredRows) {
        let map = new Map();
        let len = filteredRows.length;
        for (let i = 0; i < len; i++) {
            let row = filteredRows[i];
            let key = row[4]; // grupo
            if (!map.has(key)) {
                map.set(key, { sugerido: 0, saldoTienda: 0, necesidad: 0, exceso: 0 });
            }
            let agg = map.get(key);
            agg.sugerido += row[5];
            agg.saldoTienda += row[6];
            agg.necesidad += row[7];
            agg.exceso += row[8];
        }
        let result = [];
        map.forEach(function (value, key) {
            result.push([key, value.sugerido, value.saldoTienda, value.necesidad, value.exceso]);
        });
        return result;
    }

    // Actualiza las tarjetas en base al array recibido (con comas como separador de miles)
    function updateKPIs(filteredRows) {
        let totalSugerido = 0;
        let totalSaldoTienda = 0;
        let totalNecesidad = 0;
        let totalExceso = 0;
        let len = filteredRows.length;

        for (let i = 0; i < len; i++) {
            let row = filteredRows[i];
            totalSugerido += row[5] || 0;
            totalSaldoTienda += row[6] || 0;
            totalNecesidad += row[7] || 0;
            totalExceso += row[8] || 0;
        }

        let format = val => Math.round(val).toLocaleString('en-US');
        $('#kpiTotalSugerido').text(format(totalSugerido));
        $('#kpiTotalSaldoTienda').text(format(totalSaldoTienda));
        $('#kpiTotalNecesidad').text(format(totalNecesidad));
        $('#kpiTotalExceso').text(format(totalExceso));

        // Actualizar barra de salud del inventario en base a las referencias de detalle
        updateInventoryHealth(filteredRows);
    }

    // Recalcula los KPIs en base a lo visible en el DataTable (con comas como separador de miles)
    function updateKPIsFromVisible() {
        if (!table) return;
        let totalSugerido = 0;
        let totalSaldoTienda = 0;
        let totalNecesidad = 0;
        let totalExceso = 0;

        let filteredData = table.rows({ filter: 'applied' }).data();
        let len = filteredData.length;

        // Determinar las posiciones de las columnas numéricas en la vista actual
        let sugCol = (currentView === 'detalle') ? 5 : (currentView === 'tienda' ? 2 : 1);
        let salCol = (currentView === 'detalle') ? 6 : (currentView === 'tienda' ? 3 : 2);
        let necCol = (currentView === 'detalle') ? 7 : (currentView === 'tienda' ? 4 : 3);
        let excCol = (currentView === 'detalle') ? 8 : (currentView === 'tienda' ? 5 : 4);

        for (let i = 0; i < len; i++) {
            let row = filteredData[i];
            totalSugerido += row[sugCol] || 0;
            totalSaldoTienda += row[salCol] || 0;
            totalNecesidad += row[necCol] || 0;
            totalExceso += row[excCol] || 0;
        }

        let format = val => Math.round(val).toLocaleString('en-US');
        $('#kpiTotalSugerido').text(format(totalSugerido));
        $('#kpiTotalSaldoTienda').text(format(totalSaldoTienda));
        $('#kpiTotalNecesidad').text(format(totalNecesidad));
        $('#kpiTotalExceso').text(format(totalExceso));

        // Actualizar la barra de salud con la vista visible actual
        updateInventoryHealthFromVisible(filteredData);
    }

    // Actualiza la barra de salud del inventario con las filas de detalle originales (precisión SKU)
    function updateInventoryHealth(detailRows) {
        let len = detailRows.length;
        if (len === 0) {
            $('#healthBarSummary').text('Sin datos');
            $('#pbNecesidad').css('width', '0%').attr('aria-valuenow', 0).text('');
            $('#pbOptimo').css('width', '0%').attr('aria-valuenow', 0).text('');
            $('#pbExceso').css('width', '0%').attr('aria-valuenow', 0).text('');
            return;
        }

        let countNecesidad = 0;
        let countExceso = 0;
        let countOptimo = 0;

        for (let i = 0; i < len; i++) {
            let row = detailRows[i];
            // En detalle: row[7] es necesidad, row[8] es exceso
            let necesidad = row[7] || 0;
            let exceso = row[8] || 0;

            if (necesidad > 0) {
                countNecesidad++;
            } else if (exceso > 0) {
                countExceso++;
            } else {
                countOptimo++;
            }
        }

        renderHealthBar(len, countNecesidad, countOptimo, countExceso);
    }

    // Actualiza la barra de salud basándose en la vista agregada actual visible en la tabla
    function updateInventoryHealthFromVisible(filteredData) {
        let len = filteredData.length;
        if (len === 0) {
            $('#healthBarSummary').text('Sin datos');
            $('#pbNecesidad').css('width', '0%').attr('aria-valuenow', 0).text('');
            $('#pbOptimo').css('width', '0%').attr('aria-valuenow', 0).text('');
            $('#pbExceso').css('width', '0%').attr('aria-valuenow', 0).text('');
            return;
        }

        let countNecesidad = 0;
        let countExceso = 0;
        let countOptimo = 0;

        let necCol = (currentView === 'detalle') ? 7 : (currentView === 'tienda' ? 4 : 3);
        let excCol = (currentView === 'detalle') ? 8 : (currentView === 'tienda' ? 5 : 4);

        for (let i = 0; i < len; i++) {
            let row = filteredData[i];
            let necesidad = row[necCol] || 0;
            let exceso = row[excCol] || 0;

            if (necesidad > 0) {
                countNecesidad++;
            } else if (exceso > 0) {
                countExceso++;
            } else {
                countOptimo++;
            }
        }

        let labelSuffix = (currentView === 'detalle') ? ' Referencias' : (currentView === 'tienda' ? ' Tiendas' : ' Grupos/Divisiones');
        renderHealthBar(len, countNecesidad, countOptimo, countExceso, labelSuffix);
    }

    function renderHealthBar(total, countNecesidad, countOptimo, countExceso, suffix = ' Referencias') {
        let pctNecesidad = (countNecesidad / total) * 100;
        let pctExceso = (countExceso / total) * 100;
        let pctOptimo = (countOptimo / total) * 100;

        let formatPct = val => Math.round(val);
        $('#healthBarSummary').text(`${total.toLocaleString('en-US')} ${suffix} Analizadas`);

        let isMobile = window.innerWidth < 576;

        if (pctNecesidad > 0) {
            let label = isMobile ? `${formatPct(pctNecesidad)}% ⚠️` : `${formatPct(pctNecesidad)}% Necesidad (${countNecesidad.toLocaleString('en-US')})`;
            $('#pbNecesidad')
                .css('width', pctNecesidad + '%')
                .attr('aria-valuenow', pctNecesidad)
                .text(label);
        } else {
            $('#pbNecesidad').css('width', '0%').text('');
        }

        if (pctOptimo > 0) {
            let label = isMobile ? `${formatPct(pctOptimo)}% ✅` : `${formatPct(pctOptimo)}% Óptimo (${countOptimo.toLocaleString('en-US')})`;
            $('#pbOptimo')
                .css('width', pctOptimo + '%')
                .attr('aria-valuenow', pctOptimo)
                .text(label);
        } else {
            $('#pbOptimo').css('width', '0%').text('');
        }

        if (pctExceso > 0) {
            let label = isMobile ? `${formatPct(pctExceso)}% 📈` : `${formatPct(pctExceso)}% Exceso (${countExceso.toLocaleString('en-US')})`;
            $('#pbExceso')
                .css('width', pctExceso + '%')
                .attr('aria-valuenow', pctExceso)
                .text(label);
        } else {
            $('#pbExceso').css('width', '0%').text('');
        }
    }

    // Filtros dinámicos cruzados (cascada bidireccional inteligente)
    function updateFilterDropdowns() {
        let selectedCompania = $('#filtroCompania').val();
        let selectedTienda = $('#filtroTienda').val();
        let selectedDivision = $('#filtroDivision').val();
        let selectedCategoria = $('#filtroCategoria').val();
        let selectedGrupo = $('#filtroGrupo').val();

        let companias = new Set();
        let tiendas = new Set();
        let divisiones = new Set();
        let categorias = new Set();
        let grupos = new Set();

        let len = allRows.length;
        for (let i = 0; i < len; i++) {
            let row = allRows[i];
            let rowCompania = row[0];
            let rowTienda = row[1];
            let rowDivision = row[2];
            let rowCategoria = row[3];
            let rowGrupo = row[4];

            if ((!selectedTienda || rowTienda === selectedTienda) &&
                (!selectedDivision || rowDivision === selectedDivision) &&
                (!selectedCategoria || rowCategoria === selectedCategoria) &&
                (!selectedGrupo || rowGrupo === selectedGrupo)) {
                companias.add(rowCompania);
            }

            if ((!selectedCompania || rowCompania === selectedCompania) &&
                (!selectedDivision || rowDivision === selectedDivision) &&
                (!selectedCategoria || rowCategoria === selectedCategoria) &&
                (!selectedGrupo || rowGrupo === selectedGrupo)) {
                tiendas.add(rowTienda);
            }

            if ((!selectedCompania || rowCompania === selectedCompania) &&
                (!selectedTienda || rowTienda === selectedTienda) &&
                (!selectedCategoria || rowCategoria === selectedCategoria) &&
                (!selectedGrupo || rowGrupo === selectedGrupo)) {
                divisiones.add(rowDivision);
            }

            if ((!selectedCompania || rowCompania === selectedCompania) &&
                (!selectedTienda || rowTienda === selectedTienda) &&
                (!selectedDivision || rowDivision === selectedDivision) &&
                (!selectedGrupo || rowGrupo === selectedGrupo)) {
                categorias.add(rowCategoria);
            }

            if ((!selectedCompania || rowCompania === selectedCompania) &&
                (!selectedTienda || rowTienda === selectedTienda) &&
                (!selectedDivision || rowDivision === selectedDivision) &&
                (!selectedCategoria || rowCategoria === selectedCategoria)) {
                grupos.add(rowGrupo);
            }
        }

        let fillSelect = (selectId, setValues, defaultText, selectedValue) => {
            let select = $(`#${selectId}`);
            let optionsHtml = `<option value="">${defaultText}</option>`;
            let sortedValues = Array.from(setValues).sort();
            let vLen = sortedValues.length;
            
            for (let j = 0; j < vLen; j++) {
                let val = sortedValues[j];
                if (val !== 'N/A' && val !== '') {
                    let selectedAttr = (val === selectedValue) ? ' selected' : '';
                    optionsHtml += `<option value="${val}"${selectedAttr}>${val}</option>`;
                }
            }
            select.html(optionsHtml);
        };

        fillSelect('filtroCompania', companias, 'Todas las compañías...', selectedCompania);
        fillSelect('filtroTienda', tiendas, 'Todas las tiendas...', selectedTienda);
        fillSelect('filtroDivision', divisiones, 'Todas las divisiones...', selectedDivision);
        fillSelect('filtroCategoria', categorias, 'Todas las categorías...', selectedCategoria);
        fillSelect('filtroGrupo', grupos, 'Todos los grupos...', selectedGrupo);
    }

    // Procesa, filtra y carga los datos según la vista y los filtros seleccionados
    function renderDashboard() {
        if (!table) return;

        let filteredRows = getFilteredRows();

        // 1. Recalcular KPIs base
        updateKPIs(filteredRows);

        // 2. Recalcular desplegables cruzados
        updateFilterDropdowns();

        // 3. Agrupar la información según la vista activa
        let displayData = [];
        if (currentView === 'detalle') {
            displayData = filteredRows;
        } else if (currentView === 'tienda') {
            displayData = aggregateByTienda(filteredRows);
        } else if (currentView === 'division') {
            displayData = aggregateByDivision(filteredRows);
        } else if (currentView === 'categoria') {
            displayData = aggregateByCategoria(filteredRows);
        } else if (currentView === 'grupo') {
            displayData = aggregateByGrupo(filteredRows);
        }

        // 4. Cargar y redibujar DataTable
        table.clear().rows.add(displayData).draw();
    }

    // Inicializar por defecto la vista 'detalle'
    initDataTable('detalle');

    function procesarDatosCSV(data) {
        console.log("Procesando datos del CSV. Filas encontradas:", data.length);
        allRows = [];

        let len = data.length;
        for (let i = 0; i < len; i++) {
            let row = data[i];
            if (!row || !row['Sucursal']) continue;

            // Quitar análisis de Bodegas (CDI)
            let sucursalId = row['Sucursal'];
            if (typeof sucursalId === 'string' && sucursalId.indexOf('CDI') !== -1) continue;

            let tienda = row['Nombre Tienda'] || sucursalId || 'N/A';
            
            // Renombrar Danilos (-DS) a La Vitrina (-LV) ya que Danilos no existe
            if (typeof tienda === 'string') {
                tienda = tienda.replace('-DS', '-LV');
            }

            // Clasificar Compañía: AEC para El Compadre y LV para La Vitrina
            let compania = 'AEC';
            if (typeof sucursalId === 'string' && sucursalId.indexOf('TD') === 0) {
                compania = 'LV';
            } else if (tienda.indexOf('-LV') !== -1) {
                compania = 'LV';
            }

            let division = row['Division'] || 'N/A';
            let categoria = row['Categoria'] || 'N/A';
            let grupo = row['Grupo'] || 'N/A';

            let sugerido = (row['Sugerido AEC'] || 0) + (row['Sugerido DS'] || 0);
            let saldoTienda = row['Saldo Tienda'] || 0;
            let necesidad = (row['Necesidad detalle AEC'] || 0) +
                (row['Necesidad mayoreo AEC'] || 0) +
                (row['Necesidad DS'] || 0);
            let exceso = saldoTienda > sugerido ? (saldoTienda - sugerido) : 0;

            allRows.push([
                compania,
                tienda,
                division,
                categoria,
                grupo,
                sugerido,
                saldoTienda,
                necesidad,
                exceso
            ]);
        }

        console.log("Inyectando filas en DataTable...");
        renderDashboard();
        console.log("¡Todo listo!");
    }

    function mostrarCargaManual() {
        $('#fallbackCargaManual').removeClass('d-none');
    }

    // === NUEVA FUNCIÓN PARA CARGAR Y DESCOMPRIMIR EL ZIP AUTOMÁTICAMENTE ===
    function cargarCSVAutomatico() {
        console.log("Descargando y descomprimiendo invetario.zip...");
        const rutaZip = './data/invetario.zip'; // Ruta de tu archivo en GitHub

        fetch(rutaZip)
            .then(function(response) {
                if (!response.ok) {
                    throw new Error("No se pudo descargar el ZIP (HTTP " + response.status + ")");
                }
                return response.blob();
            })
            .then(function(blob) {
                return JSZip.loadAsync(blob);
            })
            .then(function(zip) {
                // Buscamos dinámicamente el primer archivo que termine en .csv dentro del zip
                let nombreCSV = null;
                zip.forEach(function (relativePath, zipEntry) {
                    if (zipEntry.name.endsWith('.csv')) {
                        nombreCSV = zipEntry.name;
                    }
                });

                if (!nombreCSV) {
                    throw new Error("No se encontró ningún archivo .csv dentro del ZIP");
                }

                console.log("CSV encontrado dentro del ZIP:", nombreCSV);
                // Extraer el texto de ese CSV
                return zip.file(nombreCSV).async("string");
            })
            .then(function(textoCSV) {
                console.log("Archivo descomprimido con éxito. Parseando con PapaParse...");
                
                Papa.parse(textoCSV, {
                    header: true,
                    delimiter: ";", // Forzar delimitador por punto y coma (;)
                    bom: true,      // Omitir automáticamente el Byte Order Mark (BOM)
                    dynamicTyping: true,
                    skipEmptyLines: true,
                    transformHeader: function (header) {
                        return header.trim();
                    },
                    complete: function (results) {
                        console.log("Lectura finalizada.");
                        if (results.errors.length > 0) {
                            console.warn("Hubo errores al leer algunas líneas:", results.errors);
                        }
                        procesarDatosCSV(results.data);
                    },
                    error: function (err) {
                        console.error("Error crítico de PapaParse al procesar el texto extraído:", err);
                        mostrarCargaManual();
                    }
                });
            })
            .catch(function(error) {
                console.error("Error al descargar o descomprimir el ZIP:", error);
                mostrarCargaManual();
            });
    }
    // =======================================================================

    // Verificar si estamos ejecutando bajo el protocolo file://
    if (window.location.protocol === 'file:') {
        mostrarCargaManual();
    } else {
        cargarCSVAutomatico();
    }

    // Escuchar la carga manual de archivo
    $('#csvFileInput').on('change', function (e) {
        let file = e.target.files[0];
        if (!file) return;

        console.log("Archivo seleccionado manualmente:", file.name);
        $('#fallbackCargaManual').addClass('d-none');
        
        Papa.parse(file, {
            header: true,
            delimiter: ";",
            bom: true,
            dynamicTyping: true,
            skipEmptyLines: true,
            transformHeader: function (header) {
                return header.trim();
            },
            complete: function (results) {
                if (results.errors.length > 0) {
                    console.warn("Errores detectados en carga manual:", results.errors);
                }
                procesarDatosCSV(results.data);
            },
            error: function (err) {
                console.error("Error en carga manual de PapaParse:", err);
                alert("No se pudo cargar el archivo correctamente. Por favor intenta de nuevo.");
                mostrarCargaManual();
            }
        });
    });

    // Controladores de cambio en filtros
    $('#filtroCompania').on('change', function () {
        updateThemeColor();
        renderDashboard();
    });

    $('#filtroTienda').on('change', function () {
        renderDashboard();
    });

    $('#filtroDivision').on('change', function () {
        renderDashboard();
    });

    $('#filtroCategoria').on('change', function () {
        renderDashboard();
    });

    $('#filtroGrupo').on('change', function () {
        renderDashboard();
    });

    $('#filtroEstado').on('change', function () {
        renderDashboard();
    });

    // Botón para limpiar todos los filtros a la vez
    $('#btnBorrarFiltros').on('click', function () {
        $('#filtroCompania').val('');
        $('#filtroTienda').val('');
        $('#filtroDivision').val('');
        $('#filtroCategoria').val('');
        $('#filtroGrupo').val('');
        $('#filtroEstado').val('');
        
        updateThemeColor();
        renderDashboard();
    });

    // Función para exportar la tabla visible actual a CSV
    function exportToCSV() {
        if (!table) return;

        // Obtener cabeceras de la vista actual
        let headers = [];
        $('#tablaInventario thead th').each(function () {
            headers.push($(this).text().trim());
        });

        // Obtener datos filtrados visibles en la tabla
        let rowsData = table.rows({ filter: 'applied' }).data();
        let csvContent = "\uFEFF"; // BOM para Excel
        csvContent += headers.join(";") + "\n"; // Usamos punto y coma para coincidir con el estándar local

        let len = rowsData.length;
        for (let i = 0; i < len; i++) {
            let row = rowsData[i];
            let rowArray = [];
            let rLen = row.length;
            for (let j = 0; j < rLen; j++) {
                let cellVal = row[j];
                // Si es un número, redondearlo
                if (typeof cellVal === 'number') {
                    cellVal = Math.round(cellVal);
                } else if (cellVal === null || cellVal === undefined) {
                    cellVal = '';
                } else {
                    // Reemplazar saltos de línea y escapar comillas
                    cellVal = String(cellVal).replace(/"/g, '""');
                    if (cellVal.indexOf(";") !== -1 || cellVal.indexOf("\n") !== -1) {
                        cellVal = `"${cellVal}"`;
                    }
                }
                rowArray.push(cellVal);
            }
            csvContent += rowArray.join(";") + "\n";
        }

        // Crear enlace de descarga
        let blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        let filename = `Reporte_Inventario_${currentView}_${new Date().toISOString().slice(0, 10)}.csv`;
        
        if (navigator.msSaveBlob) { // IE 10+
            navigator.msSaveBlob(blob, filename);
        } else {
            let link = document.createElement("a");
            if (link.download !== undefined) {
                let url = URL.createObjectURL(blob);
                link.setAttribute("href", url);
                link.setAttribute("download", filename);
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        }
    }

    // Botón de exportación a CSV
    $('#btnExportarCSV').on('click', function () {
        exportToCSV();
    });

    // Controladores de clic en las pestañas analíticas
    $(document).on('click', '.nav-tabs .nav-link', function (e) {
        e.preventDefault();
        
        // Cambiar pestaña activa
        $('.nav-tabs .nav-link').removeClass('active');
        $(this).addClass('active');
        
        // Cambiar vista activa
        currentView = $(this).attr('data-view');
        
        // Re-inicializar DataTable con la nueva estructura de columnas y ordenamiento
        initDataTable(currentView);
        
        // Re-renderizar el dashboard con los datos agregados
        renderDashboard();
    });
});
