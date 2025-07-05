//https://ks.firefox.fun/goip.ashx?key=C0855ECBF5848529&DeviceID=8006
"use server";
import { NextRequest, NextResponse } from 'next/server';
import { apiClient } from '@/lib/api-client';
import { addNumber, searchNumber } from '@/services/numbers';

interface SMSData {
  port: string;
  iccid: string;
  imei: string;
  imsi: string;
  sn?: string;
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

export async function POST(request: NextRequest) {
  try {
    const { status } = await request.json();

    if (!Array.isArray(status)) {
      return NextResponse.json(
        { error: "El cuerpo debe contener un array 'status'" },
        { status: 400 }
      );
    }

    let batchId: string | undefined; // Cambiado de string | null a string | undefined
    const results: ResultEntry[] = [];

    await Promise.all(
      status.map(async (sms: SMSData, index: number) => {
        const { port, iccid, imei, imsi, sn } = sms;
        const resultEntry: ResultEntry = { 
          sn, 
          success: false,
          message: 'Procesamiento iniciado'
        };

        try {
          if (!sn) {
            resultEntry.message = "Elemento sin SN";
            results.push(resultEntry);
            return;
          }

          // 1. Crear número en lista
          await apiClient.createListNumber({ port, iccid, imei, imsi, sn });

          // 2. Agregar número al batch
          const addResult = await addNumber({
            phoneNumbers: [sn],
            countryId: "col"
          });

          if (!addResult.success) {
            throw new Error(addResult.error || "Error al agregar número");
          }

          batchId = addResult.data.data; // batchId es ahora string | undefined
          resultEntry.batch = batchId;
          resultEntry.message = "Número agregado al batch";

          // 3. Obtener status del batch
          let statusBatch = '1'; // Valor por defecto
          resultEntry.statusBatch = '1';
          if (batchId) { // Verificamos que batchId no sea undefined
            const batchStatusResult = await searchNumber({ batch_id: batchId });
            
            if (batchStatusResult.success && batchStatusResult.data?.data?.[0]) {
              statusBatch = batchStatusResult.data.data[0].Phone_Status || '1';
              resultEntry.statusBatch
            }
          }

          // 4. Obtener y actualizar número
          const listResponse = await apiClient.getListNumbers({ sn });
          const listNumber = listResponse.data[0];

          if (!listNumber?.id) {
            throw new Error(`No se encontró ID para SN: ${sn}`);
          }

          // Actualizamos solo si tenemos batchId y el número no tiene batch
          if (!listNumber.batch_id && batchId) {        

            await apiClient.updateListNumber(listNumber.id,{
                status: resultEntry.statusBatch,
                batch_id: resultEntry.batch // Aquí batchId es definitivamente string
            });
            resultEntry.message = `Número actualizado (status: ${statusBatch})`;
          }

          resultEntry.success = true;
        } catch (error) {
          resultEntry.error = error instanceof Error ? error.message : "Error desconocido";
          resultEntry.message = "Error en el procesamiento";
          console.error(`Error procesando SMS ${index}:`, error);
        }

        results.push(resultEntry);
      })
    );

    return NextResponse.json({
      success: true,
      batchId,
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

export async function GET() {
  return NextResponse.json(
    { error: "Método no soportado" },
    { status: 405 }
  );
}