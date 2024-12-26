import Papa from 'papaparse';

export class CSVConverterService {
  // Convert JSON to CSV
  static jsonToCSV(data: any[], filename: string = 'data.csv') {
    if (data.length === 0) {
      console.warn('No data to convert');
      return '';
    }

    // Extract headers from the first object
    const headers = Object.keys(data[0]);

    // Convert to CSV
    const csv = Papa.unparse({
      fields: headers,
      data: data.map(item => headers.map(header => item[header]))
    });

    // Optional: Trigger download
    this.downloadCSV(csv, filename);

    return csv;
  }

  // Convert CSV to JSON
  static CSVToJson(csvString: string) {
    return new Promise<any[]>((resolve, reject) => {
      Papa.parse(csvString, {
        header: true,
        complete: (results) => {
          resolve(results.data);
        },
        error: (error) => {
          reject(error);
        }
      });
    });
  }

  // Download CSV file
  static downloadCSV(csv: string, filename: string) {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Example method to convert screen observation data
  static convertScreenObservationToCSV(screenObservations: any[]) {
    return this.jsonToCSV(screenObservations, 'screen_observations.csv');
  }
}

// Export for easy import
export const csvConverter = CSVConverterService;
