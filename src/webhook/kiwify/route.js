import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Inicializa o cliente do Supabase com a chave de serviço (Service Role) 
// para conseguir atualizar o banco ignorando as travas de segurança comuns
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  try {
    const body = await request.json();

    // A Kiwify envia vários eventos. O que nos interessa para liberação é quando a compra é aprovada.
    // (Geralmente o status é 'paid' ou 'approved' dependendo do payload da Kiwify)
    const statusVenda = body.status || body.order_status;
    const emailCliente = body.Customer?.email || body.customer?.email;

    if (statusVenda === 'paid' || statusVenda === 'approved' || statusVenda === 'complete') {
      if (!emailCliente) {
        return NextResponse.json({ error: 'E-mail do cliente não encontrado no payload' }, { status: 400 });
      }

      // 1. Achar o ID do usuário na tabela auth.users pelo e-mail
      // Como não podemos consultar auth.users direto facilmente, vamos buscar na sua tabela 'perfis' se houver email, 
      // ou usar a API admin do Supabase. Vamos buscar o usuário pelo e-mail no Auth:
      const { data: userData, error: userError } = await supabaseAdmin.auth.admin.listUsers();
      
      const usuarioEncontrado = userData?.users?.find(u => u.email === emailCliente);

      if (!usuarioEncontrado) {
        return NextResponse.json({ error: 'Usuário não encontrado no sistema' }, { status: 404 });
      }

      // 2. Atualizar o status_plano para 'PRO' na tabela perfis
      const { error: updateError } = await supabaseAdmin
        .from('perfis')
        .update({ status_plano: 'PRO' })
        .eq('id', usuarioEncontrado.id);

      if (updateError) {
        throw updateError;
      }

      return NextResponse.json({ success: true, message: 'Plano atualizado para PRO com sucesso!' });
    }

    return NextResponse.json({ received: true, message: 'Evento ignorado (não é pagamento aprovado)' });

  } catch (error) {
    console.error('Erro no webhook da Kiwify:', error);
    return NextResponse.json({ error: 'Erro interno ao processar webhook' }, { status: 500 });
  }
}