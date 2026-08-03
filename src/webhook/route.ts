import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Inicializa o Supabase com a chave administrativa (service_role)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Compatibilidade com campos da Kiwify e Hotmart
    const statusVenda = body.order_status || body.status;
    const emailCliente = body.Customer?.email || body.email;
    const nomeCliente = body.Customer?.full_name || body.name || 'Prestador';

    // Verifica se a venda foi aprovada/paga
    if (statusVenda === 'paid' || statusVenda === 'APPROVED') {
      
      // Verifica se o usuário já existe no sistema do Supabase
      const { data: usuarios } = await supabaseAdmin.auth.admin.listUsers();
      const usuarioExistente = usuarios.users.find(u => u.email === emailCliente);

      if (usuarioExistente) {
        // Se já tem conta, apenas atualiza o plano para PRO
        await supabaseAdmin
          .from('perfis')
          .update({ status_plano: 'PRO' })
          .eq('id', usuarioExistente.id);
      } else {
        // Se for um comprador novo, cria a conta de forma automática
        const { data: novoUsuario, error } = await supabaseAdmin.auth.admin.createUser({
          email: emailCliente,
          email_confirm: true,
          user_metadata: { nome: nomeCliente }
        });

        if (error) throw error;

        // Insere o perfil dele na tabela de perfis como PRO
        await supabaseAdmin.from('perfis').insert({
          id: novoUsuario.user.id,
          nome_prestador: nomeCliente,
          status_plano: 'PRO'
        });

        // Envia o e-mail automático para ele definir a senha
        await supabaseAdmin.auth.resetPasswordForEmail(emailCliente, {
          redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/definir-senha`,
        });
      }

      return NextResponse.json({ message: 'Acesso PRO liberado com sucesso!' }, { status: 200 });
    }

    return NextResponse.json({ message: 'Evento recebido, mas não é uma aprovação de pagamento.' }, { status: 200 });

  } catch (error: any) {
    console.error('Erro no Webhook:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}