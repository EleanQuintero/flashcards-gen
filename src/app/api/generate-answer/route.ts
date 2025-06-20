import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { tema, questions, userLevel } = await req.json()
  console.log('Datos recibidos:', { tema, questions, userLevel });
  interface AnswerData {
    answer: string[];
  }
  

  try {
    const response = await fetch("http://localhost:4444/api/questions/ask", {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tema, questions, userLevel })
    })

    if (!response.ok) {
      console.error('Error en la respuesta de la API:', response.status);
      return NextResponse.json({ error: 'Error en la API interna', status: 500 })
    }

    const data: AnswerData = await response.json()
    console.log('Respuesta de la API:', data);

    const answers = Array.isArray(data.answer) ? data.answer : [data.answer];
    return NextResponse.json({ answer: answers })
  } catch (error) {
    console.error('Error interno:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}