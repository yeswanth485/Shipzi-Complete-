'use client'
import { useState, useRef, useCallback, Fragment } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Papa from 'papaparse'
import { supabase } from '@/lib/supabase'
import { useUser } from '@/context/UserContext'
import { Upload, ChevronDown, ChevronUp, Download, Eye, AlertCircle, CheckCircle } from 'lucide-react'
import {
  CatalogBox,
  CSVRow,
  OptimizationResult,
} from '@/lib/types'
import {
  type BulkResult,
} from '@/lib/optimization-engine'

type Status = 'idle' | 'parsing' | 'processing' | 'saving' | 'complete' | 'error'

const CSV_COLUMNS = [
  { name: 'product_name',     type: 'text',   example: 'Wireless Earbuds', desc: 'Product identifier' },
  { name: 'product_length',   type: 'number', example: '12.5',            desc: 'Product length (cm)' },
  { name: 'product_width',    type: 'number', example: '8.0',             desc: 'Product width (cm)' },
  { name: 'product_height',   type: 'number', example: '6.5',             desc: 'Product height (cm)' },
  { name: 'used_box_length',  type: 'number', example: '20',              desc: 'Current box length (cm)' },
  { name: 'used_box_width',   type: 'number', example: '15',              desc: 'Current box width (cm)' },
  { name: 'used_box_height',  type: 'number', example: '10',              desc: 'Current box height (cm)' },
  { name: 'fragility_score',  type: 'number', example: '7',               desc: '0 (robust) – 10 (very fragile)' },
  { name: 'used_box_price',   type: 'number', example: '1.40',            desc: 'Cost of current box ($)' },
  { name: 'shipping_zone',    type: 'text',   example: 'Zone 3',          desc: 'Zone 1–8 or International' },
]

const FIT_STATUS_BADGE: Record<string, string> = {
  optimized: 'badge-delivered',
  same_box:  'badge-optimized',
  no_fit:    'badge-pending',
  error:     'badge-pending',
}

const PROCESSING_STEPS = [
  'Parsing CSV data',
  'Loading box catalog',
  'Validating all rows',
  'Running FFD optimization',
  'Calculating savings & DIM weight',
  'Saving results to database',
]

function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="w-full">
      <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
        <span>Processing {value.toLocaleString()} / {max.toLocaleString()} rows</span>
        <span>{pct}%</span>
      </div>
      <div className="h-2 rounded-full" style={{ background: 'var(--border-subtle)' }}>
        <div className="h-2 rounded-full transition-all duration-300"
          style={{ width: `${pct}%`, background: 'var(--accent-primary)' }} />
      </div>
    </div>
  )
}

export default function OptimizePage() {
  const { companyId, firebaseUser } = useUser()
  const [rawRows, setRawRows] = useState<CSVRow[]>([])
  const [fileName, setFileName] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [status, setStatus] = useState<Status>('idle')
  const [bulkResult, setBulkResult] = useState<BulkResult | null>(null)
  const [runId, setRunId] = useState<string | null>(null)
  const [currentStep, setCurrentStep] = useState(0)
  const [processedRows, setProcessedRows] = useState(0)
  const [expandedRow, setExpandedRow] = useState<number | null>(null)
  const [showDocs, setShowDocs] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback((file: File) => {
    if (!file.name.endsWith('.csv')) {
      setErrorMessage('Please upload a .csv file')
      return
    }
    setFileName(file.name)
    setStatus('parsing')
    setErrorMessage('')

    Papa.parse<CSVRow>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h: string) => h.trim().toLowerCase().replace(/\s+/g, '_'),
      complete: ({ data }: { data: CSVRow[] }) => {
        setRawRows(data)
        setStatus('idle')
      },
      error: (err: Error) => {
        setErrorMessage(`CSV parse error: ${err.message}`)
        setStatus('error')
      },
    })
  }, [])

  const downloadSampleCSV = () => {
    const header = CSV_COLUMNS.map(c => c.name).join(',')
    const rows = [
      header,
      'Wireless Earbuds,12,8,6,20,15,10,8,1.40,Zone 2',
      'Phone Case,18,10,3,25,20,12,2,0.85,Zone 1',
      'Smart Watch,14,12,7,30,20,15,6,2.20,Zone 3',
      'LED Light Strip,50,5,3,55,10,8,1,1.80,Zone 4',
      'Ceramic Mug,10,10,12,25,20,20,9,2.20,Zone 2',
    ].join('\n')
    const blob = new Blob([rows], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'shipzi_sample.csv'
    a.click()
  }

  const downloadResultsCSV = () => {
    if (!bulkResult?.results?.length) return
    const header = [
      'product_name','original_box_dimensions','optimized_box_dimensions',
      'original_box_price','optimized_box_price','shipping_zone',
      'savings','fit_status','optimization_reason',
    ].join(',')
    const rows = bulkResult.results.map(r =>
      [
        `"${r.product_name}"`,
        `"${r.original_box_dimensions}"`,
        `"${r.optimized_box_dimensions}"`,
        r.original_box_price.toFixed(2),
        r.optimized_box_price.toFixed(2),
        `"${r.shipping_zone}"`,
        r.savings.toFixed(2),
        r.fit_status,
        `"${r.optimization_reason.replace(/"/g, "'")}"`,
      ].join(',')
    )
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `shipzi_results_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
  }

  const fetchWithRetry = async (url: string, options: RequestInit, retries = 3, delay = 5000): Promise<Response> => {
    let lastError: Error | null = null
    for (let i = 0; i < retries; i++) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 120000) // 2 min timeout for Render cold start
        const response = await fetch(url, { ...options, signal: controller.signal })
        clearTimeout(timeoutId)
        return response
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err))
        if (i < retries - 1) {
          console.warn(`Retry ${i + 1}/${retries} for ${url}: ${lastError.message}`)
          await new Promise(r => setTimeout(r, delay))
        }
      }
    }
    throw lastError || new Error('Max retries reached')
  }

  const runOptimization = async () => {
    if (!companyId || !rawRows.length) return
    setStatus('processing')
    setCurrentStep(0)
    setProcessedRows(0)
    setErrorMessage('')

    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_API_URL
      if (!backendUrl) {
        throw new Error(
          'Backend URL not configured. Set NEXT_PUBLIC_BACKEND_API_URL in your Vercel environment variables to your Render backend URL (e.g. https://your-app.onrender.com).'
        )
      }

      // Step 0 — Wake up backend (Render free tier sleeps after inactivity)
      setCurrentStep(0)
      setErrorMessage('Connecting to backend (may take 30–60s if server was sleeping)...')
      try {
        const healthResp = await fetchWithRetry(`${backendUrl}/health`, { method: 'GET' }, 3, 10000)
        const healthData = await healthResp.json().catch(() => null)
        console.log('[OPTIMIZE] Backend health:', healthData)
      } catch (healthErr) {
        const msg = healthErr instanceof Error ? healthErr.message : String(healthErr)
        throw new Error(
          `Cannot reach backend at ${backendUrl}.\n\nPossible causes:\n• Backend is not deployed or is sleeping (Render free tier)\n• CORS is blocking this request\n• Network error: ${msg}\n\nCheck your Render backend logs and ensure the URL is correct (no trailing slash).`
        )
      }
      setErrorMessage('')

      // Step 1 — Create optimization run record
      setCurrentStep(1)
      const { data: runData, error: runError } = await supabase
        .from('optimization_runs')
        .insert({
          company_id: companyId,
          user_id: firebaseUser?.uid,
          total_products: rawRows.length,
          status: 'processing',
          run_name: `Bulk run — ${rawRows.length} rows — ${new Date().toLocaleString()}`,
        })
        .select('id')
        .single()

      if (runError || !runData) {
        throw new Error(`Failed to create optimization run in database: ${runError?.message ?? 'No data returned'}. Check that the optimization_runs table exists and your user has INSERT permission.`)
      }
      const currentRunId = runData.id as string
      setRunId(currentRunId)

      // Step 2 — Send to backend API
      setCurrentStep(2)
      console.log(`[OPTIMIZE] Sending ${rawRows.length} rows to ${backendUrl}/api/optimize`)

      const response = await fetchWithRetry(`/api/optimize/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rows: rawRows,
          mode: 'single',
          catalog_id: 'default_catalog',
          company_id: companyId,
          run_id: currentRunId,
        }),
      }, 3, 5000)

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        const errMsg = errData.error || `Backend returned HTTP ${response.status}`
        throw new Error(`Optimization failed: ${errMsg}`)
      }

      setCurrentStep(5)
      const data = await response.json()
      setProcessedRows(rawRows.length)

      setBulkResult(data)
      setStatus('complete')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unexpected error during optimization'
      console.error('[OPTIMIZE] Error:', msg)
      setErrorMessage(msg)
      setStatus('error')
      if (runId) {
        try {
          await supabase.from('optimization_runs').update({ status: 'failed' }).eq('id', runId)
        } catch { /* ignore */ }
      }
    }
  }

  const previewRows = rawRows.slice(0, 5)

  return (
    <div className="max-w-7xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* ── LEFT PANEL ── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Upload Zone */}
          <div className="glass-card p-6">
            <h2 className="font-syne font-bold text-white mb-1">Upload Product CSV</h2>
            <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>Supports 2,000–10,000 rows per batch</p>

            <div
              onClick={() => fileRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={e => {
                e.preventDefault()
                setIsDragging(false)
                const f = e.dataTransfer.files[0]
                if (f) handleFile(f)
              }}
              className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-300"
              style={{
                borderColor: isDragging ? 'var(--accent-primary)' : 'var(--border-subtle)',
                background: isDragging ? 'rgba(37,99,235,0.06)' : 'var(--bg-elevated)',
                minHeight: 180,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12,
              }}>
              <input
                ref={fileRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
              />
              <Upload size={32} color={isDragging ? 'var(--accent-primary)' : 'var(--text-muted)'} />
              <div>
                <p className="font-medium text-white text-sm">Drop CSV here or click to browse</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Accepts .csv files only</p>
              </div>
              {rawRows.length > 0 && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium"
                  style={{ background: 'rgba(16,185,129,0.1)', color: 'var(--accent-success)', border: '1px solid rgba(16,185,129,0.3)' }}>
                  <CheckCircle size={12} /> {fileName} · {rawRows.length.toLocaleString()} rows
                </div>
              )}
            </div>

            {errorMessage && (
              <div className="mt-3 flex items-start gap-2 p-3 rounded-xl text-xs whitespace-pre-line"
                style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', color: 'var(--accent-danger)' }}>
                <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}
          </div>

          {/* CSV Schema Docs */}
          <div className="glass-card overflow-hidden">
            <button
              onClick={() => setShowDocs(!showDocs)}
              className="w-full px-6 py-4 flex items-center justify-between text-left"
              style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
              <span className="font-medium text-sm text-white">Required CSV Columns</span>
              {showDocs ? <ChevronUp size={16} color="var(--text-muted)" /> : <ChevronDown size={16} color="var(--text-muted)" />}
            </button>
            <AnimatePresence>
              {showDocs && (
                <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                  <div className="px-6 pb-6">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                            {['Column', 'Type', 'Example', 'Notes'].map(h => (
                              <th key={h} className="text-left py-2 pr-3 uppercase tracking-wide" style={{ color: 'var(--text-muted)', fontSize: 10 }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {CSV_COLUMNS.map(col => (
                            <tr key={col.name} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                              <td className="py-2 pr-3 font-mono" style={{ color: 'var(--accent-secondary)', fontSize: 10 }}>{col.name}</td>
                              <td className="py-2 pr-3" style={{ color: 'var(--text-muted)' }}>{col.type}</td>
                              <td className="py-2 pr-3" style={{ color: 'var(--text-secondary)' }}>{col.example}</td>
                              <td className="py-2" style={{ color: 'var(--text-secondary)' }}>{col.desc}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <button
                      onClick={downloadSampleCSV}
                      className="btn-ghost mt-4 flex items-center gap-2"
                      style={{ fontSize: 12, padding: '8px 16px' }}>
                      <Download size={14} /> Download Sample CSV
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Preview + Run */}
          {rawRows.length > 0 && status !== 'processing' && status !== 'saving' && (
            <div className="glass-card p-6">
              <p className="text-sm font-semibold text-white mb-3">
                {rawRows.length.toLocaleString()} rows ready to optimize
              </p>

              {/* Data preview */}
              <div className="overflow-x-auto mb-4 rounded-lg" style={{ border: '1px solid var(--border-subtle)' }}>
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-subtle)' }}>
                      {['Product', 'Product dims', 'Used box', 'Frag.', 'Zone'].map(h => (
                        <th key={h} className="text-left py-2 px-2" style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td className="py-2 px-2 max-w-[100px] truncate" style={{ color: 'var(--text-primary)' }}>{row.product_name}</td>
                        <td className="py-2 px-2" style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                          {row.product_length}×{row.product_width}×{row.product_height}
                        </td>
                        <td className="py-2 px-2" style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                          {row.used_box_length}×{row.used_box_width}×{row.used_box_height}
                        </td>
                        <td className="py-2 px-2" style={{ color: 'var(--text-secondary)' }}>{row.fragility_score}</td>
                        <td className="py-2 px-2" style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{row.shipping_zone}</td>
                      </tr>
                    ))}
                    {rawRows.length > 5 && (
                      <tr><td colSpan={5} className="py-2 px-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                        + {(rawRows.length - 5).toLocaleString()} more rows...
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              <button
                onClick={runOptimization}
                disabled={status === 'parsing'}
                className="btn-primary w-full justify-center"
                style={{ padding: '14px' }}>
                ⚡ Optimize {rawRows.length.toLocaleString()} Shipments
              </button>
            </div>
          )}
        </div>

        {/* ── RIGHT PANEL ── */}
        <div className="lg:col-span-3">

          {/* IDLE */}
          {status === 'idle' && rawRows.length === 0 && (
            <div className="glass-card flex flex-col items-center justify-center text-center p-12" style={{ minHeight: 420 }}>
              <div className="text-6xl mb-4">📦</div>
              <h3 className="font-syne text-xl font-bold text-white mb-2">Ready to Optimize</h3>
              <p className="mb-2" style={{ color: 'var(--text-secondary)' }}>Upload a CSV with your product & box data.</p>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Supports bulk batches of 2,000–10,000 rows.</p>
            </div>
          )}

          {/* PROCESSING */}
          {(status === 'processing' || status === 'saving') && (
            <div className="glass-card p-10 flex flex-col items-center text-center" style={{ minHeight: 420 }}>
              <div className="relative w-20 h-20 mb-8">
                <div className="absolute inset-0 rounded-full border-4 animate-spin"
                  style={{ borderColor: 'var(--border-subtle)', borderTopColor: 'var(--accent-primary)' }} />
                <div className="absolute inset-3 flex items-center justify-center text-2xl">⚡</div>
              </div>
              <h3 className="font-syne text-xl font-bold text-white mb-1">
                Optimizing {rawRows.length.toLocaleString()} Shipments
              </h3>
              <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
                AI is selecting the smallest valid box for every row
              </p>

              <div className="w-full max-w-sm mb-6">
                <ProgressBar value={processedRows} max={rawRows.length} />
              </div>

              <div className="w-full max-w-sm space-y-2">
                {PROCESSING_STEPS.map((step, i) => (
                  <div key={i} className="flex items-center gap-3 text-left">
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0 transition-all duration-300"
                      style={{
                        background: i < currentStep ? 'rgba(16,185,129,0.2)' : i === currentStep ? 'rgba(37,99,235,0.2)' : 'var(--bg-elevated)',
                        color: i < currentStep ? 'var(--accent-success)' : i === currentStep ? 'var(--accent-primary)' : 'var(--text-muted)',
                        border: `1px solid ${i < currentStep ? 'rgba(16,185,129,0.5)' : i === currentStep ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
                      }}>
                      {i < currentStep ? '✓' : i === currentStep ? '●' : ''}
                    </div>
                    <span className="text-sm" style={{ color: i <= currentStep ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                      {step}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ERROR */}
          {status === 'error' && (
            <div className="glass-card p-8 flex flex-col items-center text-center" style={{ minHeight: 300 }}>
              <AlertCircle size={40} color="var(--accent-danger)" className="mb-4" />
              <h3 className="font-syne text-xl font-bold text-white mb-2">Optimization Failed</h3>
              <p className="text-sm mb-4 max-w-md whitespace-pre-line" style={{ color: 'var(--text-secondary)' }}>{errorMessage}</p>
              {errorMessage.includes('NEXT_PUBLIC_BACKEND_API_URL') && (
                <div className="text-xs p-4 rounded-xl max-w-md text-left mb-4"
                  style={{ background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.3)', color: 'var(--text-secondary)' }}>
                  <p className="font-semibold mb-2" style={{ color: 'var(--accent-primary)' }}>How to fix:</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Go to Vercel → Settings → Environment Variables</li>
                    <li>Add: <code className="px-1 rounded" style={{ background: 'var(--bg-elevated)' }}>NEXT_PUBLIC_BACKEND_API_URL</code></li>
                    <li>Value: your Render backend URL (e.g. <code className="px-1 rounded" style={{ background: 'var(--bg-elevated)' }}>https://your-app.onrender.com</code>)</li>
                    <li>Redeploy the frontend</li>
                  </ol>
                </div>
              )}
              {errorMessage.includes('Cannot reach backend') && (
                <div className="text-xs p-4 rounded-xl max-w-md text-left mb-4"
                  style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', color: 'var(--text-secondary)' }}>
                  <p className="font-semibold mb-2" style={{ color: 'var(--accent-warning)' }}>Backend not reachable:</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Check your Render backend is deployed and active (not sleeping)</li>
                    <li>Verify the URL is correct (no trailing slash)</li>
                    <li>Check Render logs for startup errors</li>
                    <li>Verify CORS is not blocking this request</li>
                    <li>Render free tier sleeps after 15 min — first request takes 30–60s</li>
                  </ol>
                </div>
              )}
              <button onClick={() => { setStatus('idle'); setErrorMessage('') }} className="btn-ghost">Try Again</button>
            </div>
          )}

          {/* COMPLETE */}
          {status === 'complete' && bulkResult && (
            <div className="space-y-4">

              {/* Summary Cards */}
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: 'Total Rows',    value: (bulkResult.summary?.total ?? 0).toLocaleString(),     color: 'var(--text-primary)' },
                  { label: 'Optimized',     value: (bulkResult.summary?.optimized ?? 0).toLocaleString(), color: 'var(--accent-success)' },
                  { label: 'Total Savings', value: `$${(bulkResult.summary?.total_savings ?? 0).toFixed(2)}`, color: 'var(--accent-success)' },
                  { label: 'Avg Utilization', value: `${bulkResult.summary?.avg_utilization ?? 0}%`,    color: 'var(--accent-primary)' },
                ].map(m => (
                  <div key={m.label} className="glass-card p-4 text-center">
                    <div className="font-syne font-bold text-lg" style={{ color: m.color }}>{m.value}</div>
                    <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{m.label}</div>
                  </div>
                ))}
              </div>

              {/* Invalid rows warning */}
              {(bulkResult.invalidRows?.length ?? 0) > 0 && (
                <div className="flex items-start gap-3 p-4 rounded-xl"
                  style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)' }}>
                  <AlertCircle size={16} color="var(--accent-warning)" className="flex-shrink-0 mt-0.5" />
                  <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    <span className="font-semibold" style={{ color: 'var(--accent-warning)' }}>
                      {(bulkResult.invalidRows?.length ?? 0)} rows skipped
                    </span>
                    {' '}due to validation errors (missing fields or invalid dimensions). These rows were not processed. Fix the source data and re-upload.
                  </div>
                </div>
              )}

              {/* Results Table */}
              <div className="glass-card overflow-hidden">
                <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)' }}>
                  <h3 className="font-syne font-semibold text-white text-sm">
                    Results — {(bulkResult.results?.length ?? 0).toLocaleString()} rows optimized
                  </h3>
                  <div className="flex gap-2">
                    <button onClick={downloadResultsCSV} className="btn-ghost flex items-center gap-1.5" style={{ fontSize: 12, padding: '6px 12px' }}>
                      <Download size={12} /> Export
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto" style={{ maxHeight: 460, overflowY: 'auto' }}>
                  <table className="w-full text-sm">
                    <thead className="sticky top-0" style={{ background: 'var(--bg-surface)' }}>
                      <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        {['Product', 'Original Box', 'Optimized Box', 'Savings', 'Status', ''].map(h => (
                          <th key={h} className="text-left py-3 px-4 text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(bulkResult.results ?? []).map((r, i) => (
                        <Fragment key={r.row_index}>
                          <tr
                            onClick={() => setExpandedRow(expandedRow === i ? null : i)}
                            className="cursor-pointer transition-colors"
                            style={{
                              borderBottom: '1px solid var(--border-subtle)',
                              background: expandedRow === i ? 'rgba(37,99,235,0.05)' : 'transparent',
                            }}
                            onMouseEnter={e => { if (expandedRow !== i) e.currentTarget.style.background = 'rgba(255,255,255,0.02)' }}
                            onMouseLeave={e => { if (expandedRow !== i) e.currentTarget.style.background = 'transparent' }}>
                            <td className="py-3 px-4 font-medium max-w-[140px]" style={{ color: 'var(--text-primary)' }}>
                              <div className="truncate">{r.product_name}</div>
                            </td>
                            <td className="py-3 px-4 text-xs" style={{ color: 'var(--text-secondary)' }}>
                              <div>{r.original_box_dimensions}cm</div>
                              <div style={{ color: 'var(--text-muted)' }}>${r.original_box_price.toFixed(2)}</div>
                            </td>
                            <td className="py-3 px-4 text-xs">
                              <div style={{ color: r.fit_status === 'optimized' ? 'var(--accent-success)' : 'var(--text-secondary)' }}>
                                {r.optimized_box_dimensions}cm
                              </div>
                              <div style={{ color: 'var(--text-muted)' }}>${r.optimized_box_price.toFixed(2)}</div>
                            </td>
                            <td className="py-3 px-4 font-semibold text-sm"
                              style={{ color: r.savings > 0 ? 'var(--accent-success)' : 'var(--text-muted)' }}>
                              {r.savings > 0 ? `+$${r.savings.toFixed(2)}` : '—'}
                            </td>
                            <td className="py-3 px-4">
                              <span className={`status-badge ${FIT_STATUS_BADGE[r.fit_status] ?? 'badge-pending'}`}>
                                {r.fit_status.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <Eye size={14} color={expandedRow === i ? 'var(--accent-primary)' : 'var(--text-muted)'} />
                            </td>
                          </tr>

                          <AnimatePresence>
                            {expandedRow === i && (
                              <tr key={`exp-${r.row_index}`}>
                                <td colSpan={6} style={{ padding: 0 }}>
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    style={{ overflow: 'hidden', background: 'rgba(37,99,235,0.04)', borderBottom: '1px solid var(--border-subtle)' }}>
                                    <div className="px-6 py-5 grid grid-cols-2 gap-4">
                                      {/* Box info */}
                                      <div>
                                        <p className="text-xs uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>Box Details</p>
                                        <div className="space-y-1 text-xs">
                                          {[
                                            ['Recommended Box', r.recommended_box_name],
                                            ['Utilization', `${r.utilization_pct}%`],
                                            ['DIM Weight', `${r.dimensional_weight_kg}kg`],
                                            ['Eco Score', `${r.sustainability_score}/100`],
                                            ['Zone', r.shipping_zone],
                                          ].map(([k, v]) => (
                                            <div key={k} className="flex justify-between">
                                              <span style={{ color: 'var(--text-muted)' }}>{k}</span>
                                              <span style={{ color: 'var(--text-secondary)' }}>{v}</span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                      {/* Reason */}
                                      <div>
                                        <p className="text-xs uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>Optimization Reason</p>
                                        <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                                          {r.optimization_reason}
                                        </p>
                                      </div>
                                    </div>
                                  </motion.div>
                                </td>
                              </tr>
                            )}
                          </AnimatePresence>
                        </Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Orders link */}
              <div className="glass-card p-4 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-white text-sm">Results saved to Orders tab</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    All {(bulkResult.results?.length ?? 0)} rows are now in your Orders dashboard
                  </p>
                </div>
                <a href="/dashboard/orders" className="btn-primary" style={{ padding: '8px 18px', fontSize: 13, textDecoration: 'none' }}>
                  View Orders →
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

