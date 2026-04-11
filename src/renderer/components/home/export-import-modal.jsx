import React, { useState, useRef } from 'react';
import { useLazyExportPUCDocumentsQuery } from '../../redux/api/documents/documentApiSlice';
import toast from 'react-hot-toast';

// ─── tiny helpers ────────────────────────────────────────────────────────────

const Field = ({ label, id, type = 'text', placeholder, value, onChange }) => (
  <div className='export-field'>
    <label htmlFor={id} className='export-label'>
      {label}
    </label>
    <input
      id={id}
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className='export-input'
    />
  </div>
);

// ─── component ───────────────────────────────────────────────────────────────

export const ExportImportModal = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('export'); // 'export' | 'import'

  // --- export state ---
  const [filters, setFilters] = useState({
    vehicleNumber: '',
    vehicleType: '',
    documentType: '',
    issueDateFrom: '',
    issueDateTo: '',
    expirationDateFrom: '',
    expirationDateTo: '',
  });
  const [exporting, setExporting] = useState(false);
  const [triggerExport] = useLazyExportPUCDocumentsQuery();

  // --- import state ---
  const fileInputRef = useRef(null);
  const [importFile, setImportFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const setFilter = (key) => (val) => setFilters((prev) => ({ ...prev, [key]: val }));

  const hasFilters = Object.values(filters).some((v) => v.trim() !== '');

  const clearFilters = () =>
    setFilters({
      vehicleNumber: '',
      vehicleType: '',
      documentType: '',
      issueDateFrom: '',
      issueDateTo: '',
      expirationDateFrom: '',
      expirationDateTo: '',
    });

  const handleExport = async () => {
    setExporting(true);
    try {
      // strip empty values
      const activeFilters = Object.fromEntries(
        Object.entries(filters).filter(([, v]) => v.trim() !== '')
      );
      const result = await triggerExport(activeFilters).unwrap();

      // Trigger browser download
      const url = URL.createObjectURL(result);
      const a = document.createElement('a');
      a.href = url;
      a.download = `puc_export_${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      toast.success('CSV exported successfully!');
      onClose();
    } catch (err) {
      console.error('Export failed:', err);
      toast.error('Export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const handleFileDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer?.files?.[0];
    if (file && file.name.endsWith('.csv')) setImportFile(file);
    else toast.error('Please upload a valid .csv file');
  };

  if (!isOpen) return null;

  return (
    <>
      {/* ── Backdrop ── */}
      <div className='eim-backdrop' onClick={onClose} />

      {/* ── Drawer ── */}
      <div className={`eim-drawer ${isOpen ? 'eim-drawer--open' : ''}`}>
        {/* header */}
        <div className='eim-header'>
          <div className='eim-tabs'>
            <button
              id='tab-export'
              className={`eim-tab ${activeTab === 'export' ? 'eim-tab--active' : ''}`}
              onClick={() => setActiveTab('export')}
            >
              <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
                <path d='M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4' />
                <polyline points='7 10 12 15 17 10' />
                <line x1='12' y1='15' x2='12' y2='3' />
              </svg>
              Export
            </button>
            <button
              id='tab-import'
              className={`eim-tab ${activeTab === 'import' ? 'eim-tab--active' : ''}`}
              onClick={() => setActiveTab('import')}
            >
              <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
                <path d='M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4' />
                <polyline points='17 8 12 3 7 8' />
                <line x1='12' y1='3' x2='12' y2='15' />
              </svg>
              Import
            </button>
          </div>
          <button id='eim-close-btn' className='eim-close' onClick={onClose} aria-label='Close'>
            <svg width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
              <line x1='18' y1='6' x2='6' y2='18' /><line x1='6' y1='6' x2='18' y2='18' />
            </svg>
          </button>
        </div>

        {/* ═══════════════ EXPORT TAB ═══════════════ */}
        {activeTab === 'export' && (
          <div className='eim-body'>
            <div className='eim-section-header'>
              <div>
                <h3 className='eim-section-title'>Export PUC Data</h3>
                <p className='eim-section-sub'>
                  Apply optional filters below, or leave all fields empty to export everything.
                </p>
              </div>
              {hasFilters && (
                <button id='clear-filters-btn' className='eim-clear-btn' onClick={clearFilters}>
                  Clear filters
                </button>
              )}
            </div>

            <div className='eim-filter-grid'>
              {/* row 1 */}
              <Field
                id='filter-vehicle-number'
                label='Vehicle Number'
                placeholder='e.g. GJ01AB1234'
                value={filters.vehicleNumber}
                onChange={setFilter('vehicleNumber')}
              />
              <Field
                id='filter-vehicle-type'
                label='Vehicle Type'
                placeholder='e.g. Car, Bike'
                value={filters.vehicleType}
                onChange={setFilter('vehicleType')}
              />
              <Field
                id='filter-document-type'
                label='Document Type'
                placeholder='e.g. PUC, RC'
                value={filters.documentType}
                onChange={setFilter('documentType')}
              />

              {/* row 2 – date ranges */}
              <div className='eim-range-group'>
                <span className='eim-range-label'>Issue Date Range</span>
                <div className='eim-range-row'>
                  <Field
                    id='filter-issue-from'
                    label='From'
                    type='date'
                    value={filters.issueDateFrom}
                    onChange={setFilter('issueDateFrom')}
                  />
                  <Field
                    id='filter-issue-to'
                    label='To'
                    type='date'
                    value={filters.issueDateTo}
                    onChange={setFilter('issueDateTo')}
                  />
                </div>
              </div>

              <div className='eim-range-group'>
                <span className='eim-range-label'>Expiration Date Range</span>
                <div className='eim-range-row'>
                  <Field
                    id='filter-exp-from'
                    label='From'
                    type='date'
                    value={filters.expirationDateFrom}
                    onChange={setFilter('expirationDateFrom')}
                  />
                  <Field
                    id='filter-exp-to'
                    label='To'
                    type='date'
                    value={filters.expirationDateTo}
                    onChange={setFilter('expirationDateTo')}
                  />
                </div>
              </div>
            </div>

            {/* active filter pills */}
            {hasFilters && (
              <div className='eim-pills'>
                {Object.entries(filters)
                  .filter(([, v]) => v)
                  .map(([k, v]) => (
                    <span key={k} className='eim-pill'>
                      <span className='eim-pill-key'>{k}:</span> {v}
                      <button
                        className='eim-pill-remove'
                        onClick={() => setFilter(k)('')}
                        aria-label={`Remove ${k} filter`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
              </div>
            )}

            <div className='eim-footer'>
              <p className='eim-footer-hint'>
                {hasFilters
                  ? '⚡ Filtered export — only matching records will be included.'
                  : '📂 No filters applied — all your documents will be exported.'}
              </p>
              <button
                id='export-csv-btn'
                className='eim-primary-btn'
                onClick={handleExport}
                disabled={exporting}
              >
                {exporting ? (
                  <>
                    <span className='eim-spinner' />
                    Exporting…
                  </>
                ) : (
                  <>
                    <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
                      <path d='M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4' />
                      <polyline points='7 10 12 15 17 10' />
                      <line x1='12' y1='15' x2='12' y2='3' />
                    </svg>
                    Download CSV
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ═══════════════ IMPORT TAB ═══════════════ */}
        {activeTab === 'import' && (
          <div className='eim-body'>
            <div className='eim-section-header'>
              <div>
                <h3 className='eim-section-title'>Import PUC Data</h3>
                <p className='eim-section-sub'>
                  Upload a CSV file to bulk-import your PUC documents.
                </p>
              </div>
            </div>

            {/* drop zone */}
            <div
              id='import-drop-zone'
              className={`eim-dropzone ${isDragging ? 'eim-dropzone--drag' : ''} ${importFile ? 'eim-dropzone--filled' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleFileDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type='file'
                accept='.csv'
                className='eim-hidden'
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) setImportFile(f);
                }}
              />
              {importFile ? (
                <div className='eim-file-info'>
                  <div className='eim-file-icon'>
                    <svg width='32' height='32' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.5'>
                      <path d='M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z' />
                      <polyline points='14 2 14 8 20 8' />
                      <line x1='16' y1='13' x2='8' y2='13' />
                      <line x1='16' y1='17' x2='8' y2='17' />
                      <polyline points='10 9 9 9 8 9' />
                    </svg>
                  </div>
                  <p className='eim-file-name'>{importFile.name}</p>
                  <p className='eim-file-size'>{(importFile.size / 1024).toFixed(1)} KB</p>
                  <button
                    className='eim-file-remove'
                    onClick={(e) => { e.stopPropagation(); setImportFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                  >
                    Remove file
                  </button>
                </div>
              ) : (
                <>
                  <div className='eim-dz-icon'>
                    <svg width='40' height='40' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.5'>
                      <path d='M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4' />
                      <polyline points='17 8 12 3 7 8' />
                      <line x1='12' y1='3' x2='12' y2='15' />
                    </svg>
                  </div>
                  <p className='eim-dz-title'>{isDragging ? 'Drop it here!' : 'Drag & drop your CSV here'}</p>
                  <p className='eim-dz-sub'>or <span className='eim-dz-link'>click to browse</span></p>
                  <p className='eim-dz-hint'>Only .csv files are accepted</p>
                </>
              )}
            </div>

            {/* template download hint */}
            <div className='eim-template-hint'>
              <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
                <circle cx='12' cy='12' r='10' />
                <line x1='12' y1='8' x2='12' y2='12' />
                <line x1='12' y1='16' x2='12.01' y2='16' />
              </svg>
              Need the right format? Export your existing data first to use as a template.
            </div>

            <div className='eim-footer'>
              <p className='eim-footer-hint eim-coming-soon-badge'>
                🚧 Import feature coming soon
              </p>
              <button
                id='import-submit-btn'
                className='eim-primary-btn'
                disabled={!importFile}
                onClick={() => toast('Import coming soon! 🚧', { icon: '🔧' })}
              >
                <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
                  <path d='M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4' />
                  <polyline points='17 8 12 3 7 8' />
                  <line x1='12' y1='3' x2='12' y2='15' />
                </svg>
                Import Documents
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        /* ── Backdrop ── */
        .eim-backdrop {
          position: fixed; inset: 0; background: rgba(0,0,0,0.45);
          backdrop-filter: blur(2px); z-index: 40;
          animation: eim-fade-in 0.2s ease;
        }

        /* ── Drawer shell ── */
        .eim-drawer {
          position: fixed; bottom: 0; left: 50%; transform: translateX(-50%);
          width: min(780px, 96vw);
          max-height: 88vh;
          background: #fff;
          border-radius: 20px 20px 0 0;
          box-shadow: 0 -8px 40px rgba(0,0,0,0.18);
          z-index: 50;
          display: flex; flex-direction: column;
          animation: eim-slide-up 0.28s cubic-bezier(0.34,1.12,0.64,1);
          overflow: hidden;
        }

        /* ── Header ── */
        .eim-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 18px 24px 0;
          border-bottom: 1px solid #f0f0f0;
          flex-shrink: 0;
        }
        .eim-tabs { display: flex; gap: 4px; padding-bottom: 0; }
        .eim-tab {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 9px 18px; border-radius: 10px 10px 0 0;
          font-size: 0.875rem; font-weight: 500;
          color: #6b7280; background: transparent;
          border: none; border-bottom: 2px solid transparent;
          cursor: pointer; transition: all 0.15s;
        }
        .eim-tab:hover { color: #111; background: #f9f9f9; }
        .eim-tab--active {
          color: #111; font-weight: 600;
          border-bottom-color: #111;
          background: transparent;
        }
        .eim-close {
          width: 34px; height: 34px; border-radius: 50%;
          border: none; background: #f3f4f6; color: #374151;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: background 0.15s;
          margin-bottom: 8px;
        }
        .eim-close:hover { background: #e5e7eb; }

        /* ── Body ── */
        .eim-body {
          display: flex; flex-direction: column; gap: 20px;
          padding: 24px; overflow-y: auto; flex: 1;
        }

        /* ── Section header ── */
        .eim-section-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
        .eim-section-title { font-size: 1.1rem; font-weight: 700; color: #111; margin: 0 0 4px; }
        .eim-section-sub { font-size: 0.82rem; color: #6b7280; margin: 0; }
        .eim-clear-btn {
          flex-shrink: 0; font-size: 0.78rem; padding: 5px 12px;
          border: 1px solid #d1d5db; border-radius: 8px;
          background: #fff; color: #374151; cursor: pointer;
          transition: all 0.15s;
        }
        .eim-clear-btn:hover { background: #f9fafb; border-color: #9ca3af; }

        /* ── Filter grid ── */
        .eim-filter-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px 16px;
        }

        /* ── Field ── */
        .export-field { display: flex; flex-direction: column; gap: 5px; }
        .export-label { font-size: 0.78rem; font-weight: 500; color: #374151; }
        .export-input {
          width: 100%; padding: 8px 11px;
          border: 1px solid #e5e7eb; border-radius: 9px;
          font-size: 0.85rem; color: #111; background: #fafafa;
          outline: none; transition: border-color 0.15s, box-shadow 0.15s;
          box-sizing: border-box;
        }
        .export-input:focus { border-color: #111; box-shadow: 0 0 0 3px rgba(0,0,0,0.06); background: #fff; }

        /* ── Date range groups ── */
        .eim-range-group { grid-column: span 1; display: flex; flex-direction: column; gap: 6px; }
        .eim-range-label { font-size: 0.72rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #9ca3af; }
        .eim-range-row { display: flex; gap: 8px; }
        .eim-range-row .export-field { flex: 1; }

        /* ── Active filter pills ── */
        .eim-pills { display: flex; flex-wrap: wrap; gap: 6px; }
        .eim-pill {
          display: inline-flex; align-items: center; gap: 4px;
          padding: 3px 8px 3px 10px;
          background: #f0fdf4; border: 1px solid #bbf7d0;
          border-radius: 999px; font-size: 0.78rem; color: #166534;
        }
        .eim-pill-key { font-weight: 600; }
        .eim-pill-remove {
          margin-left: 2px; width: 16px; height: 16px; border-radius: 50%;
          border: none; background: #dcfce7; color: #166534;
          cursor: pointer; font-size: 0.9rem; line-height: 1;
          display: flex; align-items: center; justify-content: center;
          transition: background 0.1s;
        }
        .eim-pill-remove:hover { background: #bbf7d0; }

        /* ── Footer ── */
        .eim-footer {
          display: flex; align-items: center; justify-content: space-between;
          gap: 12px; padding-top: 16px;
          border-top: 1px solid #f0f0f0;
          flex-shrink: 0;
        }
        .eim-footer-hint { font-size: 0.8rem; color: #6b7280; margin: 0; flex: 1; }
        .eim-coming-soon-badge {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 5px 12px; border-radius: 999px;
          background: #fef9c3; color: #854d0e;
          font-weight: 500;
        }

        /* ── Primary button ── */
        .eim-primary-btn {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 10px 22px; border-radius: 11px;
          background: #111; color: #fff;
          font-size: 0.875rem; font-weight: 600;
          border: none; cursor: pointer;
          transition: background 0.15s, transform 0.1s;
          white-space: nowrap; flex-shrink: 0;
        }
        .eim-primary-btn:hover:not(:disabled) { background: #333; transform: translateY(-1px); }
        .eim-primary-btn:disabled { background: #9ca3af; cursor: not-allowed; transform: none; }

        /* ── Spinner ── */
        .eim-spinner {
          width: 14px; height: 14px; border-radius: 50%;
          border: 2px solid rgba(255,255,255,0.35);
          border-top-color: #fff;
          animation: eim-spin 0.6s linear infinite;
          display: inline-block;
        }

        /* ── Drop zone ── */
        .eim-dropzone {
          border: 2px dashed #d1d5db; border-radius: 14px;
          background: #fafafa; padding: 40px 20px;
          text-align: center; cursor: pointer;
          transition: all 0.2s;
        }
        .eim-dropzone:hover, .eim-dropzone--drag {
          border-color: #111; background: #f3f4f6;
        }
        .eim-dropzone--filled { border-color: #16a34a; background: #f0fdf4; }
        .eim-dz-icon { color: #9ca3af; margin-bottom: 12px; }
        .eim-dropzone--drag .eim-dz-icon { color: #374151; }
        .eim-dz-title { font-size: 0.95rem; font-weight: 600; color: #374151; margin: 0 0 4px; }
        .eim-dropzone--drag .eim-dz-title { color: #111; }
        .eim-dz-sub { font-size: 0.82rem; color: #6b7280; margin: 0 0 6px; }
        .eim-dz-link { color: #111; font-weight: 600; text-decoration: underline; }
        .eim-dz-hint { font-size: 0.75rem; color: #9ca3af; margin: 0; }
        .eim-hidden { display: none; }

        /* file info */
        .eim-file-info { display: flex; flex-direction: column; align-items: center; gap: 6px; }
        .eim-file-icon { color: #16a34a; }
        .eim-file-name { font-size: 0.9rem; font-weight: 600; color: #166534; margin: 0; }
        .eim-file-size { font-size: 0.78rem; color: #6b7280; margin: 0; }
        .eim-file-remove {
          margin-top: 4px; font-size: 0.78rem; padding: 4px 12px;
          border: 1px solid #fca5a5; border-radius: 8px;
          background: #fff; color: #dc2626; cursor: pointer;
          transition: all 0.15s;
        }
        .eim-file-remove:hover { background: #fee2e2; }

        /* template hint */
        .eim-template-hint {
          display: flex; align-items: center; gap: 6px;
          font-size: 0.78rem; color: #6b7280;
          background: #f9fafb; border: 1px solid #e5e7eb;
          border-radius: 9px; padding: 10px 14px;
        }

        /* ── Animations ── */
        @keyframes eim-fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes eim-slide-up { from { transform: translateX(-50%) translateY(100%); } to { transform: translateX(-50%) translateY(0); } }
        @keyframes eim-spin { to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
};
