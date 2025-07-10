'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Navigation } from '@/components/dashboard/navigation';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Plus, Search, Filter, MoreHorizontal, Edit, Trash2, Download, Upload, BarChart3, Smartphone, Sigma as Sim, Hash, Users, Package, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

interface ListNumber {
  id: string;
  port: string;
  iccid: string;
  imei: string;
  imsi: string;
  sn: string;
  status: string;
  batch_id: string;
  users_id: string;
  created_at: string;
  updated_at: string;
}

interface Stats {
  totalRecords: number;
  distributions: {
    status: Array<{ status: string; count: number }>;
    batch: Array<{ batch_id: string; count: number }>;
    user: Array<{ users_id: string; count: number }>;
    port: Array<{ port: string; count: number }>;
  };
  recentActivity: Array<{ date: string; count: number }>;
}

interface addAPI  {
  success?: boolean;
  error?: string;
  data?:any;
  pagination?:any;

};

export default function ListNumberPage() {
  const { user } = useAuth();
  const [listNumbers, setListNumbers] = useState<ListNumber[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [batchFilter, setBatchFilter] = useState('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<ListNumber | null>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  
  const [formData, setFormData] = useState({
    port: '',
    iccid: '',
    imei: '',
    imsi: '',
    sn: '',
    status: 'active',
    batch_id: '',
    users_id: ''
  });

  useEffect(() => {

    const fetchAll = async () => {
        await fetchData();
        await fetchStats();
    };
    fetchAll(); // Ejecutar inmediatamente

    const interval = setInterval(fetchAll, 4000);
        
    return () => clearInterval(interval);

  }, [searchTerm, statusFilter, batchFilter]);

  const fetchData = async () => {
    try {
      const offset = (currentPage - 1) * itemsPerPage;
      const params = new URLSearchParams();
      if (searchTerm) params.set('search', searchTerm);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (batchFilter !== 'all') params.set('batch_id', batchFilter);
      params.set('limit', itemsPerPage.toString());
      params.set('offset', offset.toString());
      console.log(itemsPerPage);

      const data = await apiClient.getListNumbers({
        limit:itemsPerPage.toString(),
        offset:offset.toString(),
        status:statusFilter.toString()
      }) as addAPI;
      
      //await apiClient.createNumberHistory()

      if (data.success) {
        setListNumbers(data.data);
        setTotalItems(data.pagination?.total || 0);
        setTotalPages(Math.ceil((data.pagination?.total || 0) / itemsPerPage));
      } else {
        setError(data.error || 'Failed to fetch data');
      }
    } catch (err) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, batchFilter, itemsPerPage]);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/listnumber/stats');
      const data = await response.json();
      
      if (data.success) {
        setStats(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const url = editingRecord ? `/api/listnumber/${editingRecord.id}` : '/api/listnumber';
      const method = editingRecord ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        setIsAddDialogOpen(false);
        setEditingRecord(null);
        setFormData({
          port: '',
          iccid: '',
          imei: '',
          imsi: '',
          sn: '',
          status: 'active',
          batch_id: '',
          users_id: ''
        });
        fetchData();
        fetchStats();
      } else {
        setError(data.error || 'Operation failed');
      }
    } catch (err) {
      setError('Network error occurred');
    }
  };

  const handleEdit = (record: ListNumber) => {
    setEditingRecord(record);
    setFormData({
      port: record.port,
      iccid: record.iccid,
      imei: record.imei,
      imsi: record.imsi,
      sn: record.sn,
      status: record.status,
      batch_id: record.batch_id,
      users_id: record.users_id
    });
    setIsAddDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this record?')) return;

    try {
      const response = await fetch(`/api/listnumber/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        fetchData();
        fetchStats();
      } else {
        setError(data.error || 'Delete failed');
      }
    } catch (err) {
      setError('Network error occurred');
    }
  };

  const handlePageChange = async(page: number) => {
    setCurrentPage(page);
    // Trigger data fetch with new page
    const data = await apiClient.getListNumbers({        
        offset: page.toString(),
        limit: itemsPerPage.toString()
    }) as addAPI;

    if (data.success) {
        setListNumbers(data.data);
        setTotalItems(data.pagination?.total || 0);
        setTotalPages(Math.ceil((data.pagination?.total || 0) / itemsPerPage));
      } else {
        setError(data.error || 'Failed to fetch data');
      }


  };

  const handleItemsPerPageChange = async(value: string) => {
    const newItemsPerPage = parseInt(value);
    setItemsPerPage(parseInt(value));
    setCurrentPage(1);
    // Trigger data fetch with new limit

    const data = await apiClient.getListNumbers({        
        offset: "1".toString(),
        limit:newItemsPerPage.toString()
    }) as addAPI;

    if (data.success) {
        setListNumbers(data.data);
        setTotalItems(data.pagination?.total || 0);
        setTotalPages(Math.ceil((data.pagination?.total || 0) / newItemsPerPage));
      } else {
        setError(data.error || 'Failed to fetch data');
      }
    console.log("seleccion: ",newItemsPerPage);
    getPageNumbers();
  };



  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      const startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
      const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
      
      if (startPage > 1) {
        pages.push(1);
        if (startPage > 2) pages.push('...');
      }
      
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
      
      if (endPage < totalPages) {
        if (endPage < totalPages - 1) pages.push('...');
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  const getStatusBadge = (status: string) => {
    if(status === "1"){
        status = "active";
    }else{
        status = "inactivo";
    }
    const colors = {
      active: 'bg-green-100 text-green-800',
      inactivo: 'bg-red-100 text-red-800',
      blocked: 'bg-red-100 text-red-800',
      pending: 'bg-yellow-100 text-yellow-800'
    };

    return (
      <Badge className={colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'}>
        {status}
      </Badge>
    );
  };

  // Check if user is authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-muted-foreground">Please log in to access this page.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="lg:pl-64">
          <main className="p-6">
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="lg:pl-64">
        <main className="p-6 space-y-6">
          {/* Dashboard Header with User Info */}
          <DashboardHeader />
          
          {/* Page Header */}
          <div className="flex items-center justify-between">
            <div className="space-y-2">              
              <p className="text-muted-foreground">
                Manage device numbers, ICCID, IMEI, IMSI and serial numbers
              </p>
            </div>
            
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>
                    {editingRecord ? 'Edit Record' : 'Add New Record'}
                  </DialogTitle>
                  <DialogDescription>
                    {editingRecord ? 'Update the record details below.' : 'Enter the details for the new record.'}
                  </DialogDescription>
                </DialogHeader>
                
                <form onSubmit={handleSubmit}>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="port">Port *</Label>
                        <Input
                          id="port"
                          value={formData.port}
                          onChange={(e) => setFormData({ ...formData, port: e.target.value })}
                          placeholder="Enter port"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="status">Status</Label>
                        <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">Activo</SelectItem>
                            <SelectItem value="0">Inactivo</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="iccid">ICCID *</Label>
                      <Input
                        id="iccid"
                        value={formData.iccid}
                        onChange={(e) => setFormData({ ...formData, iccid: e.target.value })}
                        placeholder="Enter ICCID"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="imei">IMEI *</Label>
                      <Input
                        id="imei"
                        value={formData.imei}
                        onChange={(e) => setFormData({ ...formData, imei: e.target.value })}
                        placeholder="Enter IMEI"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="imsi">IMSI *</Label>
                      <Input
                        id="imsi"
                        value={formData.imsi}
                        onChange={(e) => setFormData({ ...formData, imsi: e.target.value })}
                        placeholder="Enter IMSI"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="sn">Serial Number *</Label>
                      <Input
                        id="sn"
                        value={formData.sn}
                        onChange={(e) => setFormData({ ...formData, sn: e.target.value })}
                        placeholder="Enter serial number"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="batch_id">Batch ID *</Label>
                        <Input
                          id="batch_id"
                          value={formData.batch_id}
                          onChange={(e) => setFormData({ ...formData, batch_id: e.target.value })}
                          placeholder="Enter batch ID"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="users_id">User ID *</Label>
                        <Input
                          id="users_id"
                          value={formData.users_id}
                          onChange={(e) => setFormData({ ...formData, users_id: e.target.value })}
                          placeholder="Enter user ID"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {error && (
                    <Alert variant="destructive" className="mb-4">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">
                      {editingRecord ? 'Update' : 'Create'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Stats Cards */}
          {stats && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Smartphone className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Records</p>
                      <p className="text-3xl font-bold">{stats.totalRecords}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <CheckCircle className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Active</p>
                      <p className="text-3xl font-bold">
                        {stats.distributions.status.find(s => s.status === '1')?.count || 0}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>           

           
            </div>
          )}

          {/* Filters */}
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by port, ICCID, IMEI, IMSI, SN..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <div className="flex gap-2 items-center">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="1">Activo</SelectItem>
                      <SelectItem value="0">Inactivo</SelectItem>
           
                    </SelectContent>
                  </Select>

            
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Data Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Records</CardTitle>
                  <CardDescription>
                    Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} records
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="items-per-page" className="text-sm">Show:</Label>
                  <Select value={itemsPerPage.toString()} onValueChange={handleItemsPerPageChange}>
                    <SelectTrigger className="w-20" id="items-per-page">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Port</TableHead>
                      <TableHead>ICCID</TableHead>
                      <TableHead>IMEI</TableHead>
                      <TableHead>IMSI</TableHead>
                      <TableHead>Serial Number</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Batch ID</TableHead>
                      {/*<TableHead>User ID</TableHead>
                       <TableHead className="w-12"></TableHead> */}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {listNumbers.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">{record.port}</TableCell>
                        <TableCell className="font-mono text-sm">{record.iccid}</TableCell>
                        <TableCell className="font-mono text-sm">{record.imei}</TableCell>
                        <TableCell className="font-mono text-sm">{record.imsi}</TableCell>
                        <TableCell className="font-mono text-sm">{record.sn}</TableCell>
                        <TableCell>{getStatusBadge(record.status)}</TableCell>
                        <TableCell>{record.batch_id}</TableCell>
                        {/*<TableCell>{record.users_id}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEdit(record)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleDelete(record.id)}
                                className="text-red-600"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>*/}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {listNumbers.length === 0 && (
                <div className="text-center py-12">
                  <Smartphone className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No records found matching your criteria.</p>
                </div>
              )}

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-2 py-4">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(1)}
                      disabled={currentPage === 1}
                    >
                      First
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                  </div>

                  <div className="flex items-center gap-1">
                    {getPageNumbers().map((page, index) => (
                      <div key={index}>
                        {page === '...' ? (
                          <span className="px-3 py-2 text-muted-foreground">...</span>
                        ) : (
                          <Button
                            variant={currentPage === page ? "default" : "outline"}
                            size="sm"
                            onClick={() => handlePageChange(page as number)}
                            className="w-10"
                          >
                            {page}
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(totalPages)}
                      disabled={currentPage === totalPages}
                    >
                      Last
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}