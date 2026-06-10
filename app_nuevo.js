$(document).ready(function () {
    let table = null;
    let allRows = []; 
    let currentView = 'detalle'; 

    function getHeadersForView(view) {
        if (view === 'detalle') {
            return `<thead><tr class="table-dark"><th>Compañía</th><th>Tienda</th><th>División</th><th>Categoría</th><th>Grupo</th><th class="text-center">Sugerido</th><th class="text-center">Saldo Tienda</th><th class="text-center">Necesidad</th><th class="text-center">Exceso</th></tr></thead><tbody></tbody>`;
        } else if (view === 'tienda') {
            return `<thead><tr class="table-dark"><th>Compañía</th><th>Tienda</th><th class="text-center">Sugerido</th><th class="text-center">Saldo Tienda</th><th class="text-center">Necesidad</th><th class="text-center">Exceso</th></tr></thead><tbody></tbody>`;
        } else if (view === 'division') {
            return `<thead><tr class="table-dark"><th>División</th><th class="text-center">Sugerido</th><th class="text-center">Saldo Tienda</th><th class="text-center">Necesidad</th><th class="text-center">Exceso</th></tr></thead><tbody></tbody>`;
        } else if (view === 'categoria') {
            return `<thead><tr class="table-dark"><th>Categoría</th><th class="text-center">Sugerido</th><th class="text-center">Saldo Tienda</th><th class="text-center">Necesidad</th><th class="text-center">Exceso</th></tr></thead><tbody></tbody>`;
        } else if (view === 'grupo') {
            return `<thead><tr class="table-dark"><th>Grupo</th><th class="text-center">Sugerido</th><th class="text-center">Saldo Tienda</th><th class="text-center">Necesidad</th><th class="text-center">Exceso</th></tr></thead><tbody></tbody>`;
        }
    }

    function initDataTable(view) {
        if (table) { table.destroy(); }
        $('#tablaInventario').html(getHeadersForView(view));

        let targetNeedIdx = (view === 'detalle') ? 7 : (view === 'tienda' ? 4 : 3);
        let targetExcessIdx = (view === 'detalle') ? 8 : (view === 'tienda' ? 5 : 4);
        let numericTargets = (view === 'detalle') ? [5, 6] : (view === 'tienda' ? [2, 3] : [1, 2]);

        table = $('#tablaInventario').DataTable({
            language: { url: '//cdn.datatables.net/plug-ins/1.13.6/i18n/es-ES.json' },
            pageLength: 25, responsive: true, order: [[targetNeedIdx, 'desc']],
            deferRender: true, processing: true,
            columnDefs: [
                {
                    targets: targetNeedIdx, className: 'text-center',
                    render: function (data, type, row) {
                        if (type === 'display' && data > 0) return `<span class="necesidad-alta">${Math.round(data).toLocaleString('en-US')}</span>`;
                        return (type === 'display' && typeof data === 'number') ? Math.round(data).toLocaleString('en-US') : data;
                    }
                },
                {
                    targets: targetExcessIdx, className: 'text-center',
                    render: function (data, type, row) {
                        if (type === 'display' && data > 0) return `<span class="exceso-alto">${Math.round(data).toLocaleString('en-US')}</span>`;
                        return (type === 'display' && typeof data === 'number') ? Math.round(data).toLocaleString('en-US') : data;
                    }
                },
                {
                    targets: numericTargets, className: 'text-center',
                    render: function (data, type, row) {
                        if (type === 'display' && typeof data === 'number') return Math.round(data).toLocaleString('en-US');
                        return data;
                    }
                }
            ]
        });

        table.on('draw', function () { updateKPIsFromVisible(); });
    }

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
            if (selectedCompania && row[0] !== selectedCompania) continue;
            if (selectedTienda && row[1] !== selectedTienda) continue;
            if (selectedDivision && row[2] !== selectedDivision) continue;
            if (selectedCategoria && row[3] !== selectedCategoria) continue;
            if (selectedGrupo && row[4] !== selectedGrupo) continue;
            if (selectedEstado === 'necesidad' && row[7] <= 0) continue;
            if (selectedEstado === 'exceso' && row[8] <= 0) continue;
            if (selectedEstado === 'optimo' && (row[7] > 0 || row[8] > 0)) continue;
            filtered.push(row);
        }
        return filtered;
    }

    function updateThemeColor() {
        let selectedCompania = $('#filtroCompania').val();
        if (selectedCompania === 'LV') {
            document.documentElement.style.setProperty('--theme-primary', 'var(--vitrina-purple)');
        } else {
            document.documentElement.style.setProperty('--theme-primary', 'var(--compadre-blue)');
        }
    }

    function aggregateByTienda(filteredRows) {
        let map = new Map();
        for (let i = 0; i < filteredRows.length; i++) {
            let row = filteredRows[i];
            let key = row[0] + '|||' + row[1]; 
            if (!map.has(key)) map.set(key, { sugerido: 0, saldoTienda: 0, necesidad: 0, exceso: 0 });
            let agg = map.get(key);
            agg.sugerido += row[5]; agg.saldoTienda += row[6]; agg.necesidad += row[7]; agg.exceso += row[8];
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
        for (let i = 0; i < filteredRows.length; i++) {
            let row = filteredRows[i]; let key = row[2];
            if (!map.has(key)) map.set(key, { sugerido: 0, saldoTienda: 0, necesidad: 0, exceso: 0 });
            let agg = map.get(key);
            agg.sugerido += row[5]; agg.saldoTienda += row[6]; agg.necesidad += row[7]; agg.exceso += row[8];
        }
        let result = [];
        map.forEach(function (value, key) { result.push([key, value.sugerido, value.saldoTienda, value.necesidad, value.exceso]); });
        return result;
    }

    function aggregateByCategoria(filteredRows) {
        let map = new Map();
        for (let i = 0; i < filteredRows.length; i++) {
            let row = filteredRows[i]; let key = row[3]; 
            if (!map.has(key)) map.set(key, { sugerido: 0, saldoTienda: 0, necesidad: 0, exceso: 0 });
            let agg = map.get(key);
            agg.sugerido += row[5]; agg.saldoTienda += row[6]; agg.necesidad += row[7]; agg.exceso += row[8];
        }
        let result = [];
        map.forEach(function (value, key) { result.push([key, value.sugerido, value.saldoTienda, value.necesidad, value.exceso]); });
        return result;
    }

    function aggregateByGrupo(filteredRows) {
        let map = new Map();
        for (let i = 0; i < filteredRows.length; i++) {
            let row = filteredRows[i]; let key = row[4];
            if (!map.has(key)) map.set(key, { sugerido: 0, saldoTienda: 0, necesidad: 0, exceso: 0, idGrupo: row[9] || 'N/A' });
            let agg = map.get(key);
            agg.sugerido += row[5]; agg.saldoTienda += row[6]; agg.necesidad += row[7]; agg.exceso += row[8];
        }
        let result = [];
        map.forEach(function (value, key) { result.push([key, value.sugerido, value.saldoTienda, value.necesidad, value.exceso, value.idGrupo]); });
        return result;
    }

    function updateKPIs(filteredRows) {
        let totalSugerido = 0, totalSaldoTienda = 0, totalNecesidad = 0, totalExceso = 0;
        for (let i = 0; i < filteredRows.length; i++) {
            let row = filteredRows[i];
            totalSugerido += row[5] || 0; totalSaldoTienda += row[6] || 0; totalNecesidad += row[7] || 0; totalExceso += row[8] || 0;
        }
        let format = val => Math.round(val).toLocaleString('en-US');
        $('#kpiTotalSugerido').text(format(totalSugerido));
        $('#kpiTotalSaldoTienda').text(format(totalSaldoTienda));
        $('#kpiTotalNecesidad').text(format(totalNecesidad));
        $('#kpiTotalExceso').text(format(totalExceso));
        updateInventoryHealth(filteredRows);
    }

    function updateKPIsFromVisible() {
        if (!table) return;
        let totalSugerido = 0, totalSaldoTienda = 0, totalNecesidad = 0, totalExceso = 0;
        let filteredData = table.rows({ filter: 'applied' }).data();
        
        let sugCol = (currentView === 'detalle') ? 5 : (currentView === 'tienda' ? 2 : 1);
        let salCol = (currentView === 'detalle') ? 6 : (currentView === 'tienda' ? 3 : 2);
        let necCol = (currentView === 'detalle') ? 7 : (currentView === 'tienda' ? 4 : 3);
        let excCol = (currentView === 'detalle') ? 8 : (currentView === 'tienda' ? 5 : 4);

        for (let i = 0; i < filteredData.length; i++) {
            let row = filteredData[i];
            totalSugerido += row[sugCol] || 0; totalSaldoTienda += row[salCol] || 0; totalNecesidad += row[necCol] || 0; totalExceso += row[excCol] || 0;
        }
        let format = val => Math.round(val).toLocaleString('en-US');
        $('#kpiTotalSugerido').text(format(totalSugerido));
        $('#kpiTotalSaldoTienda').text(format(totalSaldoTienda));
        $('#kpiTotalNecesidad').text(format(totalNecesidad));
        $('#kpiTotalExceso').text(format(totalExceso));
        updateInventoryHealthFromVisible(filteredData);
    }

    function updateInventoryHealth(detailRows) {
        let len = detailRows.length;
        if (len === 0) return renderHealthBar(0, 0, 0, 0);
        let countNecesidad = 0, countExceso = 0, countOptimo = 0;
        for (let i = 0; i < len; i++) {
            let necesidad = detailRows[i][7] || 0; let exceso = detailRows[i][8] || 0;
            if (necesidad > 0) countNecesidad++; else if (exceso > 0) countExceso++; else countOptimo++;
        }
        renderHealthBar(len, countNecesidad, countOptimo, countExceso);
    }

    function updateInventoryHealthFromVisible(filteredData) {
        let len = filteredData.length;
        if (len === 0) return renderHealthBar(0, 0, 0, 0);
        let countNecesidad = 0, countExceso = 0, countOptimo = 0;
        let necCol = (currentView === 'detalle') ? 7 : (currentView === 'tienda' ? 4 : 3);
        let excCol = (currentView === 'detalle') ? 8 : (currentView === 'tienda' ? 5 : 4);

        for (let i = 0; i < len; i++) {
            let necesidad = filteredData[i][necCol] || 0; let exceso = filteredData[i][excCol] || 0;
            if (necesidad > 0) countNecesidad++; else if (exceso > 0) countExceso++; else countOptimo++;
        }
        let labelSuffix = (currentView === 'detalle') ? ' Referencias' : (currentView === 'tienda' ? ' Tiendas' : ' Grupos/Divisiones');
        renderHealthBar(len, countNecesidad, countOptimo, countExceso, labelSuffix);
    }

    function renderHealthBar(total, countNecesidad, countOptimo, countExceso, suffix = ' Referencias') {
        if (total === 0) {
            $('#healthBarSummary').text('Sin datos');
            $('#pbNecesidad, #pbOptimo, #pbExceso').css('width', '0%').text('');
            return;
        }
        let pctNecesidad = (countNecesidad / total) * 100;
        let pctExceso = (countExceso / total) * 100;
        let pctOptimo = (countOptimo / total) * 100;
        let formatPct = val => Math.round(val);
        $('#healthBarSummary').text(`${total.toLocaleString('en-US')} ${suffix} Analizadas`);

        let isMobile = window.innerWidth < 576;
        if (pctNecesidad > 0) {
            $('#pbNecesidad').css('width', pctNecesidad + '%').text(isMobile ? `${formatPct(pctNecesidad)}% ⚠️` : `${formatPct(pctNecesidad)}% Necesidad`);
        } else { $('#pbNecesidad').css('width', '0%').text(''); }

        if (pctOptimo > 0) {
            $('#pbOptimo').css('width', pctOptimo + '%').text(isMobile ? `${formatPct(pctOptimo)}% ✅` : `${formatPct(pctOptimo)}% Óptimo`);
        } else { $('#pbOptimo').css('width', '0%').text(''); }

        if (pctExceso > 0) {
            $('#pbExceso').css('width', pctExceso + '%').text(isMobile ? `${formatPct(pctExceso)}% 📈` : `${formatPct(pctExceso)}% Exceso`);
        } else { $('#pbExceso').css('width', '0%').text(''); }
    }

    function updateFilterDropdowns() {
        let selectedCompania = $('#filtroCompania').val(); let selectedTienda = $('#filtroTienda').val();
        let selectedDivision = $('#filtroDivision').val(); let selectedCategoria = $('#filtroCategoria').val();
        let selectedGrupo = $('#filtroGrupo').val();

        let companias = new Set(), tiendas = new Set(), divisiones = new Set(), categorias = new Set(), grupos = new Set();

        for (let i = 0; i < allRows.length; i++) {
            let row = allRows[i];
            if ((!selectedTienda || row[1] === selectedTienda) && (!selectedDivision || row[2] === selectedDivision) && (!selectedCategoria || row[3] === selectedCategoria) && (!selectedGrupo || row[4] === selectedGrupo)) companias.add(row[0]);
            if ((!selectedCompania || row[0] === selectedCompania) && (!selectedDivision || row[2] === selectedDivision) && (!selectedCategoria || row[3] === selectedCategoria) && (!selectedGrupo || row[4] === selectedGrupo)) tiendas.add(row[1]);
            if ((!selectedCompania || row[0] === selectedCompania) && (!selectedTienda || row[1] === selectedTienda) && (!selectedCategoria || row[3] === selectedCategoria) && (!selectedGrupo || row[4] === selectedGrupo)) divisiones.add(row[2]);
            if ((!selectedCompania || row[0] === selectedCompania) && (!selectedTienda || row[1] === selectedTienda) && (!selectedDivision || row[2] === selectedDivision) && (!selectedGrupo || row[4] === selectedGrupo)) categorias.add(row[3]);
            if ((!selectedCompania || row[0] === selectedCompania) && (!selectedTienda || row[1] === selectedTienda) && (!selectedDivision || row[2] === selectedDivision) && (!selectedCategoria || row[3] === selectedCategoria)) grupos.add(row[4]);
        }

        let fillSelect = (selectId, setValues, defaultText, selectedValue) => {
            let select = $(`#${selectId}`); let optionsHtml = `<option value="">${defaultText}</option>`;
            let sortedValues = Array.from(setValues).sort();
            for (let j = 0; j < sortedValues.length; j++) {
                if (sortedValues[j] !== 'N/A' && sortedValues[j] !== '') {
                    optionsHtml += `<option value="${sortedValues[j]}"${sortedValues[j] === selectedValue ? ' selected' : ''}>${sortedValues[j]}</option>`;
                }
            }
            select.html(optionsHtml);
        };

        fillSelect('filtroCompania', companias, 'Todas...', selectedCompania); fillSelect('filtroTienda', tiendas, 'Todas...', selectedTienda);
        fillSelect('filtroDivision', divisiones, 'Todas...', selectedDivision); fillSelect('filtroCategoria', categorias, 'Todas...', selectedCategoria);
        fillSelect('filtroGrupo', grupos, 'Todos...', selectedGrupo);
    }

    function renderDashboard() {
        if (!table) return;
        let filteredRows = getFilteredRows();
        updateKPIs(filteredRows); updateFilterDropdowns();
        let displayData = [];
        if (currentView === 'detalle') displayData = filteredRows;
        else if (currentView === 'tienda') displayData = aggregateByTienda(filteredRows);
        else if (currentView === 'division') displayData = aggregateByDivision(filteredRows);
        else if (currentView === 'categoria') displayData = aggregateByCategoria(filteredRows);
        else if (currentView === 'grupo') displayData = aggregateByGrupo(filteredRows);
        table.clear().rows.add(displayData).draw();
    }

    initDataTable('detalle');

    function procesarDatosCSV(data) {
        allRows = [];
        for (let i = 0; i < data.length; i++) {
            let row = data[i];
            if (!row || !row['Sucursal']) continue;
            let sucursalId = String(row['Sucursal']);
            if (sucursalId.indexOf('CDI') !== -1) continue;

            let tienda = row['Nombre Tienda'] || sucursalId || 'N/A';
            if (typeof tienda === 'string') tienda = tienda.replace('-DS', '-LV');

            let compania = 'AEC';
            if (sucursalId.indexOf('TD') === 0 || tienda.indexOf('-LV') !== -1) compania = 'LV';

            let division = row['Division'] || 'N/A'; let categoria = row['Categoria'] || 'N/A'; let grupo = row['Grupo'] || 'N/A';
            
            // Capturar de manera flexible el ID del grupo desde el origen de datos
            let idGrupo = row['Id Grupo'] || row['ID Grupo'] || row['Código Grupo'] || row['Codigo Grupo'] || row['IdGrupo'] || 'N/A';

            let sugerido = (parseFloat(row['Sugerido AEC']) || 0) + (parseFloat(row['Sugerido DS']) || 0);
            let saldoTienda = parseFloat(row['Saldo Tienda']) || 0;
            let necesidad = (parseFloat(row['Necesidad detalle AEC']) || 0) + (parseFloat(row['Necesidad mayoreo AEC']) || 0) + (parseFloat(row['Necesidad DS']) || 0);
            let exceso = saldoTienda > sugerido ? (saldoTienda - sugerido) : 0;

            allRows.push([compania, tienda, division, categoria, grupo, sugerido, saldoTienda, necesidad, exceso, idGrupo]);
        }
        renderDashboard();
    }

    function mostrarCargaManual() { $('#fallbackCargaManual').removeClass('d-none'); }

    function cargarCSVAutomatico() {
        let rutaZip = './invetario.zip'; 

        fetch(rutaZip)
            .then(function(response) {
                if (!response.ok) throw new Error("HTTP " + response.status + " - El archivo " + rutaZip + " no existe.");
                return response.blob();
            })
            .then(function(blob) { return JSZip.loadAsync(blob); })
            .then(function(zip) {
                let nombreCSV = null;
                zip.forEach(function (relativePath, zipEntry) {
                    if (zipEntry.name.endsWith('.csv')) nombreCSV = zipEntry.name;
                });
                if (!nombreCSV) throw new Error("No hay un archivo .csv dentro del ZIP");
                return zip.file(nombreCSV).async("string");
            })
            .then(function(textoCSV) {
                Papa.parse(textoCSV, {
                    header: true, delimiter: ";", bom: true, dynamicTyping: true, skipEmptyLines: true,
                    transformHeader: function (header) { return header.trim(); },
                    complete: function (results) { procesarDatosCSV(results.data); },
                    error: function (err) { throw new Error("Error de PapaParse: " + err.message); }
                });
            })
            .catch(function(error) {
                alert("🚨 ERROR AL LEER EL ZIP:\n" + error.message);
                mostrarCargaManual();
            });
    }

    if (window.location.protocol === 'file:') {
        mostrarCargaManual();
    } else {
        cargarCSVAutomatico();
    }

    $('#csvFileInput').on('change', function (e) {
        let file = e.target.files[0]; if (!file) return;
        $('#fallbackCargaManual').addClass('d-none');
        Papa.parse(file, {
            header: true, delimiter: ";", bom: true, dynamicTyping: true, skipEmptyLines: true,
            transformHeader: function (header) { return header.trim(); },
            complete: function (results) { procesarDatosCSV(results.data); },
            error: function (err) { alert("Error manual: " + err); mostrarCargaManual(); }
        });
    });

    function exportToCSV() {
        if (!table) return;

        let headers = [];
        $('#tablaInventario thead th').each(function () {
            headers.push($(this).text().trim());
        });

        // Si la vista activa es de detalle o grupo, añadimos dinámicamente la columna en la cabecera del CSV
        if (currentView === 'detalle' || currentView === 'grupo') {
            headers.push("ID Grupo");
        }

        let rowsData = table.rows({ filter: 'applied' }).data();
        let csvContent = "\uFEFF"; 
        csvContent += headers.join(";") + "\n"; 

        let len = rowsData.length;
        for (let i = 0; i < len; i++) {
            let row = rowsData[i];
            let rowArray = [];
            
            let visualColumnsCount = (currentView === 'detalle') ? 9 : 
                                    (currentView === 'tienda') ? 6 : 5;

            for (let j = 0; j < visualColumnsCount; j++) {
                let cellVal = row[j];
                if (typeof cellVal === 'number') {
                    cellVal = Math.round(cellVal);
                } else if (cellVal === null || cellVal === undefined) {
                    cellVal = '';
                } else {
                    cellVal = String(cellVal).replace(/"/g, '""');
                    if (cellVal.indexOf(";") !== -1 || cellVal.indexOf("\n") !== -1) {
                        cellVal = `"${cellVal}"`;
                    }
                }
                rowArray.push(cellVal);
            }

            // Inyectar el ID oculto de manera inteligente al final de la fila durante el armado del string
            if (currentView === 'detalle') {
                let idGrupoVal = row[9] || 'N/A';
                rowArray.push(`"${String(idGrupoVal).replace(/"/g, '""')}"`);
            } else if (currentView === 'grupo') {
                let idGrupoVal = row[5] || 'N/A'; 
                rowArray.push(`"${String(idGrupoVal).replace(/"/g, '""')}"`);
            }

            csvContent += rowArray.join(";") + "\n";
        }

        let blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        let filename = `Reporte_Inventario_${currentView}_${new Date().toISOString().slice(0, 10)}.csv`;
        
        if (navigator.msSaveBlob) { 
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

    $('#btnExportarCSV').on('click', function () {
        exportToCSV();
    });

    $('#filtroCompania, #filtroTienda, #filtroDivision, #filtroCategoria, #filtroGrupo, #filtroEstado').on('change', function () {
        if(this.id === 'filtroCompania') updateThemeColor();
        renderDashboard();
    });

    $('#btnBorrarFiltros').on('click', function () {
        $('#filtroCompania, #filtroTienda, #filtroDivision, #filtroCategoria, #filtroGrupo, #filtroEstado').val('');
        updateThemeColor(); renderDashboard();
    });

    $(document).on('click', '.nav-tabs .nav-link', function (e) {
        e.preventDefault();
        $('.nav-tabs .nav-link').removeClass('active');
        $(this).addClass('active');
        currentView = $(this).attr('data-view');
        initDataTable(currentView);
        renderDashboard();
    });
});
