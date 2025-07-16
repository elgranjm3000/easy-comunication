import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/database';
import { RowDataPacket } from 'mysql2';

// GET - Fetch a specific listnumber
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const connection = await connectToDatabase();  
  
  try {
    const { id } = params;

    const [result] = await connection.execute(`
      SELECT * FROM serviceHistory WHERE id = ?
    `, [id]);
    console.log(result);

    if ((result as RowDataPacket[]).length === 0) {
      return NextResponse.json(
        { success: false, error: 'serviceHistory not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: (result as RowDataPacket[])[0]
    });

  } catch (error) {
    console.error('Error fetching serviceHistory:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch serviceHistory',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  } finally {
    connection.release();
  }
}

// PUT - Update a listnumber
export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
  ) {
    const connection = await connectToDatabase();
    
    try {
      const { id } = params;
      const body = await request.json();
      const { 
        Item_ID, 
        Phone_GetTime, 
        Phone_Num, 
        Country_ID, 
        Phone_IsRet, 
        Phone_RetTime, 
        Phone_Remark, 
        Phone_RemarkTime,
        mensaje,
        code,
        evaluado
      } = body;
  
      // Verificar si el registro existe
      const [existingRecord] = await connection.execute<RowDataPacket[]>(`
        SELECT * FROM serviceHistory WHERE id = ?
      `, [id]);
  
      if (existingRecord.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Registro en serviceHistory no encontrado' },
          { status: 404 }
        );
      }
  
      // Construir la consulta dinámica de actualización
      const updateFields: string[] = [];
      const updateValues: any[] = [];
  
      // Agregar campos a actualizar si están presentes en el body
      if (code !== undefined) {
        updateFields.push('code = ?');
        updateValues.push(code);
      }

      if (evaluado !== undefined) {
        updateFields.push('evaluado = ?');
        updateValues.push(evaluado);
      }
      
      if (Item_ID !== undefined) {
        updateFields.push('Item_ID = ?');
        updateValues.push(Item_ID);
      }
      if (Phone_GetTime !== undefined) {
        updateFields.push('Phone_GetTime = ?');
        updateValues.push(Phone_GetTime);
      }
      if (Phone_Num !== undefined) {
        updateFields.push('Phone_Num = ?');
        updateValues.push(Phone_Num);
      }
      if (Country_ID !== undefined) {
        updateFields.push('Country_ID = ?');
        updateValues.push(Country_ID);
      }
      if (Phone_IsRet !== undefined) {
        updateFields.push('Phone_IsRet = ?');
        updateValues.push(Phone_IsRet);
      }
      if (Phone_RetTime !== undefined) {
        updateFields.push('Phone_RetTime = ?');
        updateValues.push(Phone_RetTime);
      }
      if (Phone_Remark !== undefined) {
        updateFields.push('Phone_Remark = ?');
        updateValues.push(Phone_Remark);
      }
      if (Phone_RemarkTime !== undefined) {
        updateFields.push('Phone_RemarkTime = ?');
        updateValues.push(Phone_RemarkTime);
      }
      if (mensaje !== undefined) {
        updateFields.push('mensaje = ?');
        updateValues.push(mensaje);
      }
  
      if (updateFields.length === 0) {
        return NextResponse.json(
          { success: false, error: 'No hay campos para actualizar' },
          { status: 400 }
        );
      }
  
      // Agregar marca de tiempo de actualización
      updateFields.push('updated_at = NOW()');
      updateValues.push(id);
  
      // Ejecutar la actualización
      await connection.execute(`
        UPDATE serviceHistory 
        SET ${updateFields.join(', ')}
        WHERE id = ?
      `, updateValues);
  
      // Obtener el registro actualizado
      const [updatedRecord] = await connection.execute<RowDataPacket[]>(`
        SELECT * FROM serviceHistory WHERE id = ?
      `, [id]);
  
      return NextResponse.json({
        success: true,
        data: updatedRecord[0],
        message: 'Registro en serviceHistory actualizado correctamente'
      });
  
    } catch (error) {
      console.error('Error al actualizar serviceHistory:', error);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Error al actualizar el registro',
          details: error instanceof Error ? error.message : 'Error desconocido'
        },
        { status: 500 }
      );
    } finally {
      connection.release();
    }
  }

// DELETE - Delete a listnumber
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const connection = await connectToDatabase();
  
  try {
    const { id } = params;

    // Check if listnumber exists
    const [existingRecord] = await connection.execute(`
      SELECT id FROM serviceHistory WHERE id = ?
    `, [id]);

    if ((existingRecord as RowDataPacket[]).length === 0) {
      return NextResponse.json(
        { success: false, error: 'serviceHistory not found' },
        { status: 404 }
      );
    }

    // Delete listnumber
    await connection.execute(`
      DELETE FROM serviceHistory WHERE id = ?
    `, [id]);

    return NextResponse.json({
      success: true,
      message: 'serviceHistory deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting serviceHistory:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to delete serviceHistory',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  } finally {
    connection.release();
  }
}