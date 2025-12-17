const XLSX = require('xlsx');

// Sample data matching the expected format
const sampleData = [
  { "SI no": 1, "Label": "B1-A", "Dia": 12, "Total Bars": 5, "Cutting Length": 3.5, "Lap Length": 0.5, "No of lap": 0, "Element": "Beam" },
  { "SI no": 2, "Label": "B1-B", "Dia": 12, "Total Bars": 8, "Cutting Length": 4.2, "Lap Length": 0.5, "No of lap": 0, "Element": "Beam" },
  { "SI no": 3, "Label": "B2-A", "Dia": 12, "Total Bars": 6, "Cutting Length": 5.8, "Lap Length": 0.5, "No of lap": 0, "Element": "Beam" },
  { "SI no": 4, "Label": "B2-B", "Dia": 12, "Total Bars": 4, "Cutting Length": 2.9, "Lap Length": 0.5, "No of lap": 0, "Element": "Beam" },
  { "SI no": 5, "Label": "C1-A", "Dia": 16, "Total Bars": 10, "Cutting Length": 3.2, "Lap Length": 0.6, "No of lap": 0, "Element": "Column" },
  { "SI no": 6, "Label": "C1-B", "Dia": 16, "Total Bars": 12, "Cutting Length": 4.5, "Lap Length": 0.6, "No of lap": 0, "Element": "Column" },
  { "SI no": 7, "Label": "C2-A", "Dia": 16, "Total Bars": 8, "Cutting Length": 5.1, "Lap Length": 0.6, "No of lap": 0, "Element": "Column" },
  { "SI no": 8, "Label": "S1-A", "Dia": 10, "Total Bars": 15, "Cutting Length": 2.8, "Lap Length": 0.4, "No of lap": 0, "Element": "Slab" },
  { "SI no": 9, "Label": "S1-B", "Dia": 10, "Total Bars": 20, "Cutting Length": 3.6, "Lap Length": 0.4, "No of lap": 0, "Element": "Slab" },
  { "SI no": 10, "Label": "S2-A", "Dia": 10, "Total Bars": 18, "Cutting Length": 4.1, "Lap Length": 0.4, "No of lap": 0, "Element": "Slab" },
  { "SI no": 11, "Label": "F1-A", "Dia": 20, "Total Bars": 6, "Cutting Length": 6.5, "Lap Length": 0.8, "No of lap": 0, "Element": "Footing" },
  { "SI no": 12, "Label": "F1-B", "Dia": 20, "Total Bars": 8, "Cutting Length": 7.2, "Lap Length": 0.8, "No of lap": 0, "Element": "Footing" },
  { "SI no": 13, "Label": "CB1-A", "Dia": 12, "Total Bars": 4, "Cutting Length": 14.5, "Lap Length": 0.5, "No of lap": 1, "Element": "Continuous Beam" },
  { "SI no": 14, "Label": "CB1-B", "Dia": 12, "Total Bars": 3, "Cutting Length": 18.2, "Lap Length": 0.5, "No of lap": 1, "Element": "Continuous Beam" },
  { "SI no": 15, "Label": "CB2-A", "Dia": 16, "Total Bars": 5, "Cutting Length": 22.0, "Lap Length": 0.6, "No of lap": 1, "Element": "Continuous Beam" },
];

// Create workbook and worksheet
const workbook = XLSX.utils.book_new();
const worksheet = XLSX.utils.json_to_sheet(sampleData);

// Set column widths
worksheet['!cols'] = [
  { wch: 8 },   // SI no
  { wch: 12 },  // Label
  { wch: 8 },   // Dia
  { wch: 12 },  // Total Bars
  { wch: 15 },  // Cutting Length
  { wch: 12 },  // Lap Length
  { wch: 10 },  // No of lap
  { wch: 18 },  // Element
];

// Add worksheet to workbook
XLSX.utils.book_append_sheet(workbook, worksheet, 'Cutting Data');

// Write file
XLSX.writeFile(workbook, 'sample_cutting_data.xlsx');

console.log('✅ Created: sample_cutting_data.xlsx');
console.log('');
console.log('Sample data includes:');
console.log('- Dia 10: 3 items (Slab)');
console.log('- Dia 12: 6 items (Beam, Continuous Beam)');
console.log('- Dia 16: 4 items (Column, Continuous Beam)');
console.log('- Dia 20: 2 items (Footing)');
console.log('');
console.log('Total: 15 rows');
