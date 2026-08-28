import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class SpreadsheetService {
  async export(fileName: string, sheetName: string, rows: Record<string, unknown>[]): Promise<void> {
    await this.exportMultiple(fileName, [{ name: sheetName, rows }]);
  }

  async exportMultiple(fileName: string, sheets: Array<{ name: string; rows: Record<string, unknown>[] }>): Promise<void> {
    const { utils, writeFileXLSX } = await import('xlsx');
    const workbook = utils.book_new();
    for (const sheet of sheets) {
      const worksheet = utils.json_to_sheet(sheet.rows);
      utils.book_append_sheet(workbook, worksheet, sheet.name.slice(0, 31));
    }
    writeFileXLSX(workbook, `${fileName}.xlsx`);
  }

  async import(file: File): Promise<Record<string, unknown>[]> {
    const { read, utils } = await import('xlsx');
    const buffer = await file.arrayBuffer();
    const workbook = read(buffer, { type: 'array', cellDates: true });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!worksheet) return [];
    return utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: '' });
  }
}
