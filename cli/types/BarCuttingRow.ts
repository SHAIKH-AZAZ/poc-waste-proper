export interface BarCuttingRaw {
  "SI no": string | number;
  "Label": string;
  "Dia": number;
  "Total Bars": number;
  "Cutting Length": number; // float rounded to 3 digits
  "Lap Length": number; // float rounded to 3 digits
  "No of lap": number;
  "Element": string;
  "BarCode": string; // Generated field: SI no/Label/Dia
}

// Display interface for table (what user sees)
export interface BarCuttingDisplay {
  "BarCode": string;
  "Dia": number;
  "Total Bars": number;
  "Cutting Length": number;
  "Lap Length": number;
  "Element": string;
}
