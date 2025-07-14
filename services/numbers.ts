"use server"

import { numberAll,receiveSms } from '@/lib/types';
import { promises } from 'dns';
import { apiClient } from '@/lib/api-clients-router';

interface PhoneAddBatchParams {
  Country_ID: string;
  Phone_Num: string;
}

interface ApiResponse {
  success: boolean;
  data?: any; // Ajusta este tipo según la respuesta real de tu API
  message: string;
  error?: string;
  code?: string;
}

interface createNumberHistory {
  Item_ID: string;
}

interface AddNumberParams {
  phoneNumbers?: string[]; // o number[] si son números
  countryId?: string;
  apiKey?: string;
  endpoint?: string;
  batch_id?: any;
  content?: any;
}
export const getNumber = async (): Promise<numberAll[] | undefined> => {
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


export const getSmsReceiver = async (): Promise<receiveSms[] | undefined> => {
  try {
    const apiUrl = `${process.env.ADDRESS_PROVEEDOR}?key=${process.env.KEY_PROVEEDOR}&act=GetWaitPhoneList`
    console.log(apiUrl);
    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Dashboard-Proxy/1.0',
      },
    });
    const { data } = await response.json()

    const transformedProducts = await Promise.all(data.map(async (data: any) => {

      await apiClient.createNumberHistory({ Item_ID:data.Item_ID, Phone_GetTime:data.Phone_GetTime, Phone_Num:data.Phone_Num, Country_ID:data.Country_ID });

      return {
        Item_ID: data.Item_ID,
        Phone_GetTime: data.Phone_GetTime,
        Phone_Num: data.Phone_Num,
        Country_ID: data.Country_ID             
      }
    }))
    return transformedProducts
  } catch (error) {
    console.log(error)
  }
}


export const GetResultPhoneList = async (Country_ID:any,Phone_Num:any,Item_ID:any): Promise<receiveSms[] | undefined> => {
  try {
    const apiUrl = `${process.env.ADDRESS_PROVEEDOR}?key=${process.env.KEY_PROVEEDOR}&act=GetResultPhoneList&Country_ID=${Country_ID}&Phone_Num=${Phone_Num}&Item_ID=${Item_ID}`
    console.log(apiUrl);
    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Dashboard-Proxy/1.0',
      },
    });
    const { data } = await response.json()

    const transformedProducts = await Promise.all(data.map(async (data: any) => {

      await apiClient.createNumberHistory({ Item_ID:data.Item_ID, Phone_GetTime:data.Phone_GetTime, Phone_Num:data.Phone_Num, Country_ID:data.Country_ID });

      return {
        Item_ID: data.Item_ID,
        Phone_GetTime: data.Phone_GetTime,
        Phone_Num: data.Phone_Num,
        Phone_IsRet: data.Phone_IsRet,             
        Phone_RetTime: data.Phone_RetTime,
        Phone_Remark: data.Phone_Remark,
        Phone_RemarkTime: data.Phone_RemarkTime
      }
    }))
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
} : AddNumberParams ): Promise<ApiResponse> => {
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
  } catch (error: any) {
    console.error('Error al agregar números:', error.message);
    return {
      success: false,
      error: error.message,
      message: "Error al agregar números"
    };
  }
};



export const deleteAllNumber = async ({
  apiKey = process.env.KEY_PROVEEDOR,
  endpoint = process.env.ADDRESS_PROVEEDOR  
} : AddNumberParams ): Promise<ApiResponse> => {
  try {
    // Validación básica de los números telefónicos  

    const apiUrl = `${endpoint}?key=${apiKey}`;
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        act: "PhoneDeleteAll"
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.message || `Error en la solicitud: ${response.status}`
      );
    }

    const data = await response.json();
    console.log('Números all eliminado:', data);
    return {
      success: true,
      data: data,
      message: "Números eliminado correctamente"
    };
  } catch (error: any) {
    console.error('Error al eliminar los números:', error.message);
    return {
      success: false,
      error: error.message,
      message: "Error al eliminar números"
    };
  }
};

export const deleteNumber = async ({
  phoneNumbers,
  countryId = "col",
  apiKey = process.env.KEY_PROVEEDOR,
  endpoint = process.env.ADDRESS_PROVEEDOR  
} : AddNumberParams ): Promise<ApiResponse> => {
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
        act: "PhoneDeleteBatch",
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
    console.log('Números eliminados exitosamente:', data);
    return {
      success: true,
      data: data,
      message: "Números eliminado correctamente"
    };
  } catch (error: any) {
    console.error('Error al eliminar números:', error.message);
    return {
      success: false,
      error: error.message,
      message: "Error al eliminar números"
    };
  }
};


export const sendSms = async ({
  phoneNumbers,
  content,
  countryId = "col",
  apiKey = process.env.KEY_PROVEEDOR,
  endpoint = process.env.ADDRESS_PROVEEDOR  
} : AddNumberParams ): Promise<ApiResponse> => {
  try {
    // Validación básica de los números telefónicos
    if (!phoneNumbers) {
      throw new Error("Debe proporcionar un array válido de números telefónicos");
    }

    const apiUrl = `${endpoint}?key=${apiKey}`;
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        act: "UploadSms",
        Country_ID: countryId,
        Phone_Num: phoneNumbers,
        Phone_SmsContent: content       
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.message || `Error en la solicitud: ${response.status}`
      );
    }

    const data = await response.json();
    console.log('send mensaje:', data);
    return {
      success: true,
      data: data,
      message: "Mensaje enviado"
    };
  } catch (error: any) {
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
} : AddNumberParams ): Promise<ApiResponse> => {
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
  } catch (error: any) {
    console.error('Error es estatus:', error.message);
    return {
      success: false,
      error: error.message,
      message: "Error en status"
    };
  }
};



//https://ks.firefox.fun/ksapi.ashx?key=75DCE57CFC464AE3