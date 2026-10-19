const fs = require('fs');

// Official JU Department Code Mapping (Digits 5-6 of 11-digit Reg No)
const JU_DEPARTMENTS = {
  '01': 'Mathematics',
  '02': 'Statistics and Data Science',
  '03': 'Chemistry',
  '04': 'Physics',
  '05': 'Geological Sciences',
  '06': 'Computer Science and Engineering',
  '07': 'Environmental Sciences',
  '08': 'Economics',
  '09': 'Geography and Environment',
  '10': 'Government and Politics',
  '11': 'Anthropology',
  '12': 'Urban and Regional Planning',
  '13': 'Public Administration',
  '14': 'Bangla',
  '15': 'English',
  '16': 'History',
  '17': 'Philosophy',
  '18': 'Drama and Dramatics',
  '19': 'Archaeology',
  '20': 'International Relations',
  '21': 'Journalism and Media Studies',
  '22': 'Fine Art',
  '23': 'Botany',
  '24': 'Zoology',
  '25': 'Pharmacy',
  '26': 'Biochemistry and Molecular Biology',
  '27': 'Microbiology',
  '28': 'Biotechnology and Genetic Engineering',
  '29': 'Public Health and Informatics',
  '30': 'Finance and Banking',
  '31': 'Marketing',
  '32': 'Accounting and Information Systems',
  '33': 'Management Studies',
  '34': 'Law and Justice',
  '35': 'Institute of Business Administration (IBA-JU)',
  '36': 'Institute of Information Technology (IIT)',
  '37': 'Institute of Comparative Literature and Culture (ICLC)'
};

console.log('Total Canonical JU Departments & Institutes:', Object.keys(JU_DEPARTMENTS).length);

// Load all records and clean them
const allRecords = JSON.parse(fs.readFileSync('C:/Users/atiqu/ju52-analytics/all_records.json'));
const b52Records = JSON.parse(fs.readFileSync('C:/Users/atiqu/ju52-analytics/batch52_records.json'));

let cleanedCount = 0;

function cleanRecord(r) {
  if (r.regNo && r.regNo.length === 11) {
    const code = r.regNo.slice(4, 6);
    if (JU_DEPARTMENTS[code]) {
      const canonicalDept = JU_DEPARTMENTS[code];
      // Clean student name if it had the department name attached
      let cleanName = r.name;
      // If name ends with the department name, strip it
      Object.values(JU_DEPARTMENTS).forEach(deptName => {
        if (cleanName.endsWith(deptName)) {
          cleanName = cleanName.slice(0, -deptName.length).trim();
        }
      });
      r.name = cleanName;
      r.department = canonicalDept;
      cleanedCount++;
    }
  }
  return r;
}

const cleanedAll = allRecords.map(cleanRecord);
const cleanedB52 = b52Records.map(cleanRecord);

// Recalculate summary stats
const deptCounts = {};
for (const r of cleanedB52) {
  deptCounts[r.department] = (deptCounts[r.department] || 0) + 1;
}

console.log(`Cleaned ${cleanedCount} records.`);
console.log('Unique standardized departments:', Object.keys(deptCounts).length);
console.log(deptCounts);

// Recalculate hall summaries
const hallSummaries = JSON.parse(fs.readFileSync('C:/Users/atiqu/ju52-analytics/hall_summaries.json'));

fs.writeFileSync('C:/Users/atiqu/ju52-analytics/all_records.json', JSON.stringify(cleanedAll, null, 2));
fs.writeFileSync('C:/Users/atiqu/ju52-analytics/batch52_records.json', JSON.stringify(cleanedB52, null, 2));

// Update data.js
const sessionCounts = {};
for (const r of cleanedAll) {
  sessionCounts[r.session] = (sessionCounts[r.session] || 0) + 1;
}

const dataJsContent = `// JU 52nd Batch Data Analytics & Selection System
// Canonical Session: 2022-2023 (JU 52nd Batch / ৫২তম আবর্তন)
// Strictly enforced at the data layer.

window.JU_DATA = {
  meta: {
    canonicalSession: "2022-2023",
    batchName: "JU 52nd Batch / ৫২তম আবর্তন",
    totalExtracted: ${cleanedAll.length},
    totalBatch52: ${cleanedB52.length},
    totalQuarantined: ${cleanedAll.length - cleanedB52.length},
    totalHalls: 19,
    totalDepartments: ${Object.keys(deptCounts).length},
    generatedAt: "${new Date().toISOString()}"
  },
  sessionSummary: ${JSON.stringify(sessionCounts, null, 2)},
  hallSummaries: ${JSON.stringify(hallSummaries, null, 2)},
  departmentSummary: ${JSON.stringify(deptCounts, null, 2)},
  batch52Students: ${JSON.stringify(cleanedB52)},
  quarantinedSample: ${JSON.stringify(cleanedAll.filter(r => !r.isBatch52).slice(0, 100))}
};
`;

fs.writeFileSync('C:/Users/atiqu/ju52-analytics/data.js', dataJsContent);
console.log('data.js updated successfully!');
