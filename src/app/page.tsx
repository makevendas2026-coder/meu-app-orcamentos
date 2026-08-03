'use client';

import { useState, useEffect, ChangeEvent } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface ItemOrcamento {
  id: number;
  descricao: string;
  quantidade: number;
  valorUnitario: number;
}

interface Prestador {
  nome: string;
  documento: string;
  endereco: string;
  logoUrl?: string;
  cadastrado: boolean;
}

interface Cliente {
  nome: string;
  documento: string;
  endereco: string;
}

interface Orcamento {
  id: number;
  prestador: Prestador;
  cliente: Cliente;
  itens: ItemOrcamento[];
  valorTotal: number;
  data: string;
}

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [orcamentosCriados, setOrcamentosCriados] = useState(0);
  const [statusPlano, setStatusPlano] = useState('FREE');
  const [carregando, setCarregando] = useState(true);

  // Controle de edição dos dados da empresa
  const [editandoPrestador, setEditandoPrestador] = useState(false);

  const [prestador, setPrestador] = useState<Prestador>({
    nome: '',
    documento: '',
    endereco: '',
    logoUrl: '',
    cadastrado: false
  });

  const [nomePrestador, setNomePrestador] = useState('');
  const [docPrestador, setDocPrestador] = useState('');
  const [enderecoPrestador, setEnderecoPrestador] = useState('');
  const [logoUrl, setLogoUrl] = useState<string>('');

  const [nomeCliente, setNomeCliente] = useState('');
  const [docCliente, setDocCliente] = useState('');
  const [enderecoCliente, setEnderecoCliente] = useState('');
  const [dataOrcamento, setDataOrcamento] = useState(
    new Date().toISOString().split('T')[0]
  );

  const [itens, setItens] = useState<ItemOrcamento[]>([
    { id: Date.now(), descricao: '', quantidade: 1, valorUnitario: 0 }
  ]);

  const [listaOrcamentos, setListaOrcamentos] = useState<Orcamento[]>([]);
  const [orcamentoParaPdf, setOrcamentoParaPdf] = useState<Orcamento | null>(null);

  const limiteGratis = 2;
  const isPro = statusPlano === 'PRO';
  const atingiuLimite = !isPro && orcamentosCriados >= limiteGratis;

  const linkCheckoutKiwify = "https://pay.kiwify.com.br/dQg7XIm";
  const valorPlanoPro = "R$ 29,90";

  useEffect(() => {
    async function carregarDadosUsuario() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          setCarregando(false);
          return;
        }

        setUser(session.user);

        const { data: perfilData } = await supabase
          .from('perfis')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (perfilData) {
          setStatusPlano(perfilData.status_plano || 'FREE');
          if (perfilData.nome_prestador) {
            const dadosPrestador: Prestador = {
              nome: perfilData.nome_prestador,
              documento: perfilData.documento || '',
              endereco: perfilData.endereco || '',
              logoUrl: perfilData.logo_url || '',
              cadastrado: true
            };
            setPrestador(dadosPrestador);
            setNomePrestador(dadosPrestador.nome);
            setDocPrestador(dadosPrestador.documento);
            setEnderecoPrestador(dadosPrestador.endereco);
            setLogoUrl(dadosPrestador.logoUrl || '');
          }
        }

        const { count, data: orcamentosData } = await supabase
          .from('orcamentos')
          .select('id, cliente_nome, cliente_documento, cliente_endereco, valor_total, data_orcamento', { count: 'exact' })
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false });

        if (count !== null) {
          setOrcamentosCriados(count);
        }

        if (orcamentosData && perfilData) {
          const formatados: Orcamento[] = orcamentosData.map((o: any) => ({
            id: o.id,
            prestador: {
              nome: perfilData.nome_prestador || '',
              documento: perfilData.documento || '',
              endereco: perfilData.endereco || '',
              cadastrado: true
            },
            cliente: {
              nome: o.cliente_nome,
              documento: o.cliente_documento,
              endereco: o.cliente_endereco
            },
            itens: [],
            valorTotal: Number(o.valor_total),
            data: o.data_orcamento
          }));
          setListaOrcamentos(formatados);
        }

      } catch (error) {
        console.error('Erro ao carregar dados:', error);
      } finally {
        setCarregando(false);
      }
    }

    carregarDadosUsuario();
  }, []);

  const handleLogoUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const salvarDadosPrestador = async () => {
    if (!nomePrestador || !docPrestador) {
      alert("Por favor, preencha o Nome e o CPF/CNPJ da empresa.");
      return;
    }

    if (!user) {
      alert("Você precisa estar logado.");
      return;
    }

    const { error } = await supabase
      .from('perfis')
      .update({
        nome_prestador: nomePrestador,
        documento: docPrestador,
        endereco: enderecoPrestador,
        logo_url: logoUrl
      })
      .eq('id', user.id);

    if (error) {
      alert("Erro ao salvar: " + error.message);
      return;
    }

    setPrestador({
      nome: nomePrestador,
      documento: docPrestador,
      endereco: enderecoPrestador,
      logoUrl: logoUrl,
      cadastrado: true
    });

    setEditandoPrestador(false);
    alert("Dados da empresa salvos e bloqueados com segurança!");
  };

  const adicionarItem = () => {
    setItens([
      ...itens,
      { id: Date.now(), descricao: '', quantidade: 1, valorUnitario: 0 }
    ]);
  };

  const removerItem = (id: number) => {
    if (itens.length === 1) return;
    setItens(itens.filter(item => item.id !== id));
  };

  const atualizarItem = (id: number, campo: keyof ItemOrcamento, valor: string | number) => {
    setItens(itens.map(item => {
      if (item.id === id) {
        return { ...item, [campo]: valor };
      }
      return item;
    }));
  };

  const calcularTotal = () => {
    return itens.reduce((acc, item) => acc + (Number(item.quantidade) * Number(item.valorUnitario)), 0);
  };

  const formatarDataBR = (dataString: string) => {
    if (!dataString) return '';
    const [ano, mes, dia] = dataString.split('-');
    return `${dia}/${mes}/${ano}`;
  };

  const adicionarOrcamento = async () => {
    if (atingiuLimite) {
      alert("Você atingiu o limite de orçamentos gratuitos. Faça o upgrade para o plano PRO.");
      return;
    }

    if (!prestador.cadastrado) {
      alert("Por favor, salve os dados da sua empresa antes de emitir orçamentos!");
      return;
    }

    if (!nomeCliente) {
      alert("Por favor, preencha o nome do cliente!");
      return;
    }

    const valorTotalCalc = calcularTotal();
    const dataFormatada = formatarDataBR(dataOrcamento);

    const { data: novoOrcamentoSupabase, error: erroOrcamento } = await supabase
      .from('orcamentos')
      .insert([
        {
          user_id: user.id,
          cliente_nome: nomeCliente,
          cliente_documento: docCliente,
          cliente_endereco: enderecoCliente,
          valor_total: valorTotalCalc,
          data_orcamento: dataFormatada
        }
      ])
      .select()
      .single();

    if (erroOrcamento) {
      alert("Erro ao salvar orçamento: " + erroOrcamento.message);
      return;
    }

    const itensParaInserir = itens.map(it => ({
      orcamento_id: novoOrcamentoSupabase.id,
      descricao: it.descricao,
      quantidade: it.quantidade,
      unit_price: it.valorUnitario
    }));

    await supabase.from('itens_orcamento').insert(itensParaInserir);

    const novo: Orcamento = {
      id: novoOrcamentoSupabase.id,
      prestador,
      cliente: {
        nome: nomeCliente,
        documento: docCliente,
        endereco: enderecoCliente,
      },
      itens,
      valorTotal: valorTotalCalc,
      data: dataFormatada
    };

    setListaOrcamentos([novo, ...listaOrcamentos]);
    setOrcamentosCriados(orcamentosCriados + 1);

    setNomeCliente('');
    setDocCliente('');
    setEnderecoCliente('');
    setItens([{ id: Date.now(), descricao: '', quantidade: 1, valorUnitario: 0 }]);
  };

  const baixarPDF = async (item: Orcamento) => {
    setOrcamentoParaPdf(item);
    const html2pdf = (await import('html2pdf.js')).default;
    
    setTimeout(() => {
      const elemento = document.getElementById('modelo-pdf');
      if (!elemento) return;

      const opcoes = {
        margin: 10,
        filename: `Orcamento_${item.cliente.nome.replace(/\s+/g, '_')}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      } as const;

      html2pdf().set(opcoes).from(elemento).save();
    }, 300);
  };

  if (carregando) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center text-slate-600">
        Carregando...
      </div>
    );
  }

  const bloqueadoEmpresa = prestador.cadastrado && !editandoPrestador;

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8 font-sans text-slate-800">
      <div className="max-w-3xl mx-auto space-y-6">
        
        {/* Painel */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 text-center">
          <h1 className="text-2xl font-bold text-slate-800">Gerador de Orçamentos Profissional</h1>
          <p className="text-sm text-slate-500 mt-1">Sua ferramenta oficial para emissão de propostas comerciais</p>
          
          <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center text-sm">
            <span>
              Status: <strong className={isPro ? "text-green-600" : "text-amber-600"}>
                {isPro ? "Plano PRO (Ilimitado)" : "Plano Gratuito"}
              </strong>
            </span>
            <span className="font-semibold text-slate-700">
              {isPro ? "∞" : `${orcamentosCriados} / ${limiteGratis} usados`}
            </span>
          </div>
        </div>

        {/* Alerta de Limite */}
        {atingiuLimite && (
          <div className="bg-amber-50 border border-amber-200 p-5 rounded-2xl text-amber-900 space-y-3 text-center shadow-sm">
            <p className="font-bold text-base">⚠️ Você atingiu o limite de {limiteGratis} orçamentos grátis!</p>
            <p className="text-xs text-amber-800">
              Tenha acesso ilimitado à emissão de orçamentos por apenas <strong className="text-slate-900">{valorPlanoPro}</strong>.
            </p>
            <a 
              href={linkCheckoutKiwify}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block w-full py-3 px-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl text-sm transition text-center shadow"
            >
              🚀 Assinar Plano PRO por {valorPlanoPro} (Ir para Kiwify)
            </a>
          </div>
        )}

        {/* DADOS DA EMPRESA (FIXOS E PROTEGIDOS) */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <div>
              <h2 className="font-bold text-slate-800">Dados da Sua Empresa / Prestador</h2>
              <p className="text-xs text-slate-500">
                {bloqueadoEmpresa ? "🔒 Dados fixados e vinculados à sua licença." : "Preencha para travar e emitir seus orçamentos."}
              </p>
            </div>
            {prestador.cadastrado && !editandoPrestador && (
              <button 
                onClick={() => setEditandoPrestador(true)}
                className="text-xs font-semibold text-blue-600 hover:underline"
              >
                ✏️ Alterar Dados
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Nome Fantasia / Seu Nome</label>
              <input 
                type="text" 
                placeholder="Ex: Marcenaria Silva"
                value={nomePrestador}
                disabled={bloqueadoEmpresa}
                onChange={(e) => setNomePrestador(e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">CPF ou CNPJ</label>
              <input 
                type="text" 
                placeholder="Ex: 000.000.000-00"
                value={docPrestador}
                disabled={bloqueadoEmpresa}
                onChange={(e) => setDocPrestador(e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-500 mb-1">Endereço Comercial / Completo</label>
              <input 
                type="text" 
                placeholder="Rua, Número, Bairro, Cidade - UF"
                value={enderecoPrestador}
                disabled={bloqueadoEmpresa}
                onChange={(e) => setEnderecoPrestador(e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-500"
              />
            </div>

            {!bloqueadoEmpresa && (
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-500 mb-1">Sua Logomarca (Opcional)</label>
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
                />
              </div>
            )}
          </div>

          {!bloqueadoEmpresa && (
            <button 
              type="button"
              onClick={salvarDadosPrestador}
              className="w-full py-2.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl transition cursor-pointer"
            >
              🔒 Salvar e Fixar Dados da Empresa
            </button>
          )}
        </div>

        {/* EMISSÃO DO ORÇAMENTO */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-5">
          <h2 className="font-bold text-slate-800 border-b border-slate-100 pb-2">Novo Orçamento para Cliente</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Data do Orçamento</label>
              <input 
                type="date" 
                value={dataOrcamento}
                disabled={atingiuLimite}
                onChange={(e) => setDataOrcamento(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Nome do Cliente *</label>
              <input 
                type="text" 
                placeholder="Ex: Carlos Eduardo"
                value={nomeCliente}
                disabled={atingiuLimite}
                onChange={(e) => setNomeCliente(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">CPF/CNPJ do Cliente (Opcional)</label>
              <input 
                type="text" 
                placeholder="000.000.000-00"
                value={docCliente}
                disabled={atingiuLimite}
                onChange={(e) => setDocCliente(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Endereço do Cliente / Obra (Opcional)</label>
              <input 
                type="text" 
                placeholder="Endereço da entrega ou obra"
                value={enderecoCliente}
                disabled={atingiuLimite}
                onChange={(e) => setEnderecoCliente(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
              />
            </div>
          </div>

          {/* Tabela de Itens */}
          <div className="pt-3 border-t border-slate-100 space-y-3">
            <div className="flex justify-between items-center">
              <label className="block text-xs font-semibold text-slate-500">Serviços / Produtos</label>
              <button 
                type="button"
                onClick={adicionarItem}
                disabled={atingiuLimite}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 disabled:text-slate-400"
              >
                + Adicionar Item
              </button>
            </div>

            {itens.map((item) => (
              <div key={item.id} className="flex gap-2 items-center">
                <input 
                  type="text" 
                  placeholder="Descrição do serviço/produto"
                  value={item.descricao}
                  disabled={atingiuLimite}
                  onChange={(e) => atualizarItem(item.id, 'descricao', e.target.value)}
                  className="flex-1 p-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                />
                <input 
                  type="number" 
                  min="1"
                  placeholder="Qtd"
                  value={item.quantidade}
                  disabled={atingiuLimite}
                  onChange={(e) => atualizarItem(item.id, 'quantidade', Math.max(1, Number(e.target.value)))}
                  className="w-16 p-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 text-center"
                />
                <input 
                  type="number" 
                  placeholder="R$ Unit."
                  value={item.valorUnitario || ''}
                  disabled={atingiuLimite}
                  onChange={(e) => atualizarItem(item.id, 'valorUnitario', Number(e.target.value))}
                  className="w-24 p-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                />
                {itens.length > 1 && (
                  <button 
                    type="button" 
                    onClick={() => removerItem(item.id)}
                    className="p-2 text-rose-500 hover:text-rose-700 text-sm font-bold"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-sm font-semibold text-slate-600">Total do Orçamento:</span>
            <span className="text-lg font-bold text-green-600">
              R$ {calcularTotal().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>

          <button 
            type="button"
            onClick={adicionarOrcamento}
            disabled={atingiuLimite}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold rounded-xl text-sm transition cursor-pointer"
          >
            {atingiuLimite ? "Bloqueado pelo Limite Gratuito" : "Gerar Orçamento em PDF"}
          </button>
        </div>

        {/* Lista de Orçamentos */}
        {listaOrcamentos.length > 0 && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-3">
            <h2 className="font-bold text-slate-700">Seus Orçamentos Emitidos</h2>
            <div className="space-y-3">
              {listaOrcamentos.map((item) => (
                <div key={item.id} className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-slate-800">{item.cliente.nome}</p>
                      <p className="text-xs text-slate-500">Data: {item.data}</p>
                    </div>
                    <p className="font-bold text-green-600">R$ {item.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </div>

                  <div className="flex gap-2 pt-2 border-t border-slate-200">
                    <button 
                      onClick={() => baixarPDF(item)}
                      className="flex-1 py-1.5 px-3 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg transition"
                    >
                      📄 Baixar PDF
                    </button>
                    <a 
                      href={`https://wa.me/?text=${encodeURIComponent(`Olá ${item.cliente.nome}, segue a proposta comercial de R$ ${item.valorTotal.toFixed(2)} emitida por ${item.prestador.nome}.`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 text-center py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition"
                    >
                      💬 WhatsApp
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* MODELO PDF */}
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
        {orcamentoParaPdf && (
          <div id="modelo-pdf" style={{ width: '700px', padding: '40px', background: '#ffffff', fontFamily: 'sans-serif', color: '#1e293b' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #e2e8f0', paddingBottom: '20px', marginBottom: '20px' }}>
              <div>
                {orcamentoParaPdf.prestador.logoUrl && (
                  <img src={orcamentoParaPdf.prestador.logoUrl} alt="Logo" style={{ maxHeight: '50px', marginBottom: '10px' }} />
                )}
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold' }}>{orcamentoParaPdf.prestador.nome}</h2>
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#64748b' }}>Doc: {orcamentoParaPdf.prestador.documento}</p>
                <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>{orcamentoParaPdf.prestador.endereco}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <h1 style={{ margin: 0, fontSize: '22px', color: '#2563eb' }}>ORÇAMENTO</h1>
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#64748b' }}>Data: {orcamentoParaPdf.data}</p>
              </div>
            </div>

            <div style={{ marginBottom: '20px', background: '#f8fafc', padding: '15px', borderRadius: '8px' }}>
              <p style={{ margin: '0 0 4px', fontSize: '12px', fontWeight: 'bold', color: '#475569' }}>DADOS DO CLIENTE:</p>
              <p style={{ margin: '0 0 2px', fontSize: '14px', fontWeight: 'bold' }}>{orcamentoParaPdf.cliente.nome}</p>
              <p style={{ margin: '0 0 2px', fontSize: '12px', color: '#64748b' }}>CPF/CNPJ: {orcamentoParaPdf.cliente.documento || 'Não informado'}</p>
              <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>Endereço: {orcamentoParaPdf.cliente.endereco || 'Não informado'}</p>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
              <thead>
                <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1' }}>
                  <th style={{ padding: '8px', textAlign: 'left', fontSize: '12px' }}>Descrição</th>
                  <th style={{ padding: '8px', textAlign: 'center', fontSize: '12px' }}>Qtd</th>
                  <th style={{ padding: '8px', textAlign: 'right', fontSize: '12px' }}>Preço Unit.</th>
                  <th style={{ padding: '8px', textAlign: 'right', fontSize: '12px' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {orcamentoParaPdf.itens.map((i, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '8px', fontSize: '12px' }}>{i.descricao}</td>
                    <td style={{ padding: '8px', textAlign: 'center', fontSize: '12px' }}>{i.quantidade}</td>
                    <td style={{ padding: '8px', textAlign: 'right', fontSize: '12px' }}>R$ {Number(i.valorUnitario).toFixed(2)}</td>
                    <td style={{ padding: '8px', textAlign: 'right', fontSize: '12px', fontWeight: 'bold' }}>R$ {(i.quantidade * i.valorUnitario).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ textAlign: 'right', padding: '15px', background: '#f8fafc', borderRadius: '8px' }}>
              <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#475569' }}>Valor Total: </span>
              <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#16a34a' }}>R$ {orcamentoParaPdf.valorTotal.toFixed(2)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}