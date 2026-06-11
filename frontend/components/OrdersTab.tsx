'use client'

import React, { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { FileDown, ChevronDown, ChevronRight, CheckCircle, AlertCircle, Info, Package } from 'lucide-react'

interface OrderRow {
  id: string
  run_id: string
  product_name: string
  product_length_cm: number
  product_width_cm: number
  product_height_cm: number
  product_weight_kg: number
  fragility: 'low' | 'medium' | 'high'
  fragility_score: number
  quantity: number
  shipping_zone: string
  used_box_length_cm: number
  used_box_width_cm: number
  used_box_height_cm: number
  used_box_price_usd: number
  recommended_box_id: string | null
  original_box_price_usd: number
  optimized_box_price_usd: number
  savings_usd: number
  utilization_pct: number
  dimensional_weight_kg: number
  sustainability_score: number
  fit_status: 'optimized' | 'same_box' | 'no_fit'
  optimization_reason: string
  ai_explanation: string | null
  ml_confidence_pct: number | null
}

interface RunSummary {
  runId: string
  totalOrders: number
  optimizedCount: number
  totalSaved: number
  avgUtilization: number
  dateStr: string
}

type TabType = 'all' | 'optimized' | 'same_box' | 'no_fit'

export default function OrdersTab({ runId, companyId }: { runId: string, companyId: string }) {
  const [rows, setRows] = useState<OrderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [activeTab, setActiveTab] = useState<TabType>('all')
  const [page, setPage] = useState(0)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [summary, setSummary] = useState<RunSummary | null>(null)

  useEffect(() => {
    let isMounted = true
    const fetchData = async () => {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('optimization_runs_orders')
          .select('*')
          .eq('run_id', runId)
          .eq('company_id', companyId)
          .order('run_row_index', { ascending: true })
          .range(page * 50, (page + 1) * 50 - 1)

        if (error) throw error

        if (isMounted) {
          setRows(data as OrderRow[])
          
          if (!summary) {
            // Rough summary calculation on first load
            const { data: runData } = await supabase
              .from('optimization_runs')
              .select('*')
              .eq('id', runId)
              .single()
              
            if (runData) {
              setSummary({
                runId,
                totalOrders: runData.total_rows || 0,
                optimizedCount: runData.optimized_rows || 0,
                totalSaved: runData.total_savings_usd || 0,
                avgUtilization: runData.avg_utilization_pct || 0,
                dateStr: new Date(runData.created_at).toLocaleDateString()
              })
            }
          }
        }
      } catch (err: any) {
        if (isMounted) setError(err.message)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    fetchData()

    // Realtime subscription setup safely
    let channel: any
    if (supabase.channel) {
      channel = supabase.channel(`public:optimization_runs_orders:run_id=eq.${runId}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'optimization_runs_orders', filter: `run_id=eq.${runId}` },
          (payload: any) => {
            if (isMounted) {
              setRows(prev => {
                // If on page 0 and list is small, we can prepend. Otherwise just ignore until reload.
                if (page === 0 && prev.length < 50) {
                  return [payload.new as OrderRow, ...prev].slice(0, 50)
                }
                return prev
              })
            }
          }
        )
        .subscribe()
    }

    return () => {
      isMounted = false
      if (channel) supabase.removeChannel(channel)
    }
  }, [runId, companyId, page])

  const filteredRows = rows.filter(r => activeTab === 'all' || r.fit_status === activeTab)

  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const exportCSV = () => {
    const header = "Product,Used Box,Optimal Box,Saving,Status,Confidence\n"
    const csvRows = filteredRows.map(r => 
      `"${r.product_name}","${r.used_box_length_cm}x${r.used_box_width_cm}x${r.used_box_height_cm}","${r.optimized_box_price_usd}","${r.savings_usd}","${r.fit_status}","${r.ml_confidence_pct || ''}"`
    ).join("\n")
    
    const blob = new Blob([header + csvRows], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `shipzi_run_${runId}.csv`
    a.click()
  }

  if (loading && rows.length === 0) {
    return <div className="p-8 text-center text-gray-500 animate-pulse">Loading orders...</div>
  }

  if (error) {
    return <div className="p-8 text-red-500 bg-red-50 rounded-lg">Error loading results: {error}</div>
  }

  return (
    <div className="space-y-6">
      {/* Summary Bar */}
      {summary && (
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex items-center justify-between text-blue-900 shadow-sm">
          <div className="font-medium flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-600" />
            [Run: {summary.dateStr}]
          </div>
          <div className="flex gap-6 font-semibold text-sm">
            <span>{summary.totalOrders} orders</span>
            <span className="text-blue-300">|</span>
            <span className="text-green-600">{summary.optimizedCount} optimized</span>
            <span className="text-blue-300">|</span>
            <span className="text-green-600">${summary.totalSaved.toLocaleString(undefined, {minimumFractionDigits: 2})} saved</span>
            <span className="text-blue-300">|</span>
            <span className="text-purple-600">{summary.avgUtilization}% avg utilization</span>
          </div>
        </div>
      )}

      {/* Tabs & Export */}
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          {(['all', 'optimized', 'same_box', 'no_fit'] as TabType[]).map(tab => {
            const count = tab === 'all' ? rows.length : rows.filter(r => r.fit_status === tab).length
            return (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); setPage(0); }}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors flex items-center gap-2 ${
                  activeTab === tab 
                    ? 'border-blue-600 text-blue-600 bg-blue-50/50' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                {tab.replace('_', ' ').toUpperCase()}
                <span className={`px-2 py-0.5 rounded-full text-xs ${activeTab === tab ? 'bg-blue-100' : 'bg-gray-100'}`}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>
        <button onClick={exportCSV} className="flex items-center gap-2 text-sm bg-white border border-gray-300 px-4 py-2 rounded-md hover:bg-gray-50 font-medium text-gray-700">
          <FileDown className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 w-8"></th>
                <th className="px-4 py-3">Product / Order</th>
                <th className="px-4 py-3">Used Box</th>
                <th className="px-4 py-3">Optimal Box</th>
                <th className="px-4 py-3">Savings</th>
                <th className="px-4 py-3">Zone</th>
                <th className="px-4 py-3">Utilization</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">ML Confidence</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                    No results found for this filter.
                  </td>
                </tr>
              ) : filteredRows.map(row => {
                const isMulti = row.product_name.includes('|')
                const isExpanded = expandedRows.has(row.id)
                const isOptimized = row.fit_status === 'optimized'
                const isSame = row.fit_status === 'same_box'
                const isNoFit = row.fit_status === 'no_fit'
                
                return (
                  <React.Fragment key={row.id}>
                    <tr 
                      onClick={() => toggleRow(row.id)}
                      className={`border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors relative
                        ${isExpanded ? 'bg-blue-50/30' : ''}
                      `}
                    >
                      {/* Left color border indicating status */}
                      <td className="w-2 p-0">
                        <div className={`w-1.5 h-full absolute left-0 top-0 
                          ${isOptimized ? 'bg-green-500' : isSame ? 'bg-gray-300' : 'bg-red-500'}
                        `} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                          <span className="font-medium text-gray-900 truncate max-w-[200px]" title={row.product_name}>
                            {isMulti ? row.product_name.split('|').join(', ') : row.product_name}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                        {row.used_box_length_cm}x{row.used_box_width_cm}x{row.used_box_height_cm}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap font-medium text-blue-600">
                        {isNoFit ? '-' : `$${row.optimized_box_price_usd.toFixed(2)}`}
                      </td>
                      <td className="px-4 py-3 font-semibold whitespace-nowrap">
                        {row.savings_usd > 0 ? (
                          <span className="text-green-600 flex items-center gap-1">↑ +${row.savings_usd.toFixed(2)}</span>
                        ) : (
                          <span className="text-gray-400">$0.00</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{row.shipping_zone}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${row.utilization_pct > 80 ? 'bg-green-500' : row.utilization_pct > 50 ? 'bg-yellow-500' : 'bg-red-500'}`} 
                              style={{ width: `${Math.min(100, row.utilization_pct)}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500 w-8">{row.utilization_pct}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-[11px] font-medium tracking-wide flex items-center w-max gap-1
                          ${isOptimized ? 'bg-green-100 text-green-700' : isSame ? 'bg-gray-100 text-gray-700' : 'bg-red-100 text-red-700'}
                        `}>
                          {isOptimized ? <CheckCircle className="w-3 h-3" /> : isNoFit ? <AlertCircle className="w-3 h-3" /> : <Info className="w-3 h-3" />}
                          {row.fit_status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {row.ml_confidence_pct ? (
                          <span className="text-xs font-medium bg-purple-100 text-purple-700 px-2 py-1 rounded-md">
                            {row.ml_confidence_pct}%
                          </span>
                        ) : (
                          <span className="text-gray-300 text-xs">-</span>
                        )}
                      </td>
                    </tr>

                    {/* Expanded Content */}
                    {isExpanded && (
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <td colSpan={9} className="px-10 py-4">
                          <div className="space-y-3">
                            <div>
                              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Optimization Reason</p>
                              <p className="text-sm text-gray-800 bg-white p-3 rounded-md border border-gray-200">{row.optimization_reason}</p>
                            </div>
                            
                            {row.ai_explanation && (
                              <div>
                                <p className="text-xs font-semibold text-purple-600 uppercase tracking-wider mb-1 flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span> ML Packaging Tip
                                </p>
                                <p className="text-sm text-purple-900 bg-purple-50 p-3 rounded-md border border-purple-100">{row.ai_explanation}</p>
                              </div>
                            )}

                            {!isMulti && (
                              <div className="flex gap-6 mt-2 text-sm text-gray-600">
                                <div><span className="font-medium">Product Dims:</span> {row.product_length_cm}x{row.product_width_cm}x{row.product_height_cm}cm</div>
                                <div><span className="font-medium">Weight:</span> {row.product_weight_kg}kg</div>
                                <div><span className="font-medium">Fragility:</span> {row.fragility_score}/10 ({row.fragility})</div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center bg-gray-50">
          <p className="text-sm text-gray-500">
            Showing <span className="font-medium text-gray-900">{rows.length}</span> rows
          </p>
          <div className="flex gap-2">
            <button 
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button 
              onClick={() => setPage(p => p + 1)}
              disabled={rows.length < 50}
              className="px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
