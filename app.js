// JU 52nd Batch Academic Data Portal - Application Logic & Admin Engine
// PRD v1.0 Compliant: Mandatory Session Restriction to 2022-2023 at the Data/Query Layer
// Full Admin Panel with Realtime Cloud Sync with batchday52ju.xyz

// --- Supabase Realtime Sync Engine ---
const SUPABASE_URL = "https://enebjlvbaipggzswnzme.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVuZWJqbHZiYWlwZ2d6c3duem1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyODc4NzEsImV4cCI6MjA4OTg2Mzg3MX0.JDWbZ0ce9CfoypVto-ndXRBTKBselqXj1SlQjpWYuk0";

let supabaseClient = null;
let syncChannel = null;

try {
  if (window.supabase) {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    syncChannel = supabaseClient.channel('ju52_data_sync');
    syncChannel.subscribe((status) => {
      console.log('⚡ [ju-52-analytics] Supabase channel connected:', status);
      const badge = document.getElementById('supabase-sync-badge');
      if (badge && status === 'SUBSCRIBED') {
        badge.innerHTML = '<span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse mr-2"></span><span>⚡ রিয়েলটাইম সিঙ্ক: লাইভ</span>';
      }
    });
  }
} catch (e) {
  console.warn('Supabase init warning:', e);
}

function broadcastChange(action, payload) {
  if (syncChannel) {
    syncChannel.send({
      type: 'broadcast',
      event: 'student_change',
      payload: {
        action,
        ...payload,
        timestamp: Date.now()
      }
    }).catch(err => console.warn('Broadcast send notice:', err));
  }
}


const CANONICAL_SESSION = '2022-2023';
const BATCH_LABEL = 'JU 52nd Batch / ৫২তম আবর্তন';
const STORAGE_KEY = 'JU52_STUDENTS_CUSTOM_V2';

// 19 Official Residential Halls
const OFFICIAL_HALLS = [
  'A F M Kamaluddin Hall',
  'Al Beruni Hall',
  'Begum Khaleda Zia Hall',
  'Begum Sufia Kamal Hall',
  'Bir Protik Taramon Bibi Hall',
  'Bishwakabi Rabindranath Tagore Hall',
  'Fazilatunnesa Hall',
  'Jahanara Imam Hall',
  'Jatiya Kabi Kazi Nazrul Islam Hall',
  'JULY-24 JAGORONI HALL',
  'Mir Mosharraf Hossain Hall',
  'Mowlana Bhashani Hall',
  'Nawab Faizunnesa Hall',
  'NAWAB SALIMULLAH HALL',
  'Pritilata Hall',
  'SHAHEED FELANI KHATUN HALL',
  'Shaheed Rafiq-Jabbar Hall',
  'Shaheed Salam-Barkat Hall',
  'SHER-E-BANGLA A. K. FAZLUL HUQ HALL'
];

// 37 Canonical Departments & Institutes
const OFFICIAL_DEPTS = [
  'Accounting and Information Systems',
  'Anthropology',
  'Archaeology',
  'Bangla',
  'Biochemistry and Molecular Biology',
  'Biotechnology and Genetic Engineering',
  'Botany',
  'Chemistry',
  'Computer Science and Engineering',
  'Drama and Dramatics',
  'Economics',
  'English',
  'Environmental Sciences',
  'Finance and Banking',
  'Fine Art',
  'Geography and Environment',
  'Geological Sciences',
  'Government and Politics',
  'History',
  'Institute of Business Administration (IBA-JU)',
  'Institute of Comparative Literature and Culture (ICLC)',
  'Institute of Information Technology (IIT)',
  'International Relations',
  'Journalism and Media Studies',
  'Law and Justice',
  'Management Studies',
  'Marketing',
  'Mathematics',
  'Microbiology',
  'Pharmacy',
  'Philosophy',
  'Physics',
  'Public Administration',
  'Public Health and Informatics',
  'Statistics and Data Science',
  'Urban and Regional Planning',
  'Zoology'
];

// Application State
const state = {
  eligibleRecords: [],
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

  // Load dataset: prefer localStorage if custom additions/deletions exist, otherwise load default
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      state.eligibleRecords = JSON.parse(saved);
      console.log(`Loaded ${state.eligibleRecords.length} records from LocalStorage.`);
    } catch (e) {
      console.error('Error reading localStorage, loading default data:', e);
      state.eligibleRecords = (window.JU_DATA.batch52Students || []).filter(r => r.session === CANONICAL_SESSION);
    }
  } else {
    state.eligibleRecords = (window.JU_DATA.batch52Students || []).filter(r => r.session === CANONICAL_SESSION);
  }

  state.quarantinedRecords = window.JU_DATA.quarantinedSample || [];

  initFilters();
  initAdminDropdowns();
  initKPIs();
  applyFilters();
  renderAuditTable();
  renderAdminManageTable();
  initCharts();
});

// Populate Hall and Department Dropdowns in Filters
function initFilters() {
  const hallSelect = document.getElementById('filter-hall');
  const deptSelect = document.getElementById('filter-dept');

  hallSelect.innerHTML = '<option value="ALL">All Halls (সকল হল)</option>';
  deptSelect.innerHTML = '<option value="ALL">All Departments (সকল বিভাগ)</option>';

  OFFICIAL_HALLS.forEach(hall => {
    const opt = document.createElement('option');
    opt.value = hall;
    opt.textContent = hall;
    hallSelect.appendChild(opt);
  });

  OFFICIAL_DEPTS.forEach(dept => {
    const opt = document.createElement('option');
    opt.value = dept;
    opt.textContent = dept;
    deptSelect.appendChild(opt);
  });
}

// Populate Admin Panel Dropdowns
function initAdminDropdowns() {
  const adminHall = document.getElementById('admin-add-hall');
  const adminDept = document.getElementById('admin-add-dept');
  const adminFilterHall = document.getElementById('admin-hall-filter');
  const modalHall = document.getElementById('modal-add-hall');
  const modalDept = document.getElementById('modal-add-dept');

  if (adminHall) {
    adminHall.innerHTML = '';
    OFFICIAL_HALLS.forEach(h => {
      const opt = document.createElement('option');
      opt.value = h;
      opt.textContent = h;
      adminHall.appendChild(opt);
    });
  }

  if (adminDept) {
    adminDept.innerHTML = '';
    OFFICIAL_DEPTS.forEach(d => {
      const opt = document.createElement('option');
      opt.value = d;
      opt.textContent = d;
      adminDept.appendChild(opt);
    });
  }

  if (adminFilterHall) {
    adminFilterHall.innerHTML = '<option value="ALL">সকল হল (All Halls)</option>';
    OFFICIAL_HALLS.forEach(h => {
      const opt = document.createElement('option');
      opt.value = h;
      opt.textContent = h;
      adminFilterHall.appendChild(opt);
    });
  }

  if (modalHall) {
    modalHall.innerHTML = '';
    OFFICIAL_HALLS.forEach(h => {
      const opt = document.createElement('option');
      opt.value = h;
      opt.textContent = h;
      modalHall.appendChild(opt);
    });
  }

  if (modalDept) {
    modalDept.innerHTML = '';
    OFFICIAL_DEPTS.forEach(d => {
      const opt = document.createElement('option');
      opt.value = d;
      opt.textContent = d;
      modalDept.appendChild(opt);
    });
  }

  const editHall = document.getElementById('edit-student-hall');
  const editDept = document.getElementById('edit-student-dept');

  if (editHall) {
    editHall.innerHTML = '';
    OFFICIAL_HALLS.forEach(h => {
      const opt = document.createElement('option');
      opt.value = h;
      opt.textContent = h;
      editHall.appendChild(opt);
    });
  }

  if (editDept) {
    editDept.innerHTML = '';
    OFFICIAL_DEPTS.forEach(d => {
      const opt = document.createElement('option');
      opt.value = d;
      opt.textContent = d;
      editDept.appendChild(opt);
    });
  }
}

// Save modified records to LocalStorage and update entire UI
function saveAndRefresh() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.eligibleRecords));
  initKPIs();
  applyFilters();
  renderAdminManageTable();
  if (state.hallChart) renderAnalyticsTab();
}

// Initialize KPI Cards
function initKPIs() {
  document.getElementById('kpi-eligible').textContent = state.eligibleRecords.length.toLocaleString();
  document.getElementById('kpi-quarantined').textContent = (window.JU_DATA.meta.totalQuarantined || 5980).toLocaleString();
  document.getElementById('admin-manage-count').textContent = `মোট রেকর্ড: ${state.eligibleRecords.length.toLocaleString()} জন`;
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

  // Show/Hide batch delete buttons in toolbar
  const btnDeleteSelected = document.getElementById('btn-delete-selected');
  const deleteCount = document.getElementById('btn-delete-selected-count');
  if (btnDeleteSelected && deleteCount) {
    if (count > 0) {
      btnDeleteSelected.classList.remove('hidden');
      deleteCount.textContent = count;
    } else {
      btnDeleteSelected.classList.add('hidden');
    }
  }
}

// Data/Query Layer Search and Filter Execution
function applyFilters() {
  const query = state.searchQuery.toLowerCase().trim();
  const hall = state.selectedHall;
  const dept = state.selectedDept;

  state.filteredRecords = state.eligibleRecords.filter(record => {
    // Session allowlist check (FR-01)
    if (record.session !== CANONICAL_SESSION) return false;

    // Hall filter (FR-04)
    if (hall !== 'ALL' && record.hall !== hall) return false;

    // Department filter (FR-04)
    if (dept !== 'ALL' && record.department !== dept) return false;

    // Search query match
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

// Render Table Rows with Responsive Layout & Action Controls
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
        <div class="inline-flex items-center space-x-1">
          <button onclick="viewStudentDetails('${record.id}')" title="বিস্তারিত দেখুন" class="px-2 py-1 text-[11px] font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded transition">
            View
          </button>
          <button onclick="openEditModal('${record.id}')" title="রেকর্ড এডিট / সংশোধন করুন" class="px-2 py-1 text-[11px] font-semibold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 rounded transition border border-blue-200">
            ✏️ এডিট
          </button>
          <button onclick="deleteStudent('${record.id}')" title="রেকর্ড মাইনাস / মুছুন" class="px-2 py-1 text-[11px] font-semibold text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 rounded transition border border-rose-200">
            🗑️ বাদ
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });

  const allPageSelected = pageRecords.every(r => state.selectedIds.has(r.id));
  const headerCheckbox = document.getElementById('header-select-page');
  if (headerCheckbox) headerCheckbox.checked = pageRecords.length > 0 && allPageSelected;

  updatePaginationUI(startIndex + 1, endIndex, state.filteredRecords.length);
}

// ==========================================
// ADMIN ACTIONS: ADD, MINUS, BATCH DELETE
// ==========================================

// 1. Add Record from Admin Form
function handleAdminAddRecord(event) {
  event.preventDefault();
  const name = document.getElementById('admin-add-name').value.trim();
  const hall = document.getElementById('admin-add-hall').value;
  const dept = document.getElementById('admin-add-dept').value;
  const regNo = document.getElementById('admin-add-reg').value.trim();
  const rollNo = document.getElementById('admin-add-roll').value.trim();

  if (!name || !regNo) {
    alert('নাম এবং রেজিস্ট্রেশন নম্বর আবশ্যক!');
    return;
  }

  // Create new record
  const newStudent = {
    id: `CUSTOM_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    slNo: state.eligibleRecords.length + 1,
    name: name.toUpperCase(),
    hall: hall,
    department: dept,
    regNo: regNo,
    rollNo: rollNo || '',
    session: CANONICAL_SESSION,
    isBatch52: true
  };

  // Add to top of list
  state.eligibleRecords.unshift(newStudent);
  saveAndRefresh();

  // Reset form and show success
  document.getElementById('admin-add-form').reset();
  const alertBox = document.getElementById('admin-add-alert');
  alertBox.className = 'p-3 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300 block';
  alertBox.innerHTML = `✓ শিক্ষার্থী <strong>${escapeHTML(newStudent.name)}</strong> সফলভাবে যুক্ত করা হয়েছে!`;
  setTimeout(() => { alertBox.classList.add('hidden'); }, 4000);
}

// 2. Add Record from Modal
function handleModalAddRecord(event) {
  event.preventDefault();
  const name = document.getElementById('modal-add-name').value.trim();
  const hall = document.getElementById('modal-add-hall').value;
  const dept = document.getElementById('modal-add-dept').value;
  const regNo = document.getElementById('modal-add-reg').value.trim();
  const rollNo = document.getElementById('modal-add-roll').value.trim();

  if (!name || !regNo) {
    alert('নাম এবং রেজিস্ট্রেশন নম্বর আবশ্যক!');
    return;
  }

  const newStudent = {
    id: `CUSTOM_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    slNo: state.eligibleRecords.length + 1,
    name: name.toUpperCase(),
    hall: hall,
    department: dept,
    regNo: regNo,
    rollNo: rollNo || '',
    session: CANONICAL_SESSION,
    isBatch52: true
  };

  state.eligibleRecords.unshift(newStudent);
  saveAndRefresh();
  closeAddModal();
  alert(`✓ শিক্ষার্থী "${newStudent.name}" সফলভাবে যুক্ত হয়েছে!`);
}

// 3. Minus / Delete Record (একক রেকর্ড ডিলিট)
function deleteStudent(id) {
  const student = state.eligibleRecords.find(r => r.id === id);
  if (!student) return;

  const confirmed = confirm(`আপনি কি নিশ্চিতভাবে "${student.name}" (রেজি: ${student.regNo}) রেকর্ডটি তালিকা থেকে বাদ/মাইনাস করতে চান?`);
  if (!confirmed) return;

  state.eligibleRecords = state.eligibleRecords.filter(r => r.id !== id);
  state.selectedIds.delete(id);
  saveAndRefresh();
  closeModal();
}

// 4. Batch Delete (একাধিক রেকর্ড একসাথে ডিলিট)
function deleteSelectedStudents() {
  const count = state.selectedIds.size;
  if (count === 0) {
    alert('মুছে ফেলার জন্য অন্তত একটি রেকর্ড সিলেক্ট করুন।');
    return;
  }

  const confirmed = confirm(`আপনি কি নিশ্চিতভাবে নির্বাচিত ${count} জন শিক্ষার্থীর রেকর্ড তালিকা থেকে ডিলিট/মাইনাস করতে চান?`);
  if (!confirmed) return;

  state.eligibleRecords = state.eligibleRecords.filter(r => !state.selectedIds.has(r.id));
  state.selectedIds.clear();
  saveAndRefresh();
  alert(`✓ সফলভাবে ${count} জন শিক্ষার্থীর রেকর্ড মুছে ফেলা হয়েছে!`);
}

// 5. Render Admin Management Mini Table
function renderAdminManageTable() {
  const tbody = document.getElementById('admin-manage-tbody');
  if (!tbody) return;

  const search = (document.getElementById('admin-search')?.value || '').toLowerCase().trim();
  const hallFilter = document.getElementById('admin-hall-filter')?.value || 'ALL';

  let list = state.eligibleRecords;
  if (hallFilter !== 'ALL') {
    list = list.filter(r => r.hall === hallFilter);
  }
  if (search) {
    list = list.filter(r => 
      (r.name && r.name.toLowerCase().includes(search)) ||
      (r.regNo && r.regNo.includes(search)) ||
      (r.rollNo && r.rollNo.includes(search)) ||
      (r.department && r.department.toLowerCase().includes(search))
    );
  }

  tbody.innerHTML = '';
  const displayLimit = Math.min(list.length, 100);

  if (list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="3" class="py-6 text-center text-slate-400">কোনো রেকর্ড পাওয়া যায়নি।</td></tr>';
    return;
  }

  for (let i = 0; i < displayLimit; i++) {
    const r = list[i];
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-slate-50 transition';
    tr.innerHTML = `
      <td class="py-2 px-3">
        <div class="font-bold text-slate-900">${escapeHTML(r.name)}</div>
        <div class="text-[11px] text-slate-500">${escapeHTML(r.department)}</div>
      </td>
      <td class="py-2 px-3">
        <div class="text-[11px] font-semibold text-slate-700">${escapeHTML(r.hall)}</div>
        <div class="text-[10px] font-mono text-slate-500">Reg: ${escapeHTML(r.regNo)} | Roll: ${escapeHTML(r.rollNo || '-')}</div>
      </td>
      <td class="py-2 px-3 text-right">
        <div class="inline-flex items-center space-x-1">
          <button onclick="openEditModal('${r.id}')" class="px-2 py-1 bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white rounded font-bold text-[11px] transition border border-blue-200">
            ✏️ এডিট
          </button>
          <button onclick="deleteStudent('${r.id}')" class="px-2 py-1 bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white rounded font-bold text-[11px] transition border border-rose-200">
            🗑️ বাদ
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  }
}

// 6. Reset to Official Default Dataset
function resetToOriginalData() {
  const confirmed = confirm('আপনি কি নিশ্চিতভাবে মূল অফিশিয়াল ১,৯৫৮ জন শিক্ষার্থীর ডাটায় রিসেট করতে চান? আপনার কাস্টম সমস্ত এড এবং ডিলিট পরিবর্তন মুছে যাবে।');
  if (!confirmed) return;

  localStorage.removeItem(STORAGE_KEY);
  state.eligibleRecords = (window.JU_DATA.batch52Students || []).filter(r => r.session === CANONICAL_SESSION);
  state.selectedIds.clear();
  saveAndRefresh();
  alert('✓ সফলভাবে মূল অফিশিয়াল ডেটায় রিস্টোর করা হয়েছে!');
}

// 7. Download Updated JSON
function downloadUpdatedJSON() {
  const dataStr = JSON.stringify(state.eligibleRecords, null, 2);
  downloadFile(dataStr, `JU52_Updated_Records_${Date.now()}.json`, 'application/json');
}

// Modal controls for Add Modal
function openAddModal() {
  document.getElementById('add-modal').classList.remove('hidden');
}

function closeAddModal() {
  document.getElementById('add-modal').classList.add('hidden');
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

// Export functions
function exportSelectedCSV() {
  const records = getSelectedOrFiltered();
  if (records.length === 0) {
    alert('Please select at least one record to export.');
    return;
  }

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
  
  const editBtn = document.getElementById('modal-edit-btn');
  if (editBtn) {
    editBtn.onclick = () => {
      closeModal();
      openEditModal(id);
    };
  }

  const deleteBtn = document.getElementById('modal-delete-btn');
  if (deleteBtn) {
    deleteBtn.onclick = () => deleteStudent(id);
  }

  document.getElementById('detail-modal').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('detail-modal').classList.add('hidden');
}

// Edit Modal Functions (এডিট / সংশোধন)
function openEditModal(id) {
  const student = state.eligibleRecords.find(r => r.id === id);
  if (!student) return;

  document.getElementById('edit-student-id').value = student.id;
  document.getElementById('edit-student-name').value = student.name;
  document.getElementById('edit-student-hall').value = student.hall;
  document.getElementById('edit-student-dept').value = student.department;
  document.getElementById('edit-student-reg').value = student.regNo;
  document.getElementById('edit-student-roll').value = student.rollNo || '';

  document.getElementById('edit-modal').classList.remove('hidden');
}

function closeEditModal() {
  document.getElementById('edit-modal').classList.add('hidden');
}

function handleSaveEdit(event) {
  event.preventDefault();
  const id = document.getElementById('edit-student-id').value;
  const student = state.eligibleRecords.find(r => r.id === id);
  if (!student) return;

  const name = document.getElementById('edit-student-name').value.trim();
  const hall = document.getElementById('edit-student-hall').value;
  const dept = document.getElementById('edit-student-dept').value;
  const regNo = document.getElementById('edit-student-reg').value.trim();
  const rollNo = document.getElementById('edit-student-roll').value.trim();

  if (!name || !regNo) {
    alert('নাম এবং রেজিস্ট্রেশন নম্বর আবশ্যক!');
    return;
  }

  student.name = name.toUpperCase();
  student.hall = hall;
  student.department = dept;
  student.regNo = regNo;
  student.rollNo = rollNo;

  saveAndRefresh();
  closeEditModal();
  alert(`✓ শিক্ষার্থী "${student.name}" এর তথ্য সফলভাবে সংশোধন করা হয়েছে!`);
}

// Tab Switching
function switchTab(tabId) {
  ['records', 'analytics', 'admin', 'audit', 'import'].forEach(t => {
    const content = document.getElementById(`tab-content-${t}`);
    if (content) content.classList.add('hidden');
    const btn = document.getElementById(`tab-btn-${t}`);
    if (btn) {
      btn.classList.remove('border-emerald-600', 'text-emerald-600', 'font-bold');
      btn.classList.add('border-transparent', 'text-slate-500');
    }
  });

  const activeContent = document.getElementById(`tab-content-${tabId}`);
  if (activeContent) activeContent.classList.remove('hidden');

  const activeBtn = document.getElementById(`tab-btn-${tabId}`);
  if (activeBtn) {
    activeBtn.classList.remove('border-transparent', 'text-slate-500');
    activeBtn.classList.add('border-emerald-600', 'text-emerald-600', 'font-bold');
  }

  if (tabId === 'analytics') {
    setTimeout(renderAnalyticsTab, 50);
  } else if (tabId === 'admin') {
    renderAdminManageTable();
  }
}

// Analytics and Charts Initialization
function initCharts() {}

function renderAnalyticsTab() {
  // Hall breakdown
  const tbody = document.getElementById('analytics-hall-tbody');
  tbody.innerHTML = '';
  
  // Dynamic hall counts based on state.eligibleRecords
  const hallCounts = {};
  OFFICIAL_HALLS.forEach(h => hallCounts[h] = 0);
  state.eligibleRecords.forEach(r => {
    hallCounts[r.hall] = (hallCounts[r.hall] || 0) + 1;
  });

  const hallSummaries = window.JU_DATA.hallSummaries || [];

  OFFICIAL_HALLS.forEach((hallName, idx) => {
    const b52 = hallCounts[hallName] || 0;
    const summaryItem = hallSummaries.find(h => h.hall === hallName);
    const total = summaryItem ? summaryItem.total : b52;
    const pct = total > 0 ? ((b52 / total) * 100).toFixed(1) : 0;

    const tr = document.createElement('tr');
    tr.className = 'hover:bg-slate-50';
    tr.innerHTML = `
      <td class="py-2.5 px-4 font-mono text-xs text-slate-400">${idx + 1}</td>
      <td class="py-2.5 px-4 font-bold text-slate-800">${escapeHTML(hallName)}</td>
      <td class="py-2.5 px-4 text-center font-extrabold text-emerald-600">${b52.toLocaleString()}</td>
      <td class="py-2.5 px-4 text-center text-slate-500">${total.toLocaleString()}</td>
      <td class="py-2.5 px-4 text-center">
        <span class="inline-block bg-emerald-50 text-emerald-700 text-xs px-2 py-0.5 rounded font-semibold">${pct}%</span>
      </td>
      <td class="py-2.5 px-4 text-right">
        <button onclick="quickFilterHall('${hallName}')" class="px-2.5 py-1 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-xs font-semibold rounded transition">
          Filter Records &rarr;
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Hall Bar Chart
  const hallCtx = document.getElementById('hallChart').getContext('2d');
  if (state.hallChart) state.hallChart.destroy();
  
  const sortedHalls = [...OFFICIAL_HALLS].sort((a, b) => (hallCounts[b] || 0) - (hallCounts[a] || 0));
  state.hallChart = new Chart(hallCtx, {
    type: 'bar',
    data: {
      labels: sortedHalls.map(h => h.replace(' Hall', '').slice(0, 15)),
      datasets: [{
        label: '52nd Batch Students',
        data: sortedHalls.map(h => hallCounts[h] || 0),
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

  // Department Bar Chart
  const deptCtx = document.getElementById('deptChart').getContext('2d');
  if (state.deptChart) state.deptChart.destroy();

  const deptCounts = {};
  state.eligibleRecords.forEach(r => {
    deptCounts[r.department] = (deptCounts[r.department] || 0) + 1;
  });

  const topDepts = Object.entries(deptCounts)
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

      saveAndRefresh();
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
