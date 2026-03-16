// Simple expense manager using localStorage
const STORAGE_KEY = 'expenses_v1';

let expenses = [];

const $ = id => document.getElementById(id);

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
}

function load() {
  const raw = localStorage.getItem(STORAGE_KEY);
  expenses = raw ? JSON.parse(raw) : [];
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2,8);
}

function formatCurrency(n) {
  return (n).toLocaleString(undefined, {style:'currency',currency:'USD'});
}

function render(filterMonth = null) {
  const tbody = $('expenses-body');
  tbody.innerHTML = '';
  const filtered = filterMonth
    ? expenses.filter(e => e.date.slice(0,7) === filterMonth)
    : expenses.slice();

  filtered.sort((a,b) => b.date.localeCompare(a.date));

  for (const e of filtered) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${e.date}</td>
      <td>${escapeHtml(e.description)}</td>
      <td>${escapeHtml(e.category)}</td>
      <td class="amount-col">${formatCurrency(Number(e.amount))}</td>
      <td class="actions-col">
        <button class="action-btn edit" data-id="${e.id}">Edit</button>
        <button class="action-btn delete" data-id="${e.id}">Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  }

  const total = filtered.reduce((s, x) => s + Number(x.amount), 0);
  $('total-amount').textContent = formatCurrency(total);
  $('expense-count').textContent = filtered.length;
}

function escapeHtml(s){ return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

function addExpense(exp) {
  expenses.push(exp);
  save();
  render($('month-filter').value || null);
}

function updateExpense(id, patch) {
  const idx = expenses.findIndex(e => e.id === id);
  if (idx === -1) return;
  expenses[idx] = {...expenses[idx], ...patch};
  save();
  render($('month-filter').value || null);
}

function deleteExpense(id) {
  expenses = expenses.filter(e => e.id !== id);
  save();
  render($('month-filter').value || null);
}

function populateFormForEdit(e) {
  $('expense-id').value = e.id;
  $('description').value = e.description;
  $('amount').value = e.amount;
  $('date').value = e.date;
  $('category').value = e.category;
  $('save-btn').textContent = 'Save Changes';
  $('cancel-edit').classList.remove('hidden');
  window.scrollTo({top:0,behavior:'smooth'});
}

function clearForm() {
  $('expense-id').value = '';
  $('description').value = '';
  $('amount').value = '';
  $('date').value = '';
  $('category').value = 'General';
  $('save-btn').textContent = 'Add Expense';
  $('cancel-edit').classList.add('hidden');
}

function exportCSV() {
  const header = ['id','date','description','category','amount'];
  const rows = [header].concat(expenses.map(e => [e.id, e.date, `"${e.description.replace(/"/g,'""')}"`, e.category, e.amount]));
  const csv = rows.map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'expenses.csv';
  a.click();
  URL.revokeObjectURL(url);
}

function importCSVFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    const text = reader.result;
    const lines = text.split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) {
      alert('CSV appears empty.');
      return;
    }
    const cols = lines[0].split(',').map(c => c.trim().toLowerCase());
    const idxDate = cols.indexOf('date');
    const idxDesc = cols.indexOf('description');
    const idxCat = cols.indexOf('category');
    const idxAmount = cols.indexOf('amount');
    for (let i=1;i<lines.length;i++){
      const row = parseCsvLine(lines[i]);
      const date = row[idxDate] || new Date().toISOString().slice(0,10);
      const description = row[idxDesc] ? row[idxDesc].replace(/^"|"$/g,'') : 'Imported';
      const category = row[idxCat] || 'General';
      const amount = parseFloat(row[idxAmount]) || 0;
      expenses.push({id: uid(), date, description, category, amount});
    }
    save();
    render($('month-filter').value || null);
  };
  reader.readAsText(file);
}

function parseCsvLine(line) {
  // naive CSV parser supporting quoted fields
  const out = [];
  let cur = '', inQuotes = false;
  for (let i=0;i<line.length;i++){
    const ch = line[i];
    if (ch === '"' ) {
      if (inQuotes && line[i+1] === '"') { cur += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      out.push(cur); cur = '';
    } else cur += ch;
  }
  out.push(cur);
  return out;
}

/* --- Events --- */
document.addEventListener('DOMContentLoaded', () => {
  load();
  render();

  $('expense-form').addEventListener('submit', (ev) => {
    ev.preventDefault();
    const id = $('expense-id').value;
    const description = $('description').value.trim();
    const amount = Number($('amount').value);
    const date = $('date').value;
    const category = $('category').value;

    if (!description || !date || Number.isNaN(amount)) {
      alert('Please fill required fields.');
      return;
    }

    if (id) {
      updateExpense(id, {description, amount, date, category});
    } else {
      addExpense({id: uid(), description, amount, date, category});
    }
    clearForm();
  });

  $('cancel-edit').addEventListener('click', () => {
    clearForm();
  });

  $('expenses-table').addEventListener('click', (ev) => {
    const editBtn = ev.target.closest('.action-btn.edit');
    const delBtn = ev.target.closest('.action-btn.delete');
    if (editBtn) {
      const id = editBtn.dataset.id;
      const e = expenses.find(x => x.id === id);
      if (e) populateFormForEdit(e);
    } else if (delBtn) {
      const id = delBtn.dataset.id;
      if (confirm('Delete this expense?')) deleteExpense(id);
    }
  });

  $('month-filter').addEventListener('change', () => {
    render($('month-filter').value || null);
  });
  $('clear-filter').addEventListener('click', () => {
    $('month-filter').value = '';
    render();
  });

  $('export-csv').addEventListener('click', exportCSV);
  $('import-csv').addEventListener('change', (ev) => {
    const file = ev.target.files[0];
    if (file) importCSVFile(file);
    ev.target.value = '';
  });

  // If first load, populate sample data for convenience
  if (expenses.length === 0) {
    const sample = [
      {id: uid(), date: new Date().toISOString().slice(0,10), description: 'Lunch', category: 'Food', amount: 12.5},
      {id: uid(), date: new Date().toISOString().slice(0,10), description: 'Coffee', category: 'Food', amount: 3.25},
      {id: uid(), date: new Date().toISOString().slice(0,10), description: 'Monthly rent', category: 'Rent', amount: 950}
    ];
    expenses = sample;
    save();
    render();
  }
});