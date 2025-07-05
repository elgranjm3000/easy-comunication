'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Database, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  Play, 
  RefreshCw,
  Server,
  Settings,
  Info
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';

export default function DatabaseSetupPage() {
  const [isInitializing, setIsInitializing] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [initResult, setInitResult] = useState<any>(null);
  const [statusResult, setStatusResult] = useState<any>(null);
  const [error, setError] = useState<string>('');

  const handleInitializeDatabase = async () => {
    setIsInitializing(true);
    setError('');
    setInitResult(null);

    try {
      const response = await apiClient.initializeDatabase();
      setInitResult(response);
      
      if (response.success) {
        // Also check status after successful initialization
        await handleCheckStatus();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsInitializing(false);
    }
  };

  const handleCheckStatus = async () => {
    setIsChecking(true);
    setError('');

    try {
      const response = await apiClient.checkDatabaseStatus();
      setStatusResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Database Setup</h1>
          <p className="text-muted-foreground">
            Initialize and configure your MySQL database for the dashboard
          </p>
        </div>

        {/* Configuration Info */}
        <Alert className="border-blue-200 bg-blue-50">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <strong>Before proceeding:</strong> Make sure you have created a <code>.env.local</code> file 
            with your database credentials. See <code>.env.example</code> for reference.
          </AlertDescription>
        </Alert>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Database Initialization */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Initialize Database
              </CardTitle>
              <CardDescription>
                Create all necessary tables and initial data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-medium">This will create:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• <code>numbers</code> - Main tracking table</li>
                  <li>• <code>comments</code> - Comments for each number</li>
                  <li>• <code>timeline</code> - Process stage history</li>
                  <li>• <code>users</code> - User management</li>
                </ul>
              </div>

              <Separator />

              <Button 
                onClick={handleInitializeDatabase}
                disabled={isInitializing}
                className="w-full"
              >
                {isInitializing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Initializing...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Initialize Database
                  </>
                )}
              </Button>

              {initResult && (
                <Alert className={initResult.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                  {initResult.success ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-600" />
                  )}
                  <AlertDescription className={initResult.success ? 'text-green-800' : 'text-red-800'}>
                    {initResult.success 
                      ? initResult.message || 'Database initialized successfully!'
                      : initResult.error || 'Initialization failed'
                    }
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Database Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5" />
                Database Status
              </CardTitle>
              <CardDescription>
                Check connection and table status
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                onClick={handleCheckStatus}
                disabled={isChecking}
                variant="outline"
                className="w-full"
              >
                {isChecking ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Checking...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Check Status
                  </>
                )}
              </Button>

              {statusResult && (
                <div className="space-y-4">
                  <Alert className={statusResult.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                    {statusResult.success ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-600" />
                    )}
                    <AlertDescription className={statusResult.success ? 'text-green-800' : 'text-red-800'}>
                      {statusResult.success 
                        ? 'Database connection successful!'
                        : statusResult.error || 'Connection failed'
                      }
                    </AlertDescription>
                  </Alert>

                  {statusResult.success && statusResult.tables && (
                    <div className="space-y-2">
                      <h4 className="font-medium">Existing Tables:</h4>
                      <div className="flex flex-wrap gap-2">
                        {statusResult.tables.map((table: any, index: number) => (
                          <Badge key={index} variant="secondary">
                            {table.TABLE_NAME}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Configuration Guide */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Configuration Guide
            </CardTitle>
            <CardDescription>
              Step-by-step setup instructions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3">
                <h4 className="font-medium">1. Database Setup</h4>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>Create a MySQL database:</p>
                  <code className="block bg-gray-100 p-2 rounded text-xs">
                    CREATE DATABASE dashboard_db;
                  </code>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium">2. Environment Variables</h4>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>Create <code>.env.local</code> file:</p>
                  <code className="block bg-gray-100 p-2 rounded text-xs">
                    DB_HOST=localhost<br/>
                    DB_USER=root<br/>
                    DB_PASSWORD=your_password<br/>
                    DB_NAME=dashboard_db
                  </code>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium">3. Initialize Tables</h4>
                <div className="text-sm text-muted-foreground">
                  <p>Click &quot;Initialize Database&quot; above to create all required tables and indexes.</p>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium">4. Verify Setup</h4>
                <div className="text-sm text-muted-foreground">
                  <p>Use &#34;Check Status&#34; to verify the connection and table creation.</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Next Steps */}
        {initResult?.success && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              <strong>Setup Complete!</strong> Your database is ready. You can now use the dashboard 
              to manage numbers. The API endpoints are available at <code>/api/numbers</code>.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}