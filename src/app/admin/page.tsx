'use client'

import { useState, useEffect } from 'react'
import { supabase, Lead } from '@/lib/supabase'
import { motion } from 'framer-motion'
import { PieChart, Pie, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import { 
  Users, 
  Phone, 
  Mail, 
  Home, 
  TrendingUp, 
  Calendar,
  Search,
  Download,
  Trash2,
  RefreshCw
} from 'lucide-react'

export default function AdminDashboard() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [scoreFilter, setScoreFilter] = useState<string>('all')

  useEffect(() => {
    fetchLeads()
  }, [])

  const fetchLeads = async () => {
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setLeads(data || [])
    } catch (error) {
      console.error('Error fetching leads:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = 
      lead.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.area?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter
    const matchesScore = scoreFilter === 'all' || 
      (scoreFilter === 'high' && lead.lead_score >= 7) ||
      (scoreFilter === 'medium' && lead.lead_score >= 4 && lead.lead_score < 7) ||
      (scoreFilter === 'low' && lead.lead_score < 4)

    return matchesSearch && matchesStatus && matchesScore
  })

  const getScoreColor = (score: number) => {
    if (score >= 7) return 'text-green-700 bg-green-50 border border-green-200'
    if (score >= 4) return 'text-amber-700 bg-amber-50 border border-amber-200'
    return 'text-red-700 bg-red-50 border border-red-200'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'text-blue-700 bg-blue-50 border border-blue-200'
      case 'contacted': return 'text-amber-700 bg-amber-50 border border-amber-200'
      case 'converted': return 'text-green-700 bg-green-50 border border-green-200'
      case 'lost': return 'text-red-700 bg-red-50 border border-red-200'
      default: return 'text-gray-700 bg-gray-50 border border-gray-200'
    }
  }

  const deleteLead = async (leadId: string) => {
    if (!confirm('Are you sure you want to delete this lead? This action cannot be undone.')) {
      return
    }

    try {
      console.log('Attempting to delete lead:', leadId)
      
      const { data, error } = await supabase
        .from('leads')
        .delete()
        .eq('id', leadId)
        .select()

      if (error) {
        console.error('Supabase delete error:', error)
        throw error
      }
      
      console.log('Delete successful:', data)
      
      // Refresh leads after deletion
      await fetchLeads()
      alert('Lead deleted successfully!')
    } catch (error) {
      console.error('Error deleting lead:', error)
      alert(`Failed to delete lead: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const downloadCSV = () => {
    const headers = [
      'Name',
      'Email',
      'Phone',
      'Rent/Buy',
      'Area',
      'Budget Range',
      'Urgency',
      'Lead Score',
      'Status',
      'Phone Call Made',
      'Created Date',
      'Updated Date'
    ]

    const csvData = filteredLeads.map(lead => [
      lead.name || '',
      lead.email || '',
      lead.phone || '',
      lead.rent_or_buy || '',
      lead.area || '',
      lead.budget_range || '',
      lead.urgency || '',
      lead.lead_score,
      lead.status,
      lead.phone_call_made ? 'Yes' : 'No',
      new Date(lead.created_at).toLocaleDateString(),
      new Date(lead.updated_at).toLocaleDateString()
    ])

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `leads-${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const stats = {
    total: leads.length,
    new: leads.filter(l => l.status === 'new').length,
    contacted: leads.filter(l => l.status === 'contacted').length,
    converted: leads.filter(l => l.status === 'converted').length,
    lost: leads.filter(l => l.status === 'lost').length,
    qualified: leads.filter(l => l.lead_score >= 7).length,
    trash: leads.filter(l => l.lead_score < 4).length,
    callsMade: leads.filter(l => l.phone_call_made).length
  }

  // Pie chart data - let's debug the lead scores
  const qualifiedLeads = leads.filter(l => l.lead_score >= 7).length
  const mediumLeads = leads.filter(l => l.lead_score >= 4 && l.lead_score < 7).length
  const trashLeads = leads.filter(l => l.lead_score < 4).length
  
  const pieData = [
    { name: 'Qualified Leads', value: qualifiedLeads, fill: '#10B981' },
    { name: 'Medium Leads', value: mediumLeads, fill: '#F59E0B' },
    { name: 'Trash Leads', value: trashLeads, fill: '#EF4444' }
  ]

  // Show sample data when no leads exist, otherwise show real data
  const chartData = leads.length > 0 ? pieData : [
    { name: 'Sample Qualified', value: 5, fill: '#10B981' },
    { name: 'Sample Medium', value: 3, fill: '#F59E0B' },
    { name: 'Sample Trash', value: 2, fill: '#EF4444' }
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading leads...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-800 mb-2">Lead Management Dashboard</h1>
          <p className="text-gray-500">Track and manage your real estate leads</p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Pie Chart */}
          <div className="lg:col-span-1">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Lead Quality Distribution</h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      outerRadius={60}
                      dataKey="value"
                      nameKey="name"
                    />
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              {leads.length === 0 && (
                <p className="text-center text-gray-500 text-sm mt-2">
                  Showing sample data - no leads yet
                </p>
              )}
            </div>
          </div>

          {/* Stats Cards */}
          <div className="lg:col-span-2">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-4 rounded-lg shadow-sm border border-gray-100"
          >
            <div className="flex items-center">
              <div className="p-2 bg-gray-100 rounded-lg">
                <Users className="w-5 h-5 text-gray-600" />
              </div>
              <div className="ml-3">
                <p className="text-xs font-medium text-gray-500">Total Leads</p>
                <p className="text-xl font-semibold text-gray-700">{stats.total}</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white p-4 rounded-lg shadow-sm border border-gray-100"
          >
            <div className="flex items-center">
              <div className="p-2 bg-green-50 rounded-lg">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <div className="ml-3">
                <p className="text-xs font-medium text-gray-500">Qualified</p>
                <p className="text-xl font-semibold text-gray-700">{stats.qualified}</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white p-4 rounded-lg shadow-sm border border-gray-100"
          >
            <div className="flex items-center">
              <div className="p-2 bg-red-50 rounded-lg">
                <Trash2 className="w-5 h-5 text-red-500" />
              </div>
              <div className="ml-3">
                <p className="text-xs font-medium text-gray-500">Trash</p>
                <p className="text-xl font-semibold text-gray-700">{stats.trash}</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white p-4 rounded-lg shadow-sm border border-gray-100"
          >
            <div className="flex items-center">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <div className="ml-3">
                <p className="text-xs font-medium text-gray-500">New</p>
                <p className="text-xl font-semibold text-gray-700">{stats.new}</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white p-4 rounded-lg shadow-sm border border-gray-100"
          >
            <div className="flex items-center">
              <div className="p-2 bg-green-50 rounded-lg">
                <Home className="w-5 h-5 text-green-600" />
              </div>
              <div className="ml-3">
                <p className="text-xs font-medium text-gray-500">Converted</p>
                <p className="text-xl font-semibold text-gray-700">{stats.converted}</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white p-6 rounded-xl shadow-sm border border-gray-100"
          >
            <div className="flex items-center">
              <div className="p-2 bg-gray-100 rounded-lg">
                <Phone className="w-6 h-6 text-gray-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Calls Made</p>
                <p className="text-2xl font-bold text-gray-700">{stats.callsMade}</p>
              </div>
            </div>
          </motion.div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search leads..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="converted">Converted</option>
              <option value="lost">Lost</option>
            </select>

            <select
              value={scoreFilter}
              onChange={(e) => setScoreFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Scores</option>
              <option value="high">High (7-10)</option>
              <option value="medium">Medium (4-6)</option>
              <option value="low">Low (1-3)</option>
            </select>

            <div 
              onClick={fetchLeads}
              className="cursor-pointer"
              title="Refresh"
            >
              <RefreshCw className="w-5 h-5 text-gray-600 hover:text-blue-600 transition-colors" />
            </div>

            <div 
              onClick={downloadCSV}
              className="cursor-pointer"
              title="Export CSV"
            >
              <Download className="w-5 h-5 text-gray-600 hover:text-green-600 transition-colors" />
            </div>
          </div>
        </div>

        {/* Leads Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Lead
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Phone
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rent/Buy
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Budget
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Call
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredLeads.map((lead, index) => (
                  <motion.tr
                    key={lead.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`hover:bg-gray-50 ${lead.lead_score >= 7 ? 'bg-green-50 border-l-4 border-green-500' : ''}`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <Users className="w-5 h-5 text-blue-600" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {lead.name || 'Anonymous'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {lead.area || 'No area specified'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {lead.email ? (
                          <div className="flex items-center">
                            <Mail className="w-4 h-4 mr-1" />
                            {lead.email}
                          </div>
                        ) : (
                          <span className="text-gray-400">No email</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {lead.phone ? (
                          <div className="flex items-center">
                            <Phone className="w-4 h-4 mr-1" />
                            {lead.phone}
                          </div>
                        ) : (
                          <span className="text-gray-400">No phone</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {lead.rent_or_buy ? (
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            lead.rent_or_buy === 'buy' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}>
                            {lead.rent_or_buy === 'buy' ? 'Buy' : 'Rent'}
                          </span>
                        ) : (
                          <span className="text-gray-400">Not specified</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {lead.budget_range || <span className="text-gray-400">No budget</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getScoreColor(lead.lead_score)}`}>
                        {lead.lead_score}/10
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(lead.status)}`}>
                        {lead.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {lead.phone_call_made ? (
                          <span className="text-green-700 font-medium">Yes</span>
                        ) : (
                          <span className="text-gray-500">No</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(lead.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => deleteLead(lead.id)}
                        className="text-red-600 hover:text-red-800 transition-colors"
                        title="Delete lead"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {filteredLeads.length === 0 && (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No leads found matching your criteria</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 