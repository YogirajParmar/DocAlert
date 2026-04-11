import { TRequest, TResponse } from '../../types';
import { PUC, User } from '../../entities';
import { CreatePUCDto } from './dto';
import { Op } from 'sequelize';
import { Logger } from '../../helpers';

export class DocumentController {
  private logger = Logger.getInstance('DocumentController');
  constructor() {}

  public addDocument = async (req: TRequest<CreatePUCDto>, res: TResponse) => {
    try {
      const user = req.me;
      const {
        vehicleNumber,
        vehicleType,
        issueDate,
        expirationDate,
        documentType,
      } = req.dto;
      const findExistingUser = await User.findByPk(user.id);

      if (!findExistingUser) {
        return res.status(404).json({ error: 'User not found' });
      }

      const newDocument = await PUC.create({
        vehicleNumber: vehicleNumber,
        vehicleType: vehicleType,
        issueDate: new Date(issueDate),
        expirationDate: new Date(expirationDate) || null,
        userId: user.id,
        documentType: documentType,
      });

      return res.json(newDocument);
    } catch (error) {
      console.error(error.message);
      return res.status(500).json({ error: error.message });
    }
  };

  public getDocuments = async (req: TRequest, res: TResponse) => {
    try {
      const user = req.me;

      const userDocuments = await PUC.findAll({
        where: { userId: user.id, deleted: false },
      });
      if (!userDocuments) {
        return res.status(404).json({ error: 'No documents found' });
      }

      return res.json(userDocuments);
    } catch (error) {
      console.error(error.message);
      return res.status(500).json({ error: error.message });
    }
  };

  public deleteDocument = async (req: TRequest, res: TResponse) => {
    try {
      const { id } = req.params;

      const document = await PUC.findByPk(id);

      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }

      // soft delete document
      await document.update({ deleted: true, deletedAt: new Date() });
      // await findExistingDocument.destroy();

      return res.status(204).send();
    } catch (error) {
      console.error(error.message);
      return res.status(500).json({ error: error.message });
    }
  };

  public getDocumentStats = async (req: TRequest, res: TResponse) => {
    try {
      const user = req.me;
      const { id } = req.params;

      const findExistingUser = await User.findByPk(user.id);

      if (!findExistingUser) {
        return res.status(404).json({ error: 'User not found' });
      }

      const totalDocuments = await PUC.count({
        where: { userId: user.id, deleted: false },
      });

      const today = new Date();
      const expieredDocs = await PUC.count({
        where: {
          userId: user.id,
          expirationDate: {
            [Op.lt]: today,
          },
          deleted: false,
        },
      });

      const currentMonth = today.getMonth();
      const currentYear = today.getFullYear();

      // End of current month
      const currentMonthEnd = new Date(currentYear, currentMonth + 1, 0);

      const expiringThisMonth = await PUC.count({
        where: {
          userId: user.id,
          expirationDate: {
            [Op.between]: [today, currentMonthEnd],
          },
          deleted: false,
        },
      });

      res.json({
        totalDocuments,
        expieredDocs,
        expiringThisMonth,
      });
    } catch (err) {
      console.error(err.message);
      return res.status(500).json({ error: err.message });
    }
  };

  public updateDocument = async (
    req: TRequest<CreatePUCDto>,
    res: TResponse
  ) => {
    try {
      const user = req.me;
      const { id } = req.params;
      const {
        vehicleNumber,
        vehicleType,
        issueDate,
        expirationDate,
        documentType,
      } = req.dto;

      const document = await PUC.findOne({
        where: { id, deleted: false },
      });

      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }

      await document.update({
        ...req.dto,
        issueDate: new Date(issueDate),
        expirationDate: new Date(expirationDate),
      });

      return res.status(200).json(true);
    } catch (err) {
      console.error(err.message);
      return res.status(500).json({ error: err.message });
    }
  };

  public getDocument = async (req: TRequest, res: TResponse) => {
    const { id } = req.params;
    const userId = req.me.id;

    try {
      const document = await PUC.findOne({
        where: { id: id, userId: userId, deleted: false },
      });

      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }

      return res.json(document);
    } catch (error) {
      console.error(error.message);
      return res.status(500).json({ error: error.message });
    }
  };

  public searchDocuments = async (req: TRequest, res: TResponse) => {
    try {
      const userId = req.me.id;
      const query = ((req.query.query as string) || '').trim().toLowerCase();

      if (!query) {
        return res.status(400).json({ message: 'Search query is required' });
      }

      const documents = await PUC.findAll({
        where: {
          userId,
          [Op.or]: [
            { documentType: { [Op.like]: `%${query}%` } },
            { vehicleNumber: { [Op.like]: `%${query}%` } },
            { vehicleType: { [Op.like]: `%${query}%` } },
          ],
          deleted: false,
        },
        order: [['createdAt', 'DESC']],
      });

      res.json(documents);
    } catch (err) {
      console.error('Error searching documents:', err);
      res.status(500).json({ message: 'Something went wrong' });
    }
  };

  public exportPUCDocuments = async (req: TRequest, res: TResponse) => {
    try {
      const userId = req.me.id;
      const {
        vehicleNumber,
        vehicleType,
        documentType,
        issueDateFrom,
        issueDateTo,
        expirationDateFrom,
        expirationDateTo,
      } = req.query as Record<string, string | undefined>;

      // Build dynamic where clause
      const where: Record<string, unknown> = { userId, deleted: false };

      if (vehicleNumber) {
        where.vehicleNumber = { [Op.like]: `%${vehicleNumber}%` };
      }

      if (vehicleType) {
        where.vehicleType = { [Op.like]: `%${vehicleType}%` };
      }

      if (documentType) {
        where.documentType = { [Op.like]: `%${documentType}%` };
      }

      // issueDate range filter
      if (issueDateFrom || issueDateTo) {
        const issueDateFilter: Record<symbol, Date> = {};
        if (issueDateFrom) issueDateFilter[Op.gte] = new Date(issueDateFrom);
        if (issueDateTo) issueDateFilter[Op.lte] = new Date(issueDateTo);
        where.issueDate = issueDateFilter;
      }

      // expirationDate range filter
      if (expirationDateFrom || expirationDateTo) {
        const expirationDateFilter: Record<symbol, Date> = {};
        if (expirationDateFrom) expirationDateFilter[Op.gte] = new Date(expirationDateFrom);
        if (expirationDateTo) expirationDateFilter[Op.lte] = new Date(expirationDateTo);
        where.expirationDate = expirationDateFilter;
      }

      const documents = await PUC.findAll({
        where,
        order: [['createdAt', 'DESC']],
      });

      // CSV column order — id excluded, userId included
      const CSV_HEADERS = [
        'userId',
        'vehicleNumber',
        'vehicleType',
        'documentType',
        'issueDate',
        'expirationDate',
        'deleted',
        'deletedAt',
        'createdAt',
        'updatedAt',
      ] as const;

      type CsvHeader = (typeof CSV_HEADERS)[number];

      const escapeCSV = (value: unknown): string => {
        if (value === null || value === undefined) return '';
        const str = String(value instanceof Date ? value.toISOString() : value);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      const rows = documents.map((doc) =>
        CSV_HEADERS.map((header) =>
          escapeCSV((doc as unknown as Record<CsvHeader, unknown>)[header])
        ).join(',')
      );

      const csvContent = [CSV_HEADERS.join(','), ...rows].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="puc_export_${Date.now()}.csv"`
      );

      this.logger.log('info', `Exported ${documents.length} PUC records for user ${userId}`);
      return res.status(200).send(csvContent);
    } catch (error) {
      this.logger.log('error', error.message);
      return res.status(500).json({ error: error.message });
    }
  };

  public importPUCDocuments = async (req: TRequest, res: TResponse) => {
    try {
      const userId = req.me.id;
      const { csvContent } = req.body as { csvContent: string };

      if (!csvContent || typeof csvContent !== 'string' || !csvContent.trim()) {
        return res.status(400).json({ error: 'csvContent is required in the request body.' });
      }

      // ── CSV Parser ──────────────────────────────────────────────────────────
      // RFC-4180 compliant: handles quoted fields with embedded commas/newlines.
      const parseCSV = (raw: string): string[][] => {
        const rows: string[][] = [];
        let row: string[] = [];
        let field = '';
        let inQuotes = false;

        for (let i = 0; i < raw.length; i++) {
          const ch = raw[i];
          const next = raw[i + 1];

          if (inQuotes) {
            if (ch === '"' && next === '"') { field += '"'; i++; }
            else if (ch === '"') { inQuotes = false; }
            else { field += ch; }
          } else {
            if (ch === '"') { inQuotes = true; }
            else if (ch === ',') { row.push(field.trim()); field = ''; }
            else if (ch === '\n' || (ch === '\r' && next === '\n')) {
              if (ch === '\r') i++;
              row.push(field.trim());
              if (row.some((c) => c !== '')) rows.push(row);
              row = []; field = '';
            } else { field += ch; }
          }
        }
        // last field / row
        row.push(field.trim());
        if (row.some((c) => c !== '')) rows.push(row);

        return rows;
      };

      const rows = parseCSV(csvContent);
      if (rows.length < 2) {
        return res.status(400).json({ error: 'CSV file must contain a header row and at least one data row.' });
      }

      const headers = rows[0].map((h) => h.toLowerCase());

      // ── Column presence validation ───────────────────────────────────────────
      // All columns that match the PUC model (id excluded on import since it is auto-generated)
      const REQUIRED_HEADERS = [
        'vehiclenumber',
        'vehicletype',
        'issuedate',
        'expirationdate',
        'documenttype',
        'userid',
        'deleted',
        'deletedat',
        'createdat',
        'updatedat',
      ];

      const missingHeaders = REQUIRED_HEADERS.filter((h) => !headers.includes(h));
      if (missingHeaders.length > 0) {
        return res.status(400).json({
          error: `CSV is missing required columns: ${missingHeaders.join(', ')}. Please use the exported file as a template.`,
        });
      }

      const idx = (name: string) => headers.indexOf(name.toLowerCase());

      // ── Row-level validation & mapping ───────────────────────────────────────
      const MANDATORY_FIELDS: Array<{ col: string; label: string }> = [
        { col: 'vehiclenumber', label: 'vehicleNumber' },
        { col: 'vehicletype',   label: 'vehicleType'   },
        { col: 'issuedate',     label: 'issueDate'     },
        { col: 'expirationdate',label: 'expirationDate'},
      ];

      const dataRows = rows.slice(1);
      const validRecords: Array<Partial<InstanceType<typeof PUC>>> = [];
      const errors: Array<{ row: number; issues: string[] }> = [];

      for (let r = 0; r < dataRows.length; r++) {
        const cells = dataRows[r];
        const rowNum = r + 2; // 1-based, +1 for header
        const issues: string[] = [];

        // Check mandatory fields are non-empty
        for (const { col, label } of MANDATORY_FIELDS) {
          const val = cells[idx(col)] ?? '';
          if (!val.trim()) issues.push(`${label} is required`);
        }

        // Validate dates
        const issueDateRaw      = cells[idx('issuedate')]      ?? '';
        const expirationDateRaw = cells[idx('expirationdate')] ?? '';
        const issueDate      = issueDateRaw      ? new Date(issueDateRaw)      : null;
        const expirationDate = expirationDateRaw ? new Date(expirationDateRaw) : null;

        if (issueDateRaw && isNaN(issueDate?.getTime())) {
          issues.push(`issueDate "${issueDateRaw}" is not a valid date`);
        }
        if (expirationDateRaw && isNaN(expirationDate?.getTime())) {
          issues.push(`expirationDate "${expirationDateRaw}" is not a valid date`);
        }

        if (issues.length > 0) {
          errors.push({ row: rowNum, issues });
          continue;
        }

        validRecords.push({
          vehicleNumber:  cells[idx('vehiclenumber')].trim(),
          vehicleType:    cells[idx('vehicletype')].trim(),
          documentType:   cells[idx('documenttype')]?.trim() || null,
          issueDate,
          expirationDate,
          userId,          // always use the authenticated user — ignore CSV userId
          deleted:        false,
        });
      }

      // ── Bulk insert ──────────────────────────────────────────────────────────
      let inserted = 0;
      if (validRecords.length > 0) {
        await PUC.bulkCreate(validRecords as Parameters<typeof PUC.bulkCreate>[0]);
        inserted = validRecords.length;
      }

      this.logger.log('info', `Import: ${inserted} inserted, ${errors.length} failed for user ${userId}`);

      return res.status(200).json({
        message: `Import complete. ${inserted} record(s) imported, ${errors.length} skipped.`,
        inserted,
        skipped: errors.length,
        errors,   // per-row details returned so the UI can surface them
      });
    } catch (error) {
      this.logger.log('error', error.message);
      return res.status(500).json({ error: error.message });
    }
  };
}
