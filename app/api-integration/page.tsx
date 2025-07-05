'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  AlertCircle, 
  CheckCircle, 
  Loader2, 
  RefreshCw, 
  Trash2, 
  Globe,
  Key,
  User,
  Database,
  Download,
  Eye,
  EyeOff,
  Link,
  Copy,
  Check,
  Shield,
  Server,
  Info
} from 'lucide-react';
import { Navigation } from '@/components/dashboard/navigation';

interface ApiCredentials {
  baseUrl: string;
  username: string;
  password: string;
  method: 'GET' | 'POST';
  useProxy: boolean;
}

interface ApiResponse {
  success: boolean;
  data: any[];
  error?: string;
  timestamp: Date;
  responseTime: number;
  finalUrl?: string;
  corsError?: boolean;
}

export default function ApiIntegrationPage() {
  const [credentials, setCredentials] = useState<ApiCredentials>({
    baseUrl: '',
    username: '',
    password: '',
    method: 'GET',
    useProxy: false
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<ApiResponse | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [urlCopied, setUrlCopied] = useState(false);

  // Generate the final URL with query parameters
  const generateFinalUrl = (): string => {
    if (!credentials.baseUrl || !credentials.username || !credentials.password) {
      return '';
    }

    try {
      const url = new URL(credentials.baseUrl);
      url.searchParams.set('username', credentials.username);
      url.searchParams.set('password', credentials.password);
      return url.toString();
    } catch {
      return '';
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validate Base URL
    if (!credentials.baseUrl.trim()) {
      newErrors.baseUrl = 'URL base del endpoint es requerida';
    } else {
      try {
        new URL(credentials.baseUrl);
      } catch {
        newErrors.baseUrl = 'URL no válida. Debe incluir protocolo (http:// o https://)';
      }
    }

    // Validate Username
    if (!credentials.username.trim()) {
      newErrors.username = 'Nombre de usuario es requerido';
    } else if (credentials.username.length < 2) {
      newErrors.username = 'El nombre de usuario debe tener al menos 2 caracteres';
    }

    // Validate Password
    if (!credentials.password.trim()) {
      newErrors.password = 'Contraseña es requerida';
    } else if (credentials.password.length < 3) {
      newErrors.password = 'La contraseña debe tener al menos 3 caracteres';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const makeDirectRequest = async (finalUrl: string): Promise<ApiResponse> => {
    const startTime = Date.now();
    
    try {
      const requestOptions: RequestInit = {
        method: credentials.method,
        headers: {
          'Content-Type': 'application/json',
        },
        mode: 'cors',
        credentials: 'include',
      };

      const response = await fetch(finalUrl, requestOptions);
      const responseTime = Date.now() - startTime;

      console.log("example ",response);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const normalizedData = Array.isArray(data) ? data : [data];

      return {
        success: true,
        data: normalizedData,
        timestamp: new Date(),
        responseTime,
        finalUrl
      };

    } catch (error) {
      const responseTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      const isCorsError = errorMessage.includes('CORS') || errorMessage.includes('blocked');
      console.log("error aqui", errorMessage);

      return {
        success: false,
        data: [],
        error: errorMessage,
        timestamp: new Date(),
        responseTime,
        finalUrl,
        corsError: isCorsError
      };
    }
  };

  const makeProxyRequest = async (finalUrl: string): Promise<ApiResponse> => {
    const startTime = Date.now();
    
    try {
      const response = await fetch('/api/proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: finalUrl,
          method: credentials.method
        })
      });

      const responseTime = Date.now() - startTime;
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      if (!result.success) {
        throw new Error(result.error || 'Proxy request failed');
      }

      const normalizedData = Array.isArray(result.data) ? result.data : [result.data];

      return {
        success: true,
        data: normalizedData,
        timestamp: new Date(),
        responseTime,
        finalUrl
      };

    } catch (error) {
      const responseTime = Date.now() - startTime;
      return {
        success: false,
        data: [],
        error: error instanceof Error ? error.message : 'Error desconocido',
        timestamp: new Date(),
        responseTime,
        finalUrl
      };
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setResponse(null);
    
    const finalUrl = generateFinalUrl();

    try {
      let result: ApiResponse;
      
      if (credentials.useProxy) {
        result = await makeProxyRequest(finalUrl);
      } else {
        result = await makeDirectRequest(finalUrl);
      }

      setResponse(result);

    } catch (error) {
      setResponse({
        success: false,
        data: [],
        error: error instanceof Error ? error.message : 'Error desconocido',
        timestamp: new Date(),
        responseTime: 0,
        finalUrl
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setCredentials({
      baseUrl: '',
      username: '',
      password: '',
      method: 'GET',
      useProxy: false
    });
    setResponse(null);
    setErrors({});
  };

  const copyUrlToClipboard = async () => {
    const finalUrl = generateFinalUrl();
    if (finalUrl) {
      try {
        await navigator.clipboard.writeText(finalUrl);
        setUrlCopied(true);
        setTimeout(() => setUrlCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy URL:', err);
      }
    }
  };

  const exportToCSV = () => {
    if (!response?.data.length) return;

    const headers = Object.keys(response.data[0]);
    const csvContent = [
      headers.join(','),
      ...response.data.map(row => 
        headers.map(header => 
          JSON.stringify(row[header] || '')
        ).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `api-data-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderDataTable = () => {
    if (!response?.data.length) return null;

    const firstItem = response.data[0];
    const headers = Object.keys(firstItem);

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold">Datos Recibidos</h3>
            <Badge variant="secondary">{response.data.length} registros</Badge>
          </div>
          <Button onClick={exportToCSV} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
        </div>

        <div className="border rounded-lg">
          <ScrollArea className="h-96">
            <Table>
              <TableHeader>
                <TableRow>
                  {headers.map((header) => (
                    <TableHead key={header} className="font-semibold">
                      {header}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {response.data.map((item, index) => (
                  <TableRow key={index}>
                    {headers.map((header) => (
                      <TableCell key={header}>
                        {typeof item[header] === 'object' 
                          ? JSON.stringify(item[header]) 
                          : String(item[header] || '-')
                        }
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>
      </div>
    );
  };

  const finalUrl = generateFinalUrl();

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="lg:pl-64">
        <main className="p-6 space-y-6">
          {/* Header */}
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">Integración de API</h1>
            <p className="text-muted-foreground">
              Conecta con APIs externas usando parámetros de consulta para autenticación
            </p>
          </div>

          {/* CORS Information Alert */}
          <Alert className="border-blue-200 bg-blue-50">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              <strong>Información sobre CORS:</strong> Si experimentas errores de CORS, activa el "Modo Proxy" 
              para hacer las solicitudes a través del servidor de la aplicación.
            </AlertDescription>
          </Alert>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Configuration Form */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Configuración de API
                </CardTitle>
                <CardDescription>
                  Formato: http://miurl?username=usuario&password=contraseña
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Base URL Field */}
                  <div className="space-y-2">
                    <Label htmlFor="baseUrl" className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      URL Base del Endpoint *
                    </Label>
                    <Input
                      id="baseUrl"
                      type="url"
                      placeholder="http://miurl"
                      value={credentials.baseUrl}
                      onChange={(e) => setCredentials({ ...credentials, baseUrl: e.target.value })}
                      className={errors.baseUrl ? 'border-red-500' : ''}
                    />
                    {errors.baseUrl && (
                      <p className="text-sm text-red-600 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.baseUrl}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Solo la URL base, sin parámetros. Ejemplo: http://api.ejemplo.com/datos
                    </p>
                  </div>

                  {/* HTTP Method */}
                  <div className="space-y-2">
                    <Label>Método HTTP</Label>
                    <Select 
                      value={credentials.method} 
                      onValueChange={(value: 'GET' | 'POST') => 
                        setCredentials({ ...credentials, method: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="GET">GET</SelectItem>
                        <SelectItem value="POST">POST</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Username Field */}
                  <div className="space-y-2">
                    <Label htmlFor="username" className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Nombre de Usuario *
                    </Label>
                    <Input
                      id="username"
                      type="text"
                      placeholder="usuario_api"
                      value={credentials.username}
                      onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                      className={errors.username ? 'border-red-500' : ''}
                    />
                    {errors.username && (
                      <p className="text-sm text-red-600 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.username}
                      </p>
                    )}
                  </div>

                  {/* Password Field */}
                  <div className="space-y-2">
                    <Label htmlFor="password" className="flex items-center gap-2">
                      <Key className="h-4 w-4" />
                      Contraseña *
                    </Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="contraseña_api"
                        value={credentials.password}
                        onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                        className={errors.password ? 'border-red-500 pr-10' : 'pr-10'}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    {errors.password && (
                      <p className="text-sm text-red-600 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.password}
                      </p>
                    )}
                  </div>

                  {/* Proxy Mode Toggle */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
                      <div className="flex items-center gap-2">
                        <Server className="h-4 w-4 text-blue-600" />
                        <div>
                          <Label className="font-medium">Modo Proxy</Label>
                          <p className="text-xs text-muted-foreground">
                            Evita errores de CORS usando el servidor como proxy
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant={credentials.useProxy ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCredentials({ ...credentials, useProxy: !credentials.useProxy })}
                      >
                        {credentials.useProxy ? (
                          <>
                            <Shield className="h-4 w-4 mr-1" />
                            Activado
                          </>
                        ) : (
                          'Activar'
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Generated URL Preview */}
                  {finalUrl && (
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Link className="h-4 w-4" />
                        URL Final Generada
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          value={finalUrl}
                          readOnly
                          className="font-mono text-sm"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={copyUrlToClipboard}
                          className="px-3"
                        >
                          {urlCopied ? (
                            <Check className="h-4 w-4 text-green-600" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {credentials.useProxy 
                          ? 'Esta URL se enviará a través del proxy del servidor'
                          : 'Esta URL se utilizará directamente desde el navegador'
                        }
                      </p>
                    </div>
                  )}

                  <Separator />

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <Button 
                      type="submit" 
                      disabled={isLoading || !finalUrl}
                      className="flex-1"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Conectando...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Conectar API
                        </>
                      )}
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={handleClear}
                      disabled={isLoading}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Limpiar
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Response Status */}
            <Card>
              <CardHeader>
                <CardTitle>Estado de la Conexión</CardTitle>
                <CardDescription>
                  Información sobre la última solicitud realizada
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!response ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Globe className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No se ha realizado ninguna conexión aún</p>
                    <p className="text-sm">Completa el formulario y haz clic en "Conectar API"</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Status Alert */}
                    <Alert className={response.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                      {response.success ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-red-600" />
                      )}
                      <AlertDescription className={response.success ? 'text-green-800' : 'text-red-800'}>
                        {response.success 
                          ? `Conexión exitosa. ${response.data.length} registros recibidos.`
                          : `Error: ${response.error}`
                        }
                      </AlertDescription>
                    </Alert>

                    {/* CORS Error Suggestion */}
                    {response.corsError && !credentials.useProxy && (
                      <Alert className="border-yellow-200 bg-yellow-50">
                        <Shield className="h-4 w-4 text-yellow-600" />
                        <AlertDescription className="text-yellow-800">
                          <strong>Sugerencia:</strong> Este parece ser un error de CORS. 
                          Intenta activar el "Modo Proxy\" para solucionarlo.
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* Response Metadata */}
                    <div className="grid grid-cols-1 gap-4 text-sm">
                      <div>
                        <Label className="text-muted-foreground">
                          {credentials.useProxy ? 'URL Procesada por Proxy' : 'URL Utilizada'}
                        </Label>
                        <p className="font-mono text-xs break-all bg-gray-50 p-2 rounded">
                          {response.finalUrl}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-muted-foreground">Timestamp</Label>
                          <p className="font-medium">{response.timestamp.toLocaleString()}</p>
                          <p className="font-medium">cuanto: {response.data.length}</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Tiempo de Respuesta</Label>
                          <p className="font-medium">{response.responseTime}ms</p>
                        </div>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Método de Conexión</Label>
                        <Badge variant={credentials.useProxy ? "default" : "secondary"}>
                          {credentials.useProxy ? 'Proxy Server' : 'Directo'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Data Display */}
          {response?.success && response.data.length > 0 && (
            <Card>
              <CardContent className="pt-6">
                {renderDataTable()}
              </CardContent>
            </Card>
          )}
        </main>
      </div>
    </div>
  );
}