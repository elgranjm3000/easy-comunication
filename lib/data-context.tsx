'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { NumberEntry, DashboardMetrics, ProcessStage, Status, Priority,numberAll } from './types';
import { getNumber } from '@/services/numbers';
import { apiClient } from '@/lib/api-client';




interface DataContextType {
  numbers: NumberEntry[];
  metrics: DashboardMetrics;
  addNumber: (entry: Omit<NumberEntry, 'id' | 'startDate' | 'lastUpdated' | 'comments' | 'timeline'>) => void;
  updateNumber: (id: string, updates: Partial<NumberEntry>) => void;
  deleteNumber: (id: string) => void;
  addComment: (numberId: string, comment: string) => void;
  updateProcessStage: (numberId: string, newStage: ProcessStage) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  statusFilter: Status | 'all';
  setStatusFilter: (status: Status | 'all') => void;
  priorityFilter: Priority | 'all';
  setPriorityFilter: (priority: Priority | 'all') => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [numbers, setNumbers] = useState<NumberEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<Status | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<Priority | 'all'>('all');

  // Initialize with sample data
  useEffect(() => {
    const sampleData: NumberEntry[] = [
      {
        id: '1',
        numberRef: 'NUM-001',
        processStage: 'in-progress',
        startDate: new Date('2024-01-15'),
        lastUpdated: new Date('2024-01-20'),
        status: 'active',
        priority: 'high',
        assignedTo: 'John Doe',
        comments: [],
        timeline: [
          { id: '1', stage: 'initial', timestamp: new Date('2024-01-15'), user: 'System', description: 'Entry created' }
        ]
      },
      {
        id: '2',
        numberRef: 'NUM-002',
        processStage: 'review',
        startDate: new Date('2024-01-10'),
        lastUpdated: new Date('2024-01-18'),
        status: 'pending',
        priority: 'medium',
        assignedTo: 'Jane Smith',
        comments: [],
        timeline: [
          { id: '2', stage: 'initial', timestamp: new Date('2024-01-10'), user: 'System', description: 'Entry created' }
        ]
      },
      {
        id: '3',
        numberRef: 'NUM-003',
        processStage: 'completed',
        startDate: new Date('2024-01-05'),
        lastUpdated: new Date('2024-01-22'),
        status: 'completed',
        priority: 'low',
        assignedTo: 'Mike Johnson',
        comments: [],
        timeline: [
          { id: '3', stage: 'initial', timestamp: new Date('2024-01-05'), user: 'System', description: 'Entry created' }
        ]
      }
    ];
    setNumbers(sampleData);
  }, []);

  const [numbersAll, setNumbersAll] = useState<numberAll[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const data = await apiClient.getListNumbers();      
      setNumbersAll(data.data);
    };
    fetchData();
  }, []);

  const metrics: DashboardMetrics = {
    totalNumbers: numbersAll.length,
    completedNumbers: numbers.filter(n => n.status === 'completed').length,
    pendingNumbers: numbers.filter(n => n.status === 'pending').length,
    avgProcessingTime: 5.2 // days
  };

  const addNumber = (entry: Omit<NumberEntry, 'id' | 'startDate' | 'lastUpdated' | 'comments' | 'timeline'>) => {
    const newNumber: NumberEntry = {
      ...entry,
      id: Date.now().toString(),
      startDate: new Date(),
      lastUpdated: new Date(),
      comments: [],
      timeline: [
        { 
          id: Date.now().toString(), 
          stage: entry.processStage, 
          timestamp: new Date(), 
          user: 'Current User', 
          description: 'Entry created' 
        }
      ]
    };
    setNumbers(prev => [...prev, newNumber]);
  };

  const updateNumber = (id: string, updates: Partial<NumberEntry>) => {
    setNumbers(prev => prev.map(num => 
      num.id === id 
        ? { ...num, ...updates, lastUpdated: new Date() }
        : num
    ));
  };

  const deleteNumber = (id: string) => {
    setNumbers(prev => prev.filter(num => num.id !== id));
  };

  const addComment = (numberId: string, comment: string) => {
    const newComment = {
      id: Date.now().toString(),
      text: comment,
      author: 'Current User',
      timestamp: new Date()
    };

    setNumbers(prev => prev.map(num =>
      num.id === numberId
        ? { ...num, comments: [...num.comments, newComment], lastUpdated: new Date() }
        : num
    ));
  };

  const updateProcessStage = (numberId: string, newStage: ProcessStage) => {
    const timelineEvent = {
      id: Date.now().toString(),
      stage: newStage,
      timestamp: new Date(),
      user: 'Current User',
      description: `Stage updated to ${newStage}`
    };

    setNumbers(prev => prev.map(num =>
      num.id === numberId
        ? { 
            ...num, 
            processStage: newStage, 
            lastUpdated: new Date(),
            timeline: [...num.timeline, timelineEvent]
          }
        : num
    ));
  };

  return (
    <DataContext.Provider value={{
      numbers,
      metrics,
      addNumber,
      updateNumber,
      deleteNumber,
      addComment,
      updateProcessStage,
      searchTerm,
      setSearchTerm,
      statusFilter,
      setStatusFilter,
      priorityFilter,
      setPriorityFilter
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}