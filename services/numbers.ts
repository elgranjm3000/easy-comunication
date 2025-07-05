"use server"

import { numberAll,AddNumberParams } from '@/lib/types';
import { promises } from 'dns';

export const getNumber = async (): Promise<numberAll[]> => {
  try {
    const apiUrl = `${process.env.BASE_URL_DINSTAR}`
    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Dashboard-Proxy/1.0',
      },
    });
    const { status } = await response.json()

    const transformedProducts = status.map((status: any) => {
      return {
        port: status.port,
        imei: status.imei,
        iccid: status.iccid,
        imsi: status.imsi,
        sn: status.sn,        
      }
    })
    return transformedProducts
  } catch (error) {
    console.log(error)
  }
}


export const addNumber = async ({
  phoneNumbers,
  countryId = "col",
  apiKey = process.env.KEY_PROVEEDOR,
  endpoint = process.env.ADDRESS_PROVEEDOR  
}): Promise<AddNumberParams[]> => {
  try {
    // Validación básica de los números telefónicos
    if (!phoneNumbers || !Array.isArray(phoneNumbers) || phoneNumbers.length === 0) {
      throw new Error("Debe proporcionar un array válido de números telefónicos");
    }

    const apiUrl = `${endpoint}?key=${apiKey}`;
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        act: "PhoneAddBatch",
        PhoneList: phoneNumbers.map(phoneNum => ({
          Country_ID: countryId,
          Phone_Num: phoneNum.toString().trim() // Aseguramos que sea string y limpiamos espacios
        }))
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.message || `Error en la solicitud: ${response.status}`
      );
    }

    const data = await response.json();
    console.log('Números agregados exitosamente:', data);
    return {
      success: true,
      data: data,
      message: "Números agregados correctamente"
    };
  } catch (error) {
    console.error('Error al agregar números:', error.message);
    return {
      success: false,
      error: error.message,
      message: "Error al agregar números"
    };
  }
};


export const searchNumber = async ({
  batch_id, 
  apiKey = process.env.KEY_PROVEEDOR,
  endpoint = process.env.ADDRESS_PROVEEDOR
}): Promise<SearchNumberParams[]> => {
  try {
    // Validación básica de los números telefónicos
    if (!batch_id || batch_id.length === 0) {
      throw new Error("Debe proporcionar un batch invalido");
    }

    const apiUrl = `${endpoint}?key=${apiKey}`;
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        act: "PhoneBatchResult",
        BatchID: batch_id
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.message || `Error en la solicitud: ${response.status}`
      );
    }

    const data = await response.json();
    return {
      success: true,
      data: data,
      message: "Status de numeros"
    };
  } catch (error) {
    console.error('Error es estatus:', error.message);
    return {
      success: false,
      error: error.message,
      message: "Error en status"
    };
  }
};



//https://ks.firefox.fun/ksapi.ashx?key=75DCE57CFC464AE3