import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase, generateUUID } from '@/lib/database';
import { RowDataPacket } from 'mysql2';
import { GetResultPhoneList,getSmsReceiver } from '@/services/numbers';
import { apiClient } from '@/lib/api-clients-router';
import { sendSms, deleteNumber, addNumber } from '@/services/numbers';
import { receiveSms } from '@/lib/types';


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
  mensajes?:string;
  contenido?:string;
  code?:string | number;
}

interface Mensaje {
  contenido?: string;
  code?: string;
  
}

export async function GET(request: NextRequest) {
  const connection = await connectToDatabase();
  
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const id = searchParams.get('id') || '';    
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    /*let query = `
      SELECT * FROM serviceHistory
      WHERE 1=1 and (evaluado IS NULL or evaluado = 0)
    `;*/

    let query  = `SELECT a.*, b.sn AS numeroList, b.active_status 
      FROM serviceHistory a INNER 
      JOIN listnumber b ON CONCAT('57', a.Phone_Num) = b.sn 
      WHERE 1=1 and b.active_status = 1`;
    
    const params: any[] = [];
   
    //query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    //params.push(limit, offset);

    await getSmsReceiver()
    const [rows] = await connection.execute<RowDataPacket[]>(query, params);

    for (const row of rows) {      
      const responsePhone = await GetResultPhoneList(row.Country_ID,row.Phone_Num,row.Item_ID) as receiveSms[];

      if(responsePhone && responsePhone[0]){
        const shouldSkipSend = (
          responsePhone[0].Phone_IsRet  === true          
        );
          if (shouldSkipSend){
            const updateQuery = `UPDATE serviceHistory 
                         SET Phone_IsRet = ?, Phone_RetTime = ?, Phone_Remark = ?, Phone_RemarkTime = ?
                         WHERE id = ?`;    
                        const updateParams = [
                          responsePhone[0].Phone_IsRet,  
                          responsePhone[0].Phone_RetTime,  
                          responsePhone[0].Phone_Remark,  
                          responsePhone[0].Phone_RemarkTime,  
                          row.id       
                        ];
            await connection.execute(updateQuery, updateParams);    
            
            const responseListNumbers = await apiClient.getListNumbers({ sn: row.Phone_Num}) as ApiResponse;            
            const puertoPhoneGateway = responseListNumbers.data[0]?.port;
            const apiSmsPhone = await apiClient.apiSms({port: puertoPhoneGateway}) as ApiResponse;
            const mensajes = apiSmsPhone.mensajes;
          
            if (mensajes && mensajes.length > 0) {
                  const ultimoMensaje  = mensajes[mensajes.length - 1];
                  const addResult = await sendSms({
                    phoneNumbers: row.Phone_Num, 
                    content: (ultimoMensaje as Mensaje).contenido,
                    countryId: "col",
                  })

                  const codeMensaje = addResult.data.code
               
                if (codeMensaje == 0){
                    
                    const phoneNumbers = Array.isArray(row.Phone_Num) 
                    ? row.Phone_Num 
                    : [row.Phone_Num];
                
                let addResultSend = 0; // 0 = falló, 1 = éxito
                const maxAttempts = 3; // Máximo de intentos
            
                for (let attempt = 1; attempt <= maxAttempts; attempt++) {
                        console.log(`Intento ${attempt} de enviar SMS...`);

                        await apiClient.updateHistory(row.id, {
                            mensaje: (ultimoMensaje as Mensaje).contenido || "-",
                            code: codeMensaje,
                            evaluado:1
                        });
                
                        // 1. Eliminar y agregar número antes de cada intento
                        /*const deleteResult = await deleteNumber({
                            phoneNumbers: phoneNumbers,
                            countryId: "col",
                        });*/
                        
                        /*const addResult = await addNumber({
                            phoneNumbers,
                            countryId: "col",
                        });*/
                
                        // 2. Intentar enviar SMS
                        const sendaddResultSend = await sendSms({
                            phoneNumbers: row.Phone_Num,
                            content: (ultimoMensaje as Mensaje).contenido,
                            countryId: "col",
                        });

                        addResultSend = sendaddResultSend.data.code;
                
                        console.log(`Resultado intento ${attempt}:`, addResultSend);                      
                      
                
                        // 3. Si fue exitoso, salir del bucle
                        if (addResultSend === 1) {
                            console.log("¡Envío exitoso en el intento", attempt, "!");
                            await apiClient.updateHistory(row.id, {
                              mensaje: (ultimoMensaje as Mensaje).contenido || "-",
                              code: "1",
                              evaluado:1
                          });
                            break;
                        } else if (attempt < maxAttempts) {
                            console.log("Esperando 3 segundos antes de reintentar...");
                            await new Promise(resolve => setTimeout(resolve, 3000)); // Pequeña pausa entre intentos
                        }
                    }
                
                    // 4. Si alguno de los 3 intentos fue exitoso, guardar en historial
                        
                      //  console.log("✅ Historial actualizado.");
                    

                  }else{
                    
                    await apiClient.updateHistory(row.id, {
                      mensaje: (ultimoMensaje as Mensaje).contenido || "-",
                      code: codeMensaje,
                      evaluado:1
                    });
                    console.log("✅ mensaje enviado.");
                  }
              } else {
                console.log("No hay mensajes disponibles.");
              }
          }
      }

    }
    const [rowsList] = await connection.execute(query, params);

    // Get total count for pagination
    let countQuery = `SELECT COUNT(*) as total FROM serviceHistory WHERE evaluado=1`;
    const countParams: any[] = [];   
   

    const [countResult] = await connection.execute(countQuery, countParams);
    const total = (countResult as RowDataPacket[])[0].total;

    return NextResponse.json({
      success: true,
      data: rowsList,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
    });

  } catch (error) {
    console.error('Error fetching listnumbers:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch listnumbers',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  } finally {
    connection.release();
  }
}


// POST - Create a new history
export async function POST(request: NextRequest) {
  const connection = await connectToDatabase();
  
  try {
    const body = await request.json();
    const { 
      Item_ID, 
      Phone_GetTime, 
      Phone_Num, 
      Country_ID,         
    } = body;

    console.log("body: ", body);
    // Validation
    if (!Phone_Num ) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'All fields are required: sn' 
        },
        { status: 400 }
      );
    }   


    const [existingRecords] = await connection.execute(`
    SELECT id FROM serviceHistory 
    WHERE Phone_Num = ?
  `, [Phone_Num]);

    if ((existingRecords as RowDataPacket[]).length > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Duplicate entry:  Phone_Num already exists' 
        },
        { status: 409 }
      );
    }

    const listNumberId = generateUUID();

    // Insert listnumber
    await connection.execute(`
      INSERT INTO serviceHistory (
        id, Item_ID, Phone_GetTime, Phone_Num, Country_ID,evaluado
      ) VALUES (?, ?, ?, ?, ?,?)
    `, [listNumberId, Item_ID, Phone_GetTime, Phone_Num, Country_ID,0]);

    // Fetch the created record
    const [result] = await connection.execute(`
      SELECT * FROM serviceHistory WHERE id = ?
    `, [listNumberId]);

    return NextResponse.json({
      success: true,
      data: (result as RowDataPacket[])[0],
      message: 'serviceHistory created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating serviceHistory:', error);

    if (error instanceof Error && error.message.includes('Duplicate entry')) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Duplicate entry detected' 
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create serviceHistory',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  } finally {
    connection.release();
  }
}