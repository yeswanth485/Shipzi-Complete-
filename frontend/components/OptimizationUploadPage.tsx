'use client'

import React, { useState, useCallback } from 'react'
import Papa from 'papaparse'
import { Upload, FileDown, AlertCircle, Loader2 } from 'lucide-react'
import { CSVRow } from '@/lib/types'
import { useUser } from '@/context/UserContext'
import { supabase } from '@/lib/supabase'

type UploadMode = 'single' | 'multi'

interface ValidationResult {
  valid: boolean
  errors: string[]
  row: CSVRow
}

export default function OptimizationUploadPage() {
  const { companyId, firebaseUser } = useUser()
  const [mode, setMode] = useState<UploadMode>('single')
  const [file, setFile] = useState<File | null>(null)
  const [parsedRows, setParsedRows] = useState<CSVRow[]>([])
  const [validations, setValidations] = useState<ValidationResult[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [results, setResults] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.name.endsWith('.csv')) {
      setError('Please upload a valid .csv file.')
      return
    }

    setFile(file)
    setError(null)
    setResults(null)

    Papa.parse<CSVRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        setParsedRows(result.data)
        validateParsedData(result.data, mode)
      },
      error: (err) => {
        setError(err.message)
      }
    })
  }

  const validateParsedData = (data: CSVRow[], currentMode: UploadMode) => {
    const val: ValidationResult[] = []
    
    data.forEach((row, index) => {
      const rowErrors: string[] = []
      if (currentMode === 'single') {
        if (!row.product_name) rowErrors.push('Missing product_name')
        if (!row.product_length) rowErrors.push('Missing product_length')
        if (!row.fragility_score) rowErrors.push('Missing fragility_score')
      } else {
        // Multi
        const r = row as any
        if (!r.product_names) rowErrors.push('Missing product_names')
        if (!r.product_lengths) rowErrors.push('Missing product_lengths')
        if (!r.product_widths) rowErrors.push('Missing product_widths')
        if (!r.product_heights) rowErrors.push('Missing product_heights')
        // Validate pipe-separated counts match
        if (r.product_names && r.product_lengths) {
          const nameCount = r.product_names.split('|').length
          const lenCount = r.product_lengths.split('|').length
          if (nameCount !== lenCount) rowErrors.push('product_names and product_lengths count mismatch')
        }
      }
      
      val.push({
        valid: rowErrors.length === 0,
        errors: rowErrors,
        row
      })
    })

    setValidations(val)
  }

  const isValid = file && validations.length > 0 && validations.every(v => v.valid)

  const handleModeChange = (newMode: UploadMode) => {
    setMode(newMode)
    setFile(null)
    setParsedRows([])
    setValidations([])
    setError(null)
    setResults(null)
  }

  const runOptimization = async () => {
    if (!isValid) return
    setIsUploading(true)
    setError(null)

    try {
      const { data: runData } = await supabase.from('optimization_runs').insert({
        company_id: companyId,
        status: 'processing'
      }).select('id').single();
      const runId = runData.id;

      const token = await firebaseUser?.getIdToken()
      const response = await fetch('/api/optimize/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          rows: parsedRows,
          mode,
          catalog_id: 'default_catalog',
          run_id: runId,
          company_id: companyId
        })
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.message || 'Failed to optimize')
      }

      setResults(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Upload & Optimize</h1>
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => handleModeChange('single')}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${mode === 'single' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Single Product
          </button>
          <button
            onClick={() => handleModeChange('multi')}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${mode === 'multi' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Multi Product
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 flex items-start gap-3">
          <AlertCircle className="text-red-500 w-5 h-5 mt-0.5" />
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {!results && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:bg-gray-50 transition-colors">
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">Drag and drop your .csv file here, or click to browse</p>
            <p className="text-sm text-gray-500 mb-6">Max 10,000 rows</p>
            <label className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium cursor-pointer hover:bg-blue-700 transition-colors">
              Browse Files
              <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
            </label>
          </div>

          {file && validations.length > 0 && (
            <div className="mt-8 space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Preview ({validations.length} rows)</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-y">
                    <tr>
                      <th className="px-4 py-3">Row</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Product Name</th>
                      <th className="px-4 py-3">Dimensions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {validations.slice(0, 5).map((v, i) => (
                      <tr key={i} className={`border-b ${!v.valid ? 'bg-red-50' : ''}`}>
                        <td className="px-4 py-3">{i + 1}</td>
                        <td className="px-4 py-3">
                          {v.valid ? (
                            <span className="text-green-600 font-medium">Valid</span>
                          ) : (
                            <span className="text-red-600 font-medium">{v.errors.join(', ')}</span>
                          )}
                        </td>
                        <td className="px-4 py-3">{v.row.product_name || (v.row as any).product_names}</td>
                        <td className="px-4 py-3">{v.row.product_length}x{v.row.product_width}x{v.row.product_height}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end pt-4">
                <button
                  onClick={runOptimization}
                  disabled={!isValid || isUploading}
                  className="bg-blue-600 text-white px-8 py-3 rounded-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  {isUploading && <Loader2 className="w-5 h-5 animate-spin" />}
                  {isUploading ? 'Optimizing...' : 'Run Optimization'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {results && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <p className="text-sm text-gray-500 font-medium mb-1">Total Savings</p>
              <p className="text-3xl font-bold text-green-600">${results.summary.total_savings}</p>
            </div>
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <p className="text-sm text-gray-500 font-medium mb-1">Rows Optimized</p>
              <p className="text-3xl font-bold text-blue-600">{results.summary.optimized} / {results.summary.total}</p>
            </div>
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <p className="text-sm text-gray-500 font-medium mb-1">Same Box</p>
              <p className="text-3xl font-bold text-gray-700">{results.summary.same_box}</p>
            </div>
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <p className="text-sm text-gray-500 font-medium mb-1">Avg Utilization</p>
              <p className="text-3xl font-bold text-purple-600">{results.summary.avg_utilization}%</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 overflow-x-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Optimization Results</h3>
              <button className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                <FileDown className="w-4 h-4" /> Export CSV
              </button>
            </div>
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-y">
                <tr>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Used Box</th>
                  <th className="px-4 py-3">Optimal Box</th>
                  <th className="px-4 py-3">Savings</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {results.results.slice(0, 20).map((r: any, i: number) => (
                  <tr key={i} className="border-b">
                    <td className="px-4 py-3 font-medium text-gray-900">{r.product_name}</td>
                    <td className="px-4 py-3 text-gray-500">{r.original_box_dimensions}</td>
                    <td className="px-4 py-3 text-blue-600 font-medium">{r.optimized_box_dimensions} ({r.recommended_box_name})</td>
                    <td className="px-4 py-3 text-green-600 font-medium">+${r.savings}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${r.fit_status === 'optimized' ? 'bg-green-100 text-green-700' : r.fit_status === 'same_box' ? 'bg-gray-100 text-gray-700' : 'bg-red-100 text-red-700'}`}>
                        {r.fit_status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
