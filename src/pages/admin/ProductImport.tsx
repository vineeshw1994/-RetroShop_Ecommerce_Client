import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiAlertCircle, FiCheckCircle, FiDownload, FiInfo, FiUploadCloud } from 'react-icons/fi';
import { useAppDispatch } from '@/store';
import { pushToast } from '@/store/slices/uiSlice';
import { adminProductImportService } from '@/services/admin.service';
import { getErrorMessage } from '@/lib/api';
import { useDocumentTitle } from '@/hooks';
import { PageHeader } from '@/components/admin';
import { Badge, Button } from '@/components/ui';

interface ImportSummary {
  totalRows: number;
  created: number;
  skipped: number;
  errors: { row: number; sku: string; message: string }[];
  warnings: { row: number; sku: string; message: string }[];
}

const ProductImport = () => {
  useDocumentTitle('Import products');

  const dispatch = useAppDispatch();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [summary, setSummary] = useState<ImportSummary | null>(null);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await adminProductImportService.downloadTemplate();
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
      const response = await adminProductImportService.import(file);
      setSummary(response.data);
      dispatch(pushToast(response.message || 'Import finished', response.data.created ? 'success' : 'warning'));
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
        title="Import products"
        description="Upload an Excel sheet to add many products at once. Start with the template below."
        breadcrumbs={[
          { label: 'Dashboard', to: '/admin' },
          { label: 'Products', to: '/admin/products' },
          { label: 'Import' },
        ]}
        actions={
          <Link to="/admin/products">
            <Button variant="outline">Back to products</Button>
          </Link>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="card space-y-5 p-5">
          <div>
            <h2 className="text-base font-bold text-ink-900">1. Download the template</h2>
            <p className="mt-1 text-sm text-ink-500">
              The workbook includes 15 ready-made sample products across your sub-categories, plus a
              category reference sheet.
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
            <h2 className="text-base font-bold text-ink-900">2. Prepare your images</h2>
            <p className="mt-1 text-sm text-ink-500">
              Rename your 15 images to match the <code className="text-xs">cardImage</code> column
              (for example <code className="text-xs">product-01.jpg</code> through{' '}
              <code className="text-xs">product-15.jpg</code>), then copy them into:
            </p>
            <p className="mt-2 rounded-lg bg-ink-50 px-3 py-2 font-mono text-xs text-ink-700">
              ecommerce_server/uploads/products/
            </p>
          </div>

          <div className="border-t border-ink-100 pt-5">
            <h2 className="text-base font-bold text-ink-900">3. Upload the completed sheet</h2>
            <p className="mt-1 text-sm text-ink-500">
              Keep the header row unchanged. Use sub-category slugs such as{' '}
              <code className="text-xs">cables</code>, <code className="text-xs">nintendo</code>,{' '}
              <code className="text-xs">phones</code>.
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
              Import products
            </Button>
          </div>
        </section>

        <aside className="space-y-5">
          <section className="card p-5">
            <p className="flex items-start gap-2 text-sm text-blue-800">
              <FiInfo className="mt-0.5 shrink-0" size={15} />
              <span>
                Products are created inactive if you set <strong>isActive</strong> to no. Duplicate
                SKUs are skipped with an error report.
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
                        Row {entry.row} · {entry.sku}: {entry.message}
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
                        Row {entry.row} · {entry.sku}: {entry.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {summary.created > 0 && (
                <Link to="/admin/products" className="mt-4 inline-block">
                  <Button variant="outline" size="sm">
                    View products
                  </Button>
                </Link>
              )}
            </section>
          )}

          {!summary && (
            <section className="card p-5 text-sm text-ink-500">
              <p className="font-semibold text-ink-800">Your category slugs</p>
              <ul className="mt-3 space-y-1 text-xs">
                <li>cables, controllers, retro</li>
                <li>nintendo, playstation-2, xbox-2</li>
                <li>audio, laptops, phones, tablets</li>
              </ul>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
};

export default ProductImport;
