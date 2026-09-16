import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiAlertCircle, FiCheckCircle, FiDownload, FiInfo, FiUploadCloud } from 'react-icons/fi';
import { useAppDispatch } from '@/store';
import { pushToast } from '@/store/slices/uiSlice';
import { adminCategoryImportService } from '@/services/admin.service';
import { getErrorMessage } from '@/lib/api';
import { useDocumentTitle } from '@/hooks';
import { PageHeader } from '@/components/admin';
import { Badge, Button } from '@/components/ui';

interface ImportSummary {
  totalRows: number;
  created: number;
  skipped: number;
  errors: { row: number; name: string; message: string }[];
  warnings: { row: number; name: string; message: string }[];
}

const CategoryImport = () => {
  useDocumentTitle('Import categories');

  const dispatch = useAppDispatch();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [summary, setSummary] = useState<ImportSummary | null>(null);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await adminCategoryImportService.downloadTemplate();
      dispatch(pushToast('Template downloaded', 'success'));
    } catch (caught) {
      dispatch(pushToast(getErrorMessage(caught), 'error'));
    } finally {
      setDownloading(false);
    }
  };

  const handleImport = async () => {
    if (!file) {
      dispatch(pushToast('Choose an Excel file first', 'warning'));
      return;
    }

    setUploading(true);
    setSummary(null);

    try {
      const response = await adminCategoryImportService.import(file);
      setSummary(response.data);
      dispatch(
        pushToast(response.message || 'Import finished', response.data.created ? 'success' : 'warning')
      );
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (caught) {
      dispatch(pushToast(getErrorMessage(caught), 'error'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Import categories"
        description="Upload an Excel sheet to create parent categories and sub-categories in one go."
        breadcrumbs={[
          { label: 'Dashboard', to: '/admin' },
          { label: 'Categories', to: '/admin/categories' },
          { label: 'Import' },
        ]}
        actions={
          <Link to="/admin/categories">
            <Button variant="outline">Back to categories</Button>
          </Link>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="card space-y-5 p-5">
          <div>
            <h2 className="text-base font-bold text-ink-900">1. Download the template</h2>
            <p className="mt-1 text-sm text-ink-500">
              The workbook includes 4 parent categories and 10 sub-categories ready to import, matching
              the product import template slugs.
            </p>
            <Button
              className="mt-4"
              variant="outline"
              loading={downloading}
              onClick={() => void handleDownload()}
              leftIcon={<FiDownload size={15} />}
            >
              Download Excel template
            </Button>
          </div>

          <div className="border-t border-ink-100 pt-5">
            <h2 className="text-base font-bold text-ink-900">2. Fill in your categories</h2>
            <p className="mt-1 text-sm text-ink-500">
              Leave <code className="text-xs">parentSlug</code> empty for top-level categories. For
              sub-categories, set <code className="text-xs">parentSlug</code> to the parent&apos;s slug
              (for example <code className="text-xs">cables</code> →{' '}
              <code className="text-xs">accessories</code>).
            </p>
            <p className="mt-2 text-sm text-ink-500">
              Optional category images go in:
            </p>
            <p className="mt-2 rounded-lg bg-ink-50 px-3 py-2 font-mono text-xs text-ink-700">
              ecommerce_server/uploads/categories/
            </p>
          </div>

          <div className="border-t border-ink-100 pt-5">
            <h2 className="text-base font-bold text-ink-900">3. Upload the completed sheet</h2>
            <p className="mt-1 text-sm text-ink-500">
              Keep the header row unchanged. Parent rows are processed before sub-categories.
            </p>

            <div className="mt-4 rounded-xl border border-dashed border-ink-200 bg-ink-50/70 px-4 py-8 text-center">
              <FiUploadCloud className="mx-auto text-ink-400" size={28} />
              <p className="mt-2 text-sm font-semibold text-ink-700">
                {file ? file.name : 'Choose your .xlsx or .csv file'}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => fileInputRef.current?.click()}
              >
                Select file
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
                hidden
                onChange={(event) => setFile(event.target.files?.[0] || null)}
              />
            </div>

            <Button
              className="mt-4"
              loading={uploading}
              onClick={() => void handleImport()}
              leftIcon={<FiUploadCloud size={15} />}
            >
              Import categories
            </Button>
          </div>
        </section>

        <aside className="space-y-5">
          <section className="card p-5">
            <p className="flex items-start gap-2 text-sm text-blue-800">
              <FiInfo className="mt-0.5 shrink-0" size={15} />
              <span>
                Categories nest one level deep only. Duplicate slugs are skipped. Import categories
                before products so <strong>categorySlug</strong> values exist.
              </span>
            </p>
          </section>

          {summary && (
            <section className="card p-5">
              <div className="flex items-center gap-2">
                <FiCheckCircle className="text-emerald-600" size={18} />
                <h2 className="text-base font-bold text-ink-900">Import result</h2>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Badge tone="success">{summary.created} created</Badge>
                <Badge tone="neutral">{summary.totalRows} rows</Badge>
                {summary.skipped > 0 && <Badge tone="warning">{summary.skipped} skipped</Badge>}
              </div>

              {summary.warnings.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-amber-700">Warnings</p>
                  <ul className="mt-2 max-h-40 space-y-2 overflow-y-auto text-xs text-amber-800">
                    {summary.warnings.map((entry, index) => (
                      <li key={`${entry.row}-${index}`} className="rounded-lg bg-amber-50 px-3 py-2">
                        Row {entry.row} · {entry.name}: {entry.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {summary.errors.length > 0 && (
                <div className="mt-4">
                  <p className="flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-rose-700">
                    <FiAlertCircle size={13} />
                    Errors
                  </p>
                  <ul className="mt-2 max-h-56 space-y-2 overflow-y-auto text-xs text-rose-800">
                    {summary.errors.map((entry, index) => (
                      <li key={`${entry.row}-${index}`} className="rounded-lg bg-rose-50 px-3 py-2">
                        Row {entry.row} · {entry.name}: {entry.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {summary.created > 0 && (
                <Link to="/admin/categories" className="mt-4 inline-block">
                  <Button variant="outline" size="sm">
                    View categories
                  </Button>
                </Link>
              )}
            </section>
          )}

          {!summary && (
            <section className="card p-5 text-sm text-ink-500">
              <p className="font-semibold text-ink-800">Sample structure</p>
              <ul className="mt-3 space-y-2 text-xs">
                <li>
                  <strong>Parents:</strong> accessories, consoles, games, tech
                </li>
                <li>
                  <strong>Sub-categories:</strong> cables, controllers, retro, nintendo,
                  playstation-2, xbox-2, audio, laptops, phones, tablets
                </li>
              </ul>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
};

export default CategoryImport;
