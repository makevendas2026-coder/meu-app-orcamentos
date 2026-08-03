'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [mensagem, setMensagem] = useState('');
  const [isNovoAcesso, setIsNovoAcesso] = useState(false);
  const router = useRouter();

  // Login tradicional por e-mail e senha
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMensagem('');

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMensagem('Erro ao entrar: ' + error.message);
      setLoading(false);
    } else {
      router.push('/'); // Redireciona para o gerador de orçamentos
    }
  };

  // Solicitar envio de e-mail para criar/recuperar senha
  const handlePrimeiroAcesso = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMensagem('');

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/definir-senha`,
    });

    if (error) {
      setMensagem('Erro: ' + error.message);
    } else {
      setMensagem(' Enviamos um link para o seu e-mail para você criar sua senha!');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-sans text-slate-800">
      <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-sm border border-slate-200 space-y-6">
        
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold text-slate-900">Área do Prestador</h1>
          <p className="text-xs text-slate-500">
            {isNovoAcesso 
              ? "Digite o e-mail cadastrado na compra para definir sua senha" 
              : "Acesse sua conta para emitir e gerenciar orçamentos"}
          </p>
        </div>

        {mensagem && (
          <div className="p-3 bg-blue-50 border border-blue-200 text-blue-800 text-xs rounded-xl">
            {mensagem}
          </div>
        )}

        {!isNovoAcesso ? (
          /* FORMULÁRIO DE LOGIN */
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Seu E-mail</label>
              <input
                type="email"
                required
                placeholder="seuemail@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Sua Senha</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition disabled:bg-slate-300"
            >
              {loading ? 'Entrando...' : 'Entrar no Sistema'}
            </button>

            <button
              type="button"
              onClick={() => { setIsNovoAcesso(true); setMensagem(''); }}
              className="w-full text-xs text-slate-500 hover:text-blue-600 font-medium text-center block pt-2"
            >
              Primeiro acesso após comprar ou esqueceu a senha?
            </button>
          </form>
        ) : (
          /* FORMULÁRIO DE PRIMEIRO ACESSO / RECUPERAÇÃO */
          <form onSubmit={handlePrimeiroAcesso} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">E-mail de Compra</label>
              <input
                type="email"
                required
                placeholder="seuemail@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-slate-900 hover:bg-black text-white font-bold rounded-xl text-sm transition disabled:bg-slate-300"
            >
              {loading ? 'Enviando...' : 'Receber Link para Definir Senha'}
            </button>

            <button
              type="button"
              onClick={() => { setIsNovoAcesso(false); setMensagem(''); }}
              className="w-full text-xs text-slate-500 hover:text-blue-600 font-medium text-center block pt-2"
            >
              ← Voltar para a tela de Login
            </button>
          </form>
        )}

      </div>
    </div>
  );
}