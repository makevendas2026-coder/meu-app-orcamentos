'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function DefinirSenha() {
  const [novaSenha, setNovaSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [mensagem, setMensagem] = useState('');
  const router = useRouter();

  const handleSalvarSenha = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password: novaSenha,
    });

    if (error) {
      setMensagem('Erro ao atualizar senha: ' + error.message);
      setLoading(false);
    } else {
      alert('Senha criada com sucesso! Você já será redirecionado.');
      router.push('/');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-sans text-slate-800">
      <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-sm border border-slate-200 space-y-6">
        
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold text-slate-900">Criar Sua Senha</h1>
          <p className="text-xs text-slate-500">Escolha uma senha para acessar seu painel de orçamentos</p>
        </div>

        {mensagem && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl">
            {mensagem}
          </div>
        )}

        <form onSubmit={handleSalvarSenha} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Nova Senha</label>
            <input
              type="password"
              required
              minLength={6}
              placeholder="Digite pelo menos 6 caracteres"
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
              className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl text-sm transition disabled:bg-slate-300"
          >
            {loading ? 'Salvando...' : 'Salvar Senha e Acessar App'}
          </button>
        </form>

      </div>
    </div>
  );
}