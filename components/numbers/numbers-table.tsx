'use client';

import { useState, useEffect } from 'react';
import { NumberEntry, ProcessStage, Status, Priority,numberAll } from '@/lib/types';
import { Button } from '@/components/ui/button';
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
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MoreHorizontal, Eye, Edit, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { AddNumberDialog } from './add-number-dialog';
import { NumberDetailsDialog } from './number-details-dialog';
import { getNumber, addNumber, searchNumber } from '@/services/numbers';
import { apiClient } from '@/lib/api-client';

export function NumbersTable() {
  const [numberAll, setNumberAll] = useState<numberAll[]>([]);
  const [selectedNumber, setSelectedNumber] = useState<NumberEntry | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

 

  useEffect(() => {
    const fetchNumbers = async () => {
      try {              
       const listNumber = await apiClient.getListNumbers();
       setNumberAll(listNumber.data);
      } catch (error) {
        console.error('Error fetching numbers:', error);
      }
    };

    fetchNumbers();
  }, []);

  const getStatusBadge = (status: Status) => {
    const variants = {
      active: 'default',
      pending: 'secondary',
      blocked: 'destructive',
      completed: 'outline'
    } as const;

    return <Badge variant={variants[status]}>{status}</Badge>;
  };

  const getPriorityBadge = (priority: Priority) => {
    const colors = {
      low: 'bg-gray-100 text-gray-800',
      medium: 'bg-blue-100 text-blue-800',
      high: 'bg-orange-100 text-orange-800',
      urgent: 'bg-red-100 text-red-800'
    };

    return (
      <Badge className={colors[priority]}>
        {priority}
      </Badge>
    );
  };

  const getProcessStageBadge = (stage: ProcessStage) => {
    const colors = {
      initial: 'bg-gray-100 text-gray-800',
      'in-progress': 'bg-blue-100 text-blue-800',
      review: 'bg-yellow-100 text-yellow-800',
      approval: 'bg-purple-100 text-purple-800',
      completed: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    };

    return (
      <Badge className={colors[stage]}>
        {stage.replace('-', ' ')}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Listado de numeros</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>PORT</TableHead>
                <TableHead>ICCID</TableHead>
                <TableHead>IMEI</TableHead>
                <TableHead>IMSI</TableHead>
                <TableHead>SN</TableHead>                
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {numberAll.length > 0 ? (
                numberAll.map((number) => (
                  <TableRow key={number.iccid}>
                    <TableCell className="font-medium">{number.port}</TableCell>
                    <TableCell className="font-medium">{number.iccid}</TableCell>
                    <TableCell>{number.imei}</TableCell>
                    <TableCell>{number.imsi}</TableCell>
                    <TableCell>{number.sn}</TableCell>                   
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => {
                            setSelectedNumber(number);
                            setIsDetailsOpen(true);
                          }}>
                            <Eye className="mr-2 h-4 w-4" /> View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Edit className="mr-2 h-4 w-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600">
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                    No numbers found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>


        

        {selectedNumber && (
          <NumberDetailsDialog
            number={selectedNumber}
            open={isDetailsOpen}
            onOpenChange={setIsDetailsOpen}
          />
        )}
      </CardContent>
    </Card>
  );
}
