import { NextRequest, NextResponse } from 'next/server';
import { processPagSeguroWebhook } from '@/lib/actions/payment-actions';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    
    // Log do webhook recebido
    console.log('Webhook PagSeguro recebido:', body);
    
    // O PagSeguro envia notificaçãoCode como parâmetro
    const url = new URL(request.url);
    const notificationCode = url.searchParams.get('notificationCode');
    
    if (!notificationCode) {
      console.error('Webhook PagSeguro: notificationCode não encontrado');
      return NextResponse.json(
        { error: 'notificationCode não fornecido' },
        { status: 400 }
      );
    }

    // Processar webhook
    await processPagSeguroWebhook(notificationCode);
    
    console.log('Webhook PagSeguro processado com sucesso:', notificationCode);
    
    return NextResponse.json({ success: true });
    
  } catch (error: any) {
    console.error('Erro ao processar webhook PagSeguro:', error);
    
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        message: error.message 
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  // Endpoint para teste de conectividade
  return NextResponse.json({ 
    message: 'Webhook PagSeguro funcionando',
    timestamp: new Date().toISOString()
  });
}
