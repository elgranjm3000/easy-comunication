//https://ks.firefox.fun/goip.ashx?key=C0855ECBF5848529&DeviceID=8006
"use server";
import { NextRequest, NextResponse } from 'next/server';
import { apiClient } from '@/lib/api-clients-router';
import { addNumber, searchNumber, deleteAllNumber, deleteNumber } from '@/services/numbers';
import { Buffer } from 'buffer';

const CONFIG = {
  USERNAME: "root",
  PASSWORD: "T3st2025..@",
  HEADERS: {
    "User-Agent": "Mozilla/5.0"
  }
};


interface ApiParams {
  username: string;
  password: string;
  port: number;
  sms_num: number;
}

interface SMSData {
  port: string;
  iccid: string;
  imei: string;
  imsi: string;
  sn?: string;
  st?: string | number | undefined;
  active?: string | number | undefined; 
  slot_active?: string | number | undefined;
}

interface ResultEntry {
  sn?: string;
  success: boolean;
  message?: string;
  error?: string;
  batch?: string; // Cambiado a optional string en lugar de string | null
  statusBatch?: string;
}

interface UpdateListNumberParams {
  id: string;
  status: string;
  batch_id?: string; // Acepta string | undefined pero no null
}

interface AddNumberResponse  {
  success?: boolean;
  error?: string;
  data?: {
    data: any[]
  };
};

interface ApiListResponse<T = any> {
  data: T[];  
  pagination?: any;
}

interface SMSMessage {
  id: string;
  contenido: string;
  fecha: Date;
  // ... otras propiedades que esperas
}

export async function POST(request: NextRequest) {
  try {
    const { status } = await request.json();

    if (!Array.isArray(status)) {
      return NextResponse.json(
        { error: "El cuerpo debe contener un array 'status'" },
        { status: 400 }
      );
    }

    const results: ResultEntry[] = [];
    const CHUNK_SIZE = 50; // Tamaño del lote
    const batchIds: string[] = []; // Almacenar todos los batchIds generados

    //await deleteAllNumber({}); // ESTO HACE QUE SE MANTENGA LOS SERVICIOS
    await apiClient.updateListNumber(); // actualiza todos los status a 0 en base de dato


    // Función para dividir el array en chunks
    const chunkArray = (array: any[], size: number) => {
      const chunks = [];
      for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
      }
      return chunks;
    };

    // Dividimos el array original en chunks de 50 elementos
    const chunks = chunkArray(status, CHUNK_SIZE);

    // Procesamos cada chunk secuencialmente
    for (const chunk of chunks) {
      // 1. Primero procesamos todos los números del chunk para crear en lista
      await Promise.all(
        chunk.map(async (sms: SMSData) => {
          const { port, iccid, imei, imsi, sn, st, active, slot_active } = sms;
          
          const flagsValid = (
            Number(st) === 3 &&
            Number(active) === 1 &&
            Number(slot_active) === 1
          );
          
          if (!sn) return; // Saltamos si no cumple requisitos

          await apiClient.createListNumber({ port, iccid, imei, imsi, sn, st, active, slot_active });
        })
      );

      // 2. Filtramos y obtenemos solo los números válidos del chunk
      const validSMS = chunk.filter(sms => {
        const { st, active, slot_active, sn } = sms;
        return (
          Number(active) === 1
        );
      });

      if (validSMS.length === 0) continue;

      const phoneNumbers = validSMS.map(sms => sms.sn);
      let batchId: any | undefined;

      try {
        // 3. Agregamos todos los números del chunk en una sola llamada
        const addResult = await addNumber({
          phoneNumbers, // Enviamos todos los números juntos
          countryId: "col",            
        }) as AddNumberResponse;

        if (!addResult.success) {
          throw new Error(addResult.error || "Error al agregar números");
        }

        batchId = addResult.data?.data;
        if (batchId) batchIds.push(batchId);

        // 4. Procesamos cada número individualmente para actualizar su estado
        await Promise.all(
          validSMS.map(async (sms: SMSData) => {
            const { sn } = sms;
            const resultEntry: ResultEntry = { 
              sn, 
              success: false,
              message: 'Procesamiento iniciado',
              batch: batchId
            };

            try {
              // Obtener status del batch (puede ser el mismo para todos en el chunk)
              let statusBatch = '1';
              if (batchId) {
                const batchStatusResult = await searchNumber({ batch_id: batchId }) as AddNumberResponse;
                if (batchStatusResult.success && batchStatusResult.data?.data?.[0]) {
                  statusBatch = batchStatusResult.data.data[0].Phone_Status || '1';
                }
              }

              // Obtener y actualizar número
              const listResponse = await apiClient.getListNumbers({ sn }) as ApiListResponse;
              const listNumber = listResponse.data[0];

              if (!listNumber?.id) {
                throw new Error(`No se encontró ID para SN: ${sn}`);
              }

              if (!listNumber.batch_id && batchId) {
                await apiClient.updateListNumber(listNumber.id, {
                  status: statusBatch,
                  batch_id: batchId
                });
                resultEntry.message = `Número actualizado (status: ${statusBatch})`;
              }

              resultEntry.success = true;
              resultEntry.statusBatch = statusBatch;
            } catch (error) {
              resultEntry.error = error instanceof Error ? error.message : "Error desconocido";
              resultEntry.message = "Error en el procesamiento individual";
            }

            results.push(resultEntry);
          })
        );
      } catch (error) {
        // Manejo de errores para todo el chunk
        console.error(`Error procesando chunk:`, error);
        validSMS.forEach(sms => {
          results.push({
            sn: sms.sn,
            success: false,
            message: "Error en el procesamiento del lote",
            error: error instanceof Error ? error.message : "Error desconocido"
          });
        });
      }

      // Pequeña pausa entre lotes
      await new Promise(resolve => setTimeout(resolve, 1000));
    }


    const listResponse = await apiClient.getListNumbers({ active_status: "0" }) as ApiListResponse;
    const totalRegistros = listResponse.pagination.total

    console.log("total numero: ",listResponse.pagination.total);
    const totalPaginas = Math.ceil(totalRegistros / 100);
    const registrosPorPagina = 100;
    let pagina = 1;
    let procesadosTotal = 0;
    let errores = 0;

      try {
        while (true) {
          const offset = (pagina - 1) * registrosPorPagina;
          
          // 1. Obtener lote actual
          const response = await apiClient.getListNumbers({ 
            active_status: "0", 
            offset : offset.toString(),
            limit: registrosPorPagina.toString()
          }) as ApiListResponse;
          
          // Validar respuesta
          if (!response?.data || response.data.length === 0) {
            console.log('✅ No hay más registros por procesar');
            break;
          }

          // 2. Procesar números
          const phoneNumbers = response.data
            .map(smsList => smsList?.sn)
            .filter((sn): sn is string => !!sn); // Type guard

          // 3. Eliminar lote (si hay números)
          if (phoneNumbers.length > 0) {
            try {
              await deleteNumber({
                phoneNumbers,
                countryId: "col",
              });
              procesadosTotal += phoneNumbers.length;
              console.log(`♻️ Lote ${pagina} OK - ${phoneNumbers.length} números`);
            } catch (error) {
              errores += phoneNumbers.length;
              console.error(`❌ Error en lote ${pagina}:`);              
            }
          }

          // 4. Controlar siguiente iteración
          if (response.data.length < registrosPorPagina) {
            console.log('✅ Última página completada');
            break;
          }
          
          pagina++;
          
          // Pausa entre lotes para no saturar la API
          await new Promise(resolve => setTimeout(resolve, 500)); // 500ms
        }
      } catch (error) {
        console.error('Error general en el proceso:', error);
      } finally {
        console.log(`
        🏁 Proceso completado:
        - Páginas procesadas: ${pagina}
        - Números eliminados: ${procesadosTotal}
        - Errores: ${errores}
        `);
      }



    return NextResponse.json({
      success: true,
      batchIds, // Devolvemos todos los batchIds generados
      processedCount: results.length,
      successCount: results.filter(r => r.success).length,
      details: results
    });

  } catch (error) {
    console.error('Error en el endpoint:', error);
    return NextResponse.json(
      { 
        error: "Error interno del servidor",
        details: error instanceof Error ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Obtener parámetros de la URL
    const { searchParams } = new URL(request.url);
    const portParam = searchParams.get('port') || 1;
    const smsNumParam = searchParams.get('sms_num') || 0;

    const port = portParam ? Number(portParam) : 1; 
    const smsNum = smsNumParam ? Number(smsNumParam) : 0;

    // Validar parámetros
    if (isNaN(port) || isNaN(smsNum)) {
      return NextResponse.json(
        { error: "Parámetros inválidos" },
        { status: 400 }
      );
    }

    

    // Construir URL de consulta
    const url = `${process.env.BASE_URL_DINSTAR_MAIN}/goip_get_sms.html`;
    const params = new URLSearchParams({
      username: CONFIG.USERNAME,
      password: CONFIG.PASSWORD,
      port: port.toString(),  
      sms_num: smsNum.toString()  
    } as Record<string, string>); 

  

    // Hacer la petición al servidor GOIP
    const response = await fetch(`${url}?${params.toString()}`, {
      headers: CONFIG.HEADERS,
      signal: AbortSignal.timeout(10000) // 10 segundos
    } );

    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }

    const data = await response.json();

    if (data.code !== 0) {
      return NextResponse.json(
        { error: data.reason || "Error en la respuesta del servidor GOIP" },
        { status: 500 }
      );
    }
  

    // Procesar los mensajes
    const mensajes = data.data.map((sms: any) => {

      
      const [_, port, timestamp, remitente, receptor, contenido_b64] = sms;
      
      let contenido;
      try {
        contenido = Buffer.from(contenido_b64, 'base64').toString('utf-8');
      } catch (error) {
        contenido = "<ERROR AL DECODIFICAR>";
      }

      const fecha = new Date(timestamp * 1000).toISOString();

      return {
        puerto: port,
        fecha,
        remitente,
        receptor,
        contenido
      };
    });

    return NextResponse.json({
      success: true,
      count: mensajes.length,
      mensajes
    });

  } catch (error) {
    console.error("Error al consultar SMS:", error);
    return NextResponse.json(
      { error:  "Error al consultar los mensajes" },
      { status: 500 }
    );
  }
}