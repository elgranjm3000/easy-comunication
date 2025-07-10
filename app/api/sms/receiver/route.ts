//https://ks.firefox.fun/goip.ashx?key=C0855ECBF5848529&DeviceID=8006
"use server";
import { NextRequest, NextResponse } from 'next/server';
import { apiClient } from '@/lib/api-clients-router';
import { addNumber, searchNumber,getSmsReceiver } from '@/services/numbers';
import { Buffer } from 'buffer';

interface SMSData {
  port: string;
  iccid: string;
  imei: string;
  imsi: string;
  sn?: string;
  st?: string | number;
  active?: string | number; 
  slot_active?: string | number;
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
}

export async function GET(request: NextRequest) {
  try {
    // Obtener los datos del receptor de SMS
    const response = await getSmsReceiver() as AddNumberResponse;
    
    // Verificar si la respuesta fue exitosa
    if (!response) {
      return NextResponse.json(
        { 
          error: "Error al obtener datos del receptor de SMS",
          details: "Error desconocido"
        },
        { status: 400 }
      );
    }

    // Devolver los datos directamente
    return NextResponse.json({
      success: true,
      data: response
    });

  } catch (error) {
    console.error('Error en el endpoint GET:', error);
    return NextResponse.json(
      { 
        error: "Error interno del servidor",
        details: error instanceof Error ? error.message : undefined
      },
      { status: 500 }
    );
  }
}