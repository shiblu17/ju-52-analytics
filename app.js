// JU 52nd Batch Academic Data Portal - Application Logic
// PRD v1.0 Compliant: Mandatory Session Restriction to 2022-2023 at the Data/Query Layer

const CANONICAL_SESSION = '2022-2023';
const BATCH_LABEL = 'JU 52nd Batch / ৫২তম আবর্তন';

// Application State
const state = {
  // Query-layer eligible records (strictly 2022-2023)
  eligibleRecords: [],
  // Multi-session audit/quarantined dataset
  quarantinedRecords: [],
  selectedIds: new Set(),
  filteredRecords: [],
  currentPage: 1,
  pageSize: 25,
  searchQuery: '',
  selectedHall: 'ALL',
  selectedDept: 'ALL',
  hallChart: null,
  deptChart: null
};

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
  if (!window.JU_DATA) {
    console.error('JU_DATA not loaded!');
    return;
  }

  // Data-layer isolation: filter eligible records strictly by session === '2022-2023'
  state.eligibleRecords = (window.JU_DATA.batch52Students || []).filter(r => r.session === CANONICAL_SESSION);
  state.quarantinedRecords = window.JU_DATA.quarantinedSample || [];

  initFilters();
  initKPIs();
  applyFilters();
  renderAuditTable();
  initCharts();
});

// Initialize Hall and Department Dropdowns
function initFilters() {
  const hallSelect = document.getElementById('filter-hall');
  const deptSelect = document.getElementById('filter-dept');

  // Extract unique halls and sort alphabetically
  const halls = Array.from(new Set(state.eligibleRecords.map(r => r.hall))).sort();
  halls.forEach(hall => {
    const count = state.eligibleRecords.filter(r => r.hall === hall).length;
    const opt = document.createElement('option');
    opt.value = hall;
    opt.textContent = `${hall} (${count})`;
    hallSelect.appendChild(opt);
  });

  // Extract unique departments and sort alphabetically
  const depts = Array.from(new Set(state.eligibleRecords.map(r => r.department))).sort();
  depts.forEach(dept => {
    const count = state.eligibleRecords.filter(r => r.department === dept).length;
    const opt = document.createElement('option');
    opt.value = dept;
    opt.textContent = `${dept} (${count})`;
    deptSelect.appendChild(opt);
  });
}

// Initialize KPI Cards
function initKPIs() {
  document.getElementById('kpi-eligible').textContent = state.eligibleRecords.length.toLocaleString();
  document.getElementById('kpi-quarantined').textContent = (window.JU_DATA.meta.totalQuarantined || 5980).toLocaleString();
  updateSelectionKPI();
}

// Update Selected Count Badge
function updateSelectionKPI() {
  const count = state.selectedIds.size;
  const total = state.eligibleRecords.length;
  const pct = total > 0 ? ((count / total) * 100).toFixed(1) : 0;

  document.getElementById('kpi-selected').textContent = count.toLocaleString();
  document.getElementById('kpi-selected-pct').textContent = `${pct}%`;
  document.getElementById('toolbar-selected-count').textContent = count.toLocaleString();
}

// Data/Query Layer Search and Filter Execution
function applyFilters() {
  const query = state.searchQuery.toLowerCase().trim();
  const hall = state.selectedHall;
  const dept = state.selectedDept;

  // PRD FR-02 & FR-03: Every query enforces session === '2022-2023' at the source!
  state.filteredRecords = state.eligibleRecords.filter(record => {
    // Session allowlist check (FR-01)
    if (record.session !== CANONICAL_SESSION) return false;

    // Hall filter (FR-04)
    if (hall !== 'ALL' && record.hall !== hall) return false;

    // Department filter (FR-04)
    if (dept !== 'ALL' && record.department !== dept) return false;

    // Search query match (Name, Reg No, Roll No, Dept, Hall)
    if (query) {
      const matchName = record.name && record.name.toLowerCase().includes(query);
      const matchReg = record.regNo && record.regNo.includes(query);
      const matchRoll = record.rollNo && record.rollNo.includes(query);
      const matchDept = record.department && record.department.toLowerCase().includes(query);
      const matchHall = record.hall && record.hall.toLowerCase().includes(query);
      if (!matchName && !matchReg && !matchRoll && !matchDept && !matchHall) return false;
    }

    return true;
  });

  state.currentPage = 1;
  document.getElementById('btn-filtered-count').textContent = state.filteredRecords.length.toLocaleString();
  renderTable();
}

// Render Table Rows with Responsive Layout & Sticky Header
function renderTable() {
  const tbody = document.getElementById('records-table-body');
  const emptyState = document.getElementById('table-empty-state');
  const table = document.getElementById('main-records-table');

  tbody.innerHTML = '';

  if (state.filteredRecords.length === 0) {
    emptyState.classList.remove('hidden');
    table.classList.add('hidden');
    updatePaginationUI(0, 0, 0);
    return;
  }

  emptyState.classList.add('hidden');
  table.classList.remove('hidden');

  const startIndex = (state.currentPage - 1) * state.pageSize;
  const endIndex = Math.min(startIndex + state.pageSize, state.filteredRecords.length);
  const pageRecords = state.filteredRecords.slice(startIndex, endIndex);

  pageRecords.forEach((record, idx) => {
    const isSelected = state.selectedIds.has(record.id);
    const tr = document.createElement('tr');
    tr.className = isSelected ? 'selected-row transition' : 'transition';

    tr.innerHTML = `
      <td class="text-center" data-label="Select">
        <input type="checkbox" ${isSelected ? 'checked' : ''} onchange="toggleSelectRecord('${record.id}', this.checked)"
          class="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer">
      </td>
      <td class="font-mono text-slate-500 text-xs" data-label="Sl.">${startIndex + idx + 1}</td>
      <td class="font-bold text-slate-900" data-label="Student Name">
        <span class="hover:text-emerald-700 cursor-pointer" onclick="viewStudentDetails('${record.id}')">${escapeHTML(record.name)}</span>
      </td>
      <td class="text-slate-700" data-label="Department">${escapeHTML(record.department)}</td>
      <td class="text-slate-600 text-xs" data-label="Hall">
        <span class="inline-block bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium">${escapeHTML(record.hall)}</span>
      </td>
      <td class="font-mono font-semibold text-slate-800 text-xs" data-label="Honours Reg.">${escapeHTML(record.regNo)}</td>
      <td class="font-mono text-slate-600 text-xs" data-label="Class Roll">${escapeHTML(record.rollNo || '-')}</td>
      <td class="text-center" data-label="Session">
        <span class="inline-flex items-center text-[11px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-300/60">
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5"></span>
          2022–2023 (52nd)
        </span>
      </td>
      <td class="text-center" data-label="Action">
        <button onclick="viewStudentDetails('${record.id}')" class="px-2.5 py-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded transition">
          View
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Check if all items on page are selected
  const allPageSelected = pageRecords.every(r => state.selectedIds.has(r.id));
  const headerCheckbox = document.getElementById('header-select-page');
  if (headerCheckbox) headerCheckbox.checked = pageRecords.length > 0 && allPageSelected;

  updatePaginationUI(startIndex + 1, endIndex, state.filteredRecords.length);
}

// Pagination Controls
function updatePaginationUI(start, end, total) {
  const totalPages = Math.ceil(total / state.pageSize) || 1;
  document.getElementById('page-start').textContent = total > 0 ? start : 0;
  document.getElementById('page-end').textContent = end;
  document.getElementById('page-total').textContent = total.toLocaleString();
  document.getElementById('current-page-num').textContent = state.currentPage;
  document.getElementById('total-pages-num').textContent = totalPages;

  document.getElementById('btn-first').disabled = state.currentPage <= 1;
  document.getElementById('btn-prev').disabled = state.currentPage <= 1;
  document.getElementById('btn-next').disabled = state.currentPage >= totalPages;
  document.getElementById('btn-last').disabled = state.currentPage >= totalPages;
}

function goToPage(page) {
  const totalPages = Math.ceil(state.filteredRecords.length / state.pageSize) || 1;
  if (page < 1 || page > totalPages) return;
  state.currentPage = page;
  renderTable();
}

function prevPage() { goToPage(state.currentPage - 1); }
function nextPage() { goToPage(state.currentPage + 1); }
function onPageSizeChange(val) {
  state.pageSize = parseInt(val, 10);
  state.currentPage = 1;
  renderTable();
}

// Search and Filter Events
function onSearchChange() {
  state.searchQuery = document.getElementById('filter-search').value;
  applyFilters();
}

function onFilterChange() {
  state.selectedHall = document.getElementById('filter-hall').value;
  state.selectedDept = document.getElementById('filter-dept').value;
  applyFilters();
}

function resetFilters() {
  document.getElementById('filter-search').value = '';
  document.getElementById('filter-hall').value = 'ALL';
  document.getElementById('filter-dept').value = 'ALL';
  state.searchQuery = '';
  state.selectedHall = 'ALL';
  state.selectedDept = 'ALL';
  applyFilters();
}

// Selection Functions
function toggleSelectRecord(id, checked) {
  if (checked) {
    state.selectedIds.add(id);
  } else {
    state.selectedIds.delete(id);
  }
  updateSelectionKPI();
  renderTable();
}

function toggleSelectCurrentPage(checked) {
  const startIndex = (state.currentPage - 1) * state.pageSize;
  const endIndex = Math.min(startIndex + state.pageSize, state.filteredRecords.length);
  const pageRecords = state.filteredRecords.slice(startIndex, endIndex);

  pageRecords.forEach(r => {
    if (checked) state.selectedIds.add(r.id);
    else state.selectedIds.delete(r.id);
  });
  updateSelectionKPI();
  renderTable();
}

function toggleSelectAllFiltered() {
  const allFilteredSelected = state.filteredRecords.every(r => state.selectedIds.has(r.id));
  if (allFilteredSelected) {
    state.filteredRecords.forEach(r => state.selectedIds.delete(r.id));
  } else {
    state.filteredRecords.forEach(r => state.selectedIds.add(r.id));
  }
  updateSelectionKPI();
  renderTable();
}

function clearSelection() {
  state.selectedIds.clear();
  updateSelectionKPI();
  renderTable();
}

// PRD FR-09: Export and Summary Consistency
function exportSelectedCSV() {
  const records = getSelectedOrFiltered();
  if (records.length === 0) {
    alert('Please select at least one record to export.');
    return;
  }

  // Mandatory metadata header per PRD FR-08 & FR-09
  let csv = `# Eligible Session: 2022–2023 — JU 52nd Batch / ৫২তম আবর্তন\n`;
  csv += `# Organization: Jahangirnagar University\n`;
  csv += `# Export Date: ${new Date().toLocaleString()}\n`;
  csv += `# Total Records: ${records.length}\n`;
  csv += `Sl,Name,Department,Residential Hall,Honours Reg No,Class Roll,Academic Session,Batch\n`;

  records.forEach((r, idx) => {
    const row = [
      idx + 1,
      `"${(r.name || '').replace(/"/g, '""')}"`,
      `"${(r.department || '').replace(/"/g, '""')}"`,
      `"${(r.hall || '').replace(/"/g, '""')}"`,
      `"${r.regNo || ''}"`,
      `"${r.rollNo || ''}"`,
      `"2022-2023"`,
      `"JU 52nd Batch / ৫২তম আবর্তন"`
    ];
    csv += row.join(',') + '\n';
  });

  downloadFile(csv, `JU_52_Batch_Selection_2022-2023_${Date.now()}.csv`, 'text/csv;charset=utf-8;');
}

function exportSelectedJSON() {
  const records = getSelectedOrFiltered();
  if (records.length === 0) {
    alert('Please select at least one record to export.');
    return;
  }

  const exportPayload = {
    metadata: {
      canonicalSession: CANONICAL_SESSION,
      batchLabel: BATCH_LABEL,
      exportedAt: new Date().toISOString(),
      recordCount: records.length,
      complianceRule: "PRD FR-01 & FR-09: Strictly session 2022-2023"
    },
    records: records
  };

  const jsonStr = JSON.stringify(exportPayload, null, 2);
  downloadFile(jsonStr, `JU_52_Batch_Selection_${Date.now()}.json`, 'application/json');
}

function printSelectionReport() {
  const records = getSelectedOrFiltered();
  if (records.length === 0) {
    alert('Please select at least one record to print.');
    return;
  }

  const printWindow = window.open('', '_blank');
  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>JU 52nd Batch - Academic Records Selection Report</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 24px; color: #1e293b; }
        .header { border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 20px; }
        .badge { background: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0; padding: 4px 10px; border-radius: 9999px; font-weight: bold; font-size: 12px; display: inline-block; margin-top: 6px; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 16px; }
        th, td { border: 1px solid #cbd5e1; padding: 6px 10px; text-align: left; }
        th { background: #f1f5f9; font-weight: bold; }
        @media print { body { padding: 0; } }
      </style>
    </head>
    <body>
      <div class="header">
        <h2 style="margin: 0;">Jahangirnagar University — 52nd Batch Records</h2>
        <div class="badge">Eligible session: 2022–2023 — JU 52nd Batch / ৫২তম আবর্তন</div>
        <p style="font-size: 12px; color: #64748b; margin-top: 6px;">Report generated on ${new Date().toLocaleString()} &bull; Total Selected: ${records.length} records</p>
      </div>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Name</th>
            <th>Department</th>
            <th>Residential Hall</th>
            <th>Honours Reg. No</th>
            <th>Class Roll</th>
            <th>Session</th>
          </tr>
        </thead>
        <tbody>
          ${records.map((r, i) => `
            <tr>
              <td>${i + 1}</td>
              <td><strong>${escapeHTML(r.name)}</strong></td>
              <td>${escapeHTML(r.department)}</td>
              <td>${escapeHTML(r.hall)}</td>
              <td>${escapeHTML(r.regNo)}</td>
              <td>${escapeHTML(r.rollNo || '-')}</td>
              <td>2022-2023</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </body>
    </html>
  `;
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => { printWindow.print(); }, 500);
}

function getSelectedOrFiltered() {
  if (state.selectedIds.size > 0) {
    return state.eligibleRecords.filter(r => state.selectedIds.has(r.id));
  }
  return state.filteredRecords;
}

function downloadFile(content, fileName, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Student Details Modal
function viewStudentDetails(id) {
  const student = state.eligibleRecords.find(r => r.id === id);
  if (!student) return;

  document.getElementById('modal-name').textContent = student.name;
  document.getElementById('modal-dept').textContent = student.department;
  document.getElementById('modal-hall').textContent = student.hall;
  document.getElementById('modal-reg').textContent = student.regNo;
  document.getElementById('modal-roll').textContent = student.rollNo || 'N/A';
  document.getElementById('modal-session').textContent = '2022-2023 (JU 52nd Batch)';
  document.getElementById('detail-modal').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('detail-modal').classList.add('hidden');
}

// Tab Switching
function switchTab(tabId) {
  ['records', 'analytics', 'audit', 'import'].forEach(t => {
    document.getElementById(`tab-content-${t}`).classList.add('hidden');
    const btn = document.getElementById(`tab-btn-${t}`);
    btn.classList.remove('border-emerald-600', 'text-emerald-600', 'font-bold');
    btn.classList.add('border-transparent', 'text-slate-500');
  });

  document.getElementById(`tab-content-${tabId}`).classList.remove('hidden');
  const activeBtn = document.getElementById(`tab-btn-${tabId}`);
  activeBtn.classList.remove('border-transparent', 'text-slate-500');
  activeBtn.classList.add('border-emerald-600', 'text-emerald-600', 'font-bold');

  if (tabId === 'analytics') {
    setTimeout(renderAnalyticsTab, 50);
  }
}

// Analytics and Charts Initialization
function initCharts() {
  // Populated in renderAnalyticsTab
}

function renderAnalyticsTab() {
  // 1. Hall breakdown table
  const tbody = document.getElementById('analytics-hall-tbody');
  tbody.innerHTML = '';
  const hallSummaries = window.JU_DATA.hallSummaries || [];

  hallSummaries.forEach((h, idx) => {
    const pct = h.total > 0 ? ((h.batch52 / h.total) * 100).toFixed(1) : 0;
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-slate-50';
    tr.innerHTML = `
      <td class="py-2.5 px-4 font-mono text-xs text-slate-400">${idx + 1}</td>
      <td class="py-2.5 px-4 font-bold text-slate-800">${escapeHTML(h.hall)}</td>
      <td class="py-2.5 px-4 text-center font-extrabold text-emerald-600">${h.batch52.toLocaleString()}</td>
      <td class="py-2.5 px-4 text-center text-slate-500">${h.total.toLocaleString()}</td>
      <td class="py-2.5 px-4 text-center">
        <span class="inline-block bg-emerald-50 text-emerald-700 text-xs px-2 py-0.5 rounded font-semibold">${pct}%</span>
      </td>
      <td class="py-2.5 px-4 text-right">
        <button onclick="quickFilterHall('${h.hall}')" class="px-2.5 py-1 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-xs font-semibold rounded transition">
          Filter Records &rarr;
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // 2. Hall Bar Chart
  const hallCtx = document.getElementById('hallChart').getContext('2d');
  if (state.hallChart) state.hallChart.destroy();
  
  const sortedHalls = [...hallSummaries].sort((a, b) => b.batch52 - a.batch52);
  state.hallChart = new Chart(hallCtx, {
    type: 'bar',
    data: {
      labels: sortedHalls.map(h => h.hall.replace(' Hall', '').slice(0, 15)),
      datasets: [{
        label: '52nd Batch Students',
        data: sortedHalls.map(h => h.batch52),
        backgroundColor: '#059669',
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, grid: { color: '#f1f5f9' } },
        x: { ticks: { font: { size: 9 }, maxRotation: 45 }, grid: { display: false } }
      }
    }
  });

  // 3. Department Top 12 Bar Chart
  const deptCtx = document.getElementById('deptChart').getContext('2d');
  if (state.deptChart) state.deptChart.destroy();

  const deptSummary = window.JU_DATA.departmentSummary || {};
  const topDepts = Object.entries(deptSummary)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12);

  state.deptChart = new Chart(deptCtx, {
    type: 'bar',
    data: {
      labels: topDepts.map(d => d[0].slice(0, 18)),
      datasets: [{
        label: 'Students in Batch 52',
        data: topDepts.map(d => d[1]),
        backgroundColor: '#4f46e5',
        borderRadius: 4
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { beginAtZero: true, grid: { color: '#f1f5f9' } },
        y: { ticks: { font: { size: 10 } }, grid: { display: false } }
      }
    }
  });
}

function quickFilterHall(hall) {
  document.getElementById('filter-hall').value = hall;
  state.selectedHall = hall;
  switchTab('records');
  applyFilters();
}

// PRD FR-10: Multi-Session Audit Table
function renderAuditTable() {
  const tbody = document.getElementById('audit-session-tbody');
  tbody.innerHTML = '';

  const sessions = window.JU_DATA.sessionSummary || {};
  const batchMapping = {
    '2017-2018': '47th Batch',
    '2018-2019': '48th Batch',
    '2019-2020': '49th Batch',
    '2020-2021': '50th Batch',
    '2021-2022': '51st Batch',
    '2022-2023': '52nd Batch (৫২তম আবর্তন)',
    '2023-2024': '53rd Batch'
  };

  Object.entries(sessions).forEach(([session, count]) => {
    const isEligible = session === CANONICAL_SESSION;
    const tr = document.createElement('tr');
    tr.className = isEligible ? 'bg-emerald-50/70 font-semibold' : 'hover:bg-slate-50';

    tr.innerHTML = `
      <td class="py-2.5 px-3 font-mono font-bold ${isEligible ? 'text-emerald-900' : 'text-slate-700'}">${session}</td>
      <td class="py-2.5 px-3 text-slate-600">${batchMapping[session] || 'Other'}</td>
      <td class="py-2.5 px-3 text-center font-mono font-bold ${isEligible ? 'text-emerald-700' : 'text-slate-700'}">${count.toLocaleString()}</td>
      <td class="py-2.5 px-3 text-center">
        ${isEligible ?
          '<span class="inline-flex items-center text-xs font-bold text-emerald-800 bg-emerald-200/80 px-2.5 py-1 rounded-full">✓ ELIGIBLE & ACTIVE</span>' :
          '<span class="inline-flex items-center text-[11px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">🔒 QUARANTINED (PRD FR-02)</span>'
        }
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// PRD FR-06: File Ingestion Handler
function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const status = document.getElementById('upload-status');
  status.className = 'p-4 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 block';
  status.textContent = `Analyzing ${file.name} through session normalizer...`;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const content = e.target.result;
      let rows = [];
      if (file.name.endsWith('.json')) {
        rows = JSON.parse(content);
      } else {
        // Simple CSV parser
        const lines = content.split('\n').filter(l => l.trim());
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        rows = lines.slice(1).map(l => {
          const cols = l.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
          const obj = {};
          headers.forEach((h, i) => obj[h] = cols[i] || '');
          return obj;
        });
      }

      let eligibleAdded = 0;
      let quarantinedCount = 0;

      rows.forEach((r, idx) => {
        // Normalization engine
        const rawSession = (r.session || '').toLowerCase().replace(/\s+/g, '');
        const is2223 = rawSession.includes('2022-2023') || rawSession.includes('2022-23') || (r.regNo && r.regNo.startsWith('2023'));

        if (is2223) {
          state.eligibleRecords.push({
            id: `UPLOAD_${Date.now()}_${idx}`,
            name: r.name || 'Unnamed',
            department: r.department || 'General',
            hall: r.hall || 'Unassigned',
            regNo: r.regNo || '',
            rollNo: r.rollNo || '',
            session: CANONICAL_SESSION,
            isBatch52: true
          });
          eligibleAdded++;
        } else {
          quarantinedCount++;
        }
      });

      status.className = 'p-4 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300 block';
      status.innerHTML = `
        <strong>Upload Successful!</strong><br>
        &bull; <strong>${eligibleAdded}</strong> records matched Session 2022–2023 and were unlocked into Selection workflow.<br>
        &bull; <strong>${quarantinedCount}</strong> records from other/ambiguous sessions were isolated per PRD FR-06.
      `;

      initKPIs();
      applyFilters();
    } catch (err) {
      status.className = 'p-4 rounded-lg text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 block';
      status.textContent = `Upload failed: ${err.message}`;
    }
  };
  reader.readAsText(file);
}

// Utility: Escape HTML
function escapeHTML(str) {
  if (!str) return '';
  return str.replace(/[&<>'"]/g, tag => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[tag] || tag));
}
