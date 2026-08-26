import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class SpreadsheetService {
  async export(fileName: string, sheetName: string, rows: Record<string, unknown>[]): Promise<void> {
    const { utils, writeFileXLSX } = await import('xlsx');
    const worksheet = utils.json_to_sheet(rows);
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31));
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
