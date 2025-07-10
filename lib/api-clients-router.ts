// API client for interacting with the MySQL backend

const API_BASE_URL = `${process.env.BASE_URL_NEXT}/api`;
//const API_BASE_URL = "/api";

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  details?: string;
  message?: string;
  pagination?: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}


export interface listNumber {  
  id: string;
  port?: string;
  iccid?: string;
  imei?: string;
  imsi?: string;
  data?:any,
  sn:string;
  batch_id: string;
  status: string;
  offset: string;
  limit:string;
}


export interface numberHistory {  
  Item_ID: string;
  Phone_GetTime?: string;
  Phone_Num?: string;
  Country_ID?: string;  
}


export interface NumberData {
  id: string;
  number_ref: string;
  process_stage: string;
  start_date: string;
  last_updated: string;
  status: string;
  priority: string;
  assigned_to: string;
  comment_count?: number;
  timeline_count?: number;
  comments?: CommentData[];
  timeline?: TimelineData[];
}

export interface CommentData {
  id: string;
  number_id: string;
  text: string;
  author: string;
  timestamp: string;
}

export interface TimelineData {
  id: string;
  number_id: string;
  stage: string;
  timestamp: string;
  user: string;
  description: string;
}

export interface MetricsData {
  totalNumbers: number;
  completedNumbers: number;
  pendingNumbers: number;
  avgProcessingTime: number;
  distributions: {
    status: Array<{ status: string; count: number }>;
    priority: Array<{ priority: string; count: number }>;
    stage: Array<{ process_stage: string; count: number }>;
  };
  recentActivity: Array<{ date: string; count: number }>;
}

class ApiClient {
  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error(`API Error (${endpoint}):`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  // Numbers API
  async apiSms(params?: {
    port?: string;    
  }): Promise<ApiResponse<NumberData[]>> {
    const searchParams = new URLSearchParams();    
    if (params?.port) searchParams.set('port', params.port);
    const query = searchParams.toString();
    return this.request<NumberData[]>(`/sms${query ? `?${query}` : ''}`);
  }


  async getNumbers(params?: {
    search?: string;
    status?: string;
    priority?: string;
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse<NumberData[]>> {
    const searchParams = new URLSearchParams();
    
    if (params?.search) searchParams.set('search', params.search);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.priority) searchParams.set('priority', params.priority);
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.offset) searchParams.set('offset', params.offset.toString());

    const query = searchParams.toString();
    return this.request<NumberData[]>(`/numbers${query ? `?${query}` : ''}`);
  }

  async getNumber(id: string): Promise<ApiResponse<NumberData>> {
    return this.request<NumberData>(`/numbers/${id}`);
  }

  async createNumber(data: {
    numberRef: string;
    processStage?: string;
    status?: string;
    priority?: string;
    assignedTo: string;
  }): Promise<ApiResponse<NumberData>> {
    return this.request<NumberData>('/numbers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateNumber(id: string, data: {
    numberRef?: string;
    processStage?: string;
    status?: string;
    priority?: string;
    assignedTo?: string;
  }): Promise<ApiResponse<NumberData>> {
    return this.request<NumberData>(`/numbers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteNumber(id: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/numbers/${id}`, {
      method: 'DELETE',
    });
  }

  // Comments API
  async getComments(numberId: string): Promise<ApiResponse<CommentData[]>> {
    return this.request<CommentData[]>(`/numbers/${numberId}/comments`);
  }

  async addComment(numberId: string, data: {
    text: string;
    author?: string;
  }): Promise<ApiResponse<CommentData>> {
    return this.request<CommentData>(`/numbers/${numberId}/comments`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Timeline API
  async getTimeline(numberId: string): Promise<ApiResponse<TimelineData[]>> {
    return this.request<TimelineData[]>(`/numbers/${numberId}/timeline`);
  }

  async addTimelineEvent(numberId: string, data: {
    stage: string;
    user?: string;
    description: string;
  }): Promise<ApiResponse<TimelineData>> {
    return this.request<TimelineData>(`/numbers/${numberId}/timeline`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }


  //LIST NUMBERS

  async getListNumbers(params?: { 
    id?: string; 
    batch_id?: string;
    users_id?: string;
    sn?:string;  
    offset?:string;
    limit?: string;
    status?:string;
      
  }): Promise<ApiResponse<listNumber[]>> {
    const searchParams = new URLSearchParams();    
    if (params?.id) searchParams.set('id', params.id);    
    if (params?.batch_id) searchParams.set('batch_id', params.batch_id);
    if (params?.users_id) searchParams.set('users_id', params.users_id);    
    if (params?.sn) searchParams.set('sn', params.sn);
    if (params?.offset) searchParams.set('offset', params.offset);
    if (params?.limit) searchParams.set('limit', params.limit);
    if (params?.status) searchParams.set('status', params.status);

    const query = searchParams.toString();
    console.log(query);
    return this.request<listNumber[]>(`/listnumber${query ? `?${query}` : ''}`);
  }

  async createNumberHistory(data: {
    Item_ID: string;
    Phone_GetTime: string;
    Phone_Num: string;
    Country_ID: string;    
  }): Promise<ApiResponse<numberHistory>> {
    return this.request<numberHistory>('/listnumber/history', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }


  async updateHistory(id: string, data: {
    id?: string; 
    mensaje?: string;
    
  }): Promise<ApiResponse<listNumber>> {
    return this.request<listNumber>(`/listnumber/history/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async createListNumber(data: {
    port: string;
    iccid: string;
    imei: string;
    imsi: string;
    sn: string;    
  }): Promise<ApiResponse<listNumber>> {
    return this.request<listNumber>('/listnumber', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }


  async updateListNumber(id: string, data: {
    id?: string; 
    batch_id?: string;
    status?: string;     
  }): Promise<ApiResponse<listNumber>> {
    return this.request<listNumber>(`/listnumber/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Metrics API
  async getMetrics(): Promise<ApiResponse<MetricsData>> {
    return this.request<MetricsData>('/numbers/metrics');
  }

  // Database initialization
  async initializeDatabase(): Promise<ApiResponse<void>> {
    return this.request<void>('/init-db', {
      method: 'POST',
    });
  }

  async checkDatabaseStatus(): Promise<ApiResponse<any>> {
    return this.request<any>('/init-db');
  }
}

export const apiClient = new ApiClient();