'use client';

import { useState, useEffect, ChangeEvent } from 'react';

interface ItemOrcamento {
  id: number;
  descricao: string;
  quantidade: number;
  valorUnitario: number;
}

interface Prestador {
  nome: string;
  documento: string; // CPF ou CNPJ
  endereco: string;
  logoUrl?: string;
  cadastrado: boolean;
}

interface Cliente {
  nome: string;
  documento: string; // CPF ou CNPJ
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
  const [orcamentosCriados, setOrcamentosCriados] = useState(0);
  const [planoAtivo, setPlanoAtivo] = useState(false);

  // Dados Fixos do Prestador (Trava de Segurança)
  const [prestador, setPrestador] = useState<Prestador>({
    nome: '',
    documento: '',
    endereco: '',
    logoUrl: '',
    cadastrado: false
  });

  // Campos de edição inicial do Prestador
  const [nomePrestador, setNomePrestador] = useState('');
  const [docPrestador, setDocPrestador] = useState('');
  const [enderecoPrestador, setEnderecoPrestador] = useState('');
  const [logoUrl, setLogoUrl] = useState<string>('');

  // Dados Dinâmicos por Orçamento (Cliente)
  const [nomeCliente, setNomeCliente] = useState('');
  const [docCliente, setDocCliente] = useState('');
  const [enderecoCliente, setEnderecoCliente] = useState('');
  const [dataOrcamento, setDataOrcamento] = useState(
    new Date().toISOString().split('T')[0]
  );

  // Itens do orçamento
  const [itens, setItens] = useState<ItemOrcamento[]>([
    { id: Date.now(), descricao: '', quantidade: 1, valorUnitario: 0 }
  ]);

  const [listaOrcamentos, setListaOrcamentos] = useState<Orcamento[]>([]);
  const [orcamentoParaPdf, setOrcamentoParaPdf] = useState<Orcamento | null>(null);

  const limiteGratis = 2;
  const atingiuLimite = !planoAtivo && orcamentosCriados >= limiteGratis;

  // Carregar dados salvos no localStorage ao iniciar
  useEffect(() => {
    const prestadorSalvo = localStorage.getItem('dados_prestador_fixo');
    if (prestadorSalvo) {
      const dados: Prestador = JSON.parse(prestadorSalvo);
      setPrestador(dados);
      setNomePrestador(dados.nome);
      setDocPrestador(dados.documento);
      setEnderecoPrestador(dados.endereco);
      setLogoUrl(dados.logoUrl || '');
    }
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

  // Travar os dados do Prestador no cadastro inicial
  const salvarEBloquearPrestador = () => {
    if (!nomePrestador || !docPrestador) {
      alert("Por favor, preencha pelo menos o Nome/Razão Social e o CPF/CNPJ para registrar sua conta.");
      return;
    }

    const novosDados: Prestador = {
      nome: nomePrestador,
      documento: docPrestador,
      endereco: enderecoPrestador,
      logoUrl: logoUrl,
      cadastrado: true
    };

    setPrestador(novosDados);
    localStorage.setItem('dados_prestador_fixo', JSON.stringify(novosDados));
    alert("Dados cadastrais salvos e fixados com sucesso! Agora você já pode criar seus orçamentos.");
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

  const adicionarOrcamento = () => {
    if (!prestador.cadastrado) {
      alert("Você precisa primeiro salvar os dados da sua empresa/cadastro antes de emitir orçamentos!");
      return;
    }

    if (!nomeCliente) {
      alert("Por favor, preencha o nome do cliente!");
      return;
    }

    const temItemInvalido = itens.some(i => !i.descricao || i.valorUnitario <= 0);
    if (temItemInvalido) {
      alert("Por favor, preencha a descrição e valor de todos os itens!");
      return;
    }

    if (atingiuLimite) {
      alert("Você atingiu o limite do plano gratuito!");
      return;
    }

    const novo: Orcamento = {
      id: Date.now(),
      prestador,
      cliente: {
        nome: nomeCliente,
        documento: docCliente,
        endereco: enderecoCliente,
      },
      itens,
      valorTotal: calcularTotal(),
      data: formatarDataBR(dataOrcamento)
    };

    setListaOrcamentos([novo, ...listaOrcamentos]);
    setOrcamentosCriados(orcamentosCriados + 1);

    // Resetar apenas os dados do cliente e lista de itens
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

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8 font-sans text-slate-800">
      <div className="max-w-3xl mx-auto space-y-6">
        
        {/* Painel de Status */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 text-center">
          <h1 className="text-2xl font-bold text-slate-800">Gerador de Orçamentos Profissional</h1>
          <p className="text-sm text-slate-500 mt-1">Sua ferramenta oficial para emissão de propostas comerciais</p>
          
          <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center text-sm">
            <span>
              Status: <strong className={planoAtivo ? "text-green-600" : "text-amber-600"}>
                {planoAtivo ? "Plano PRO (Ilimitado)" : "Plano Gratuito"}
              </strong>
            </span>
            <span className="font-semibold text-slate-700">
              {planoAtivo ? "∞" : `${orcamentosCriados} / ${limiteGratis} usados`}
            </span>
          </div>
        </div>

        {/* Alerta de Bloqueio por Limite */}
        {atingiuLimite && (
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl text-amber-900 space-y-3 text-center">
            <p className="font-semibold">⚠️ Limite de 2 orçamentos grátis atingido!</p>
            <button 
              onClick={() => setPlanoAtivo(true)}
              className="w-full py-2 px-4 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-xl text-sm transition"
            >
              Simular Assinatura PRO
            </button>
          </div>
        )}

        {/* CADASTRO FIXO DO PRESTADOR (DADOS DA SUA EMPRESA) */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <div>
              <h2 className="font-bold text-slate-800">
                Dados Fixo da Sua Empresa / Prestador
              </h2>
              <p className="text-xs text-slate-500">
                {prestador.cadastrado 
                  ? "🔒 Dados vinculados à sua licença de uso." 
                  : "Preencha com atenção. Estes dados ficarão registrados no seu perfil."}
              </p>
            </div>
            {prestador.cadastrado && (
              <span className="px-2.5 py-1 bg-slate-100 border border-slate-200 text-slate-600 text-xs font-semibold rounded-full flex items-center gap-1">
                🔒 Dados Registrados
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Nome Fantasia / Seu Nome</label>
              <input 
                type="text" 
                placeholder="Ex: João Pedreiro / Marcenaria Silva"
                value={nomePrestador}
                disabled={prestador.cadastrado}
                onChange={(e) => setNomePrestador(e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">CPF ou CNPJ</label>
              <input 
                type="text" 
                placeholder="Ex: 000.000.000-00"
                value={docPrestador}
                disabled={prestador.cadastrado}
                onChange={(e) => setDocPrestador(e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-600"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-500 mb-1">Endereço Comercial / Completo</label>
              <input 
                type="text" 
                placeholder="Rua, Número, Bairro, Cidade - UF"
                value={enderecoPrestador}
                disabled={prestador.cadastrado}
                onChange={(e) => setEnderecoPrestador(e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-600"
              />
            </div>

            {!prestador.cadastrado && (
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

          {!prestador.cadastrado ? (
            <button 
              type="button"
              onClick={salvarEBloquearPrestador}
              className="w-full py-2.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl transition"
            >
              🔒 Salvar e Travar Meus Dados de Prestador
            </button>
          ) : (
            <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl flex justify-between items-center text-xs text-blue-900">
              <span>Para alterar seu CNPJ/CPF ou Razão Social, solicite ao suporte:</span>
              <a 
                href="https://wa.me/?text=Ol%C3%A1%2C%20preciso%20solicitar%20a%20altera%C3%A7%C3%A3o%20dos%20dados%20cadastrais%20da%20minha%20conta." 
                target="_blank" 
                rel="noreferrer"
                className="font-bold underline hover:text-blue-700"
              >
                Fale Conosco
              </a>
            </div>
          )}
        </div>

        {/* EMISSÃO DO ORÇAMENTO */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-5">
          <h2 className="font-bold text-slate-800 border-b border-slate-100 pb-2">Novo Orçamento para Cliente</h2>
          
          {/* Data e Cliente */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Data do Orçamento</label>
              <input 
                type="date" 
                value={dataOrcamento}
                disabled={atingiuLimite || !prestador.cadastrado}
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
                disabled={atingiuLimite || !prestador.cadastrado}
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
                disabled={atingiuLimite || !prestador.cadastrado}
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
                disabled={atingiuLimite || !prestador.cadastrado}
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
                disabled={atingiuLimite || !prestador.cadastrado}
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
                  disabled={atingiuLimite || !prestador.cadastrado}
                  onChange={(e) => atualizarItem(item.id, 'descricao', e.target.value)}
                  className="flex-1 p-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                />
                <input 
                  type="number" 
                  min="1"
                  placeholder="Qtd"
                  value={item.quantidade}
                  disabled={atingiuLimite || !prestador.cadastrado}
                  onChange={(e) => atualizarItem(item.id, 'quantidade', Math.max(1, Number(e.target.value)))}
                  className="w-16 p-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 text-center"
                />
                <input 
                  type="number" 
                  placeholder="R$ Unit."
                  value={item.valorUnitario || ''}
                  disabled={atingiuLimite || !prestador.cadastrado}
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

          {/* Resumo Total */}
          <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-sm font-semibold text-slate-600">Total do Orçamento:</span>
            <span className="text-lg font-bold text-green-600">
              R$ {calcularTotal().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>

          <button 
            type="button"
            onClick={adicionarOrcamento}
            disabled={atingiuLimite || !prestador.cadastrado}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold rounded-xl text-sm transition cursor-pointer"
          >
            {!prestador.cadastrado 
              ? "Cadastre seus dados acima primeiro" 
              : atingiuLimite 
                ? "Bloqueado pelo Limite" 
                : "Gerar Orçamento em PDF"}
          </button>
        </div>

        {/* Lista de Orçamentos Gerados */}
        {listaOrcamentos.length > 0 && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-3">
            <h2 className="font-bold text-slate-700">Seus Orçamentos Emitidos</h2>
            <div className="space-y-3">
              {listaOrcamentos.map((item) => (
                <div key={item.id} className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-slate-800">{item.cliente.nome}</p>
                      <p className="text-xs text-slate-500">Data: {item.data} • {item.itens.length} item(ns)</p>
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

      {/* MODELO IMPRESSO DO PDF (Oculto na tela, renderizado apenas para captura do html2pdf) */}
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
        {orcamentoParaPdf && (
          <div id="modelo-pdf" style={{ width: '700px', padding: '30px', backgroundColor: '#ffffff', fontFamily: 'sans-serif', color: '#1e293b' }}>
            
            {/* Cabeçalho */}
            <div style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                {orcamentoParaPdf.prestador.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={orcamentoParaPdf.prestador.logoUrl} alt="Logo" style={{ maxHeight: '60px', marginBottom: '8px' }} />
                ) : (
                  <h1 style={{ fontSize: '20px', fontWeight: 'bold', color: '#0f172a', margin: 0 }}>ORÇAMENTO</h1>
                )}
                <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0 0' }}>Data de Emissão: {orcamentoParaPdf.data}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#0f172a' }}>
                  Nº #{orcamentoParaPdf.id.toString().slice(-6)}
                </span>
              </div>
            </div>

            {/* Bloco de Dados: Prestador vs Cliente */}
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '20px', marginTop: '20px', paddingBottom: '15px', borderBottom: '1px solid #f1f5f9' }}>
              
              {/* Prestador (Fixo) */}
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '11px', fontWeight: 'bold', color: '#2563eb', margin: '0 0 6px 0', textTransform: 'uppercase' }}>EMISSOR / PRESTADOR</p>
                <p style={{ fontSize: '13px', fontWeight: 'bold', color: '#0f172a', margin: 0 }}>{orcamentoParaPdf.prestador.nome}</p>
                {orcamentoParaPdf.prestador.documento && (
                  <p style={{ fontSize: '11px', color: '#475569', margin: '2px 0 0 0' }}>CPF/CNPJ: {orcamentoParaPdf.prestador.documento}</p>
                )}
                {orcamentoParaPdf.prestador.endereco && (
                  <p style={{ fontSize: '11px', color: '#475569', margin: '2px 0 0 0' }}>{orcamentoParaPdf.prestador.endereco}</p>
                )}
              </div>

              {/* Cliente */}
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '11px', fontWeight: 'bold', color: '#2563eb', margin: '0 0 6px 0', textTransform: 'uppercase' }}>CLIENTE</p>
                <p style={{ fontSize: '13px', fontWeight: 'bold', color: '#0f172a', margin: 0 }}>{orcamentoParaPdf.cliente.nome}</p>
                {orcamentoParaPdf.cliente.documento && (
                  <p style={{ fontSize: '11px', color: '#475569', margin: '2px 0 0 0' }}>CPF/CNPJ: {orcamentoParaPdf.cliente.documento}</p>
                )}
                {orcamentoParaPdf.cliente.endereco && (
                  <p style={{ fontSize: '11px', color: '#475569', margin: '2px 0 0 0' }}>{orcamentoParaPdf.cliente.endereco}</p>
                )}
              </div>

            </div>

            {/* Tabela de Itens */}
            <table style={{ width: '100%', marginTop: '20px', borderCollapse: 'collapse', border: '1px solid #e2e8f0' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc' }}>
                  <th style={{ padding: '10px', textAlign: 'left', fontSize: '12px', color: '#475569', borderBottom: '1px solid #e2e8f0' }}>Descrição dos Serviços / Materiais</th>
                  <th style={{ padding: '10px', textAlign: 'center', fontSize: '12px', color: '#475569', borderBottom: '1px solid #e2e8f0' }}>Qtd</th>
                  <th style={{ padding: '10px', textAlign: 'right', fontSize: '12px', color: '#475569', borderBottom: '1px solid #e2e8f0' }}>Valor Unit.</th>
                  <th style={{ padding: '10px', textAlign: 'right', fontSize: '12px', color: '#475569', borderBottom: '1px solid #e2e8f0' }}>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {orcamentoParaPdf.itens.map((it, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px', fontSize: '13px', color: '#334155' }}>{it.descricao}</td>
                    <td style={{ padding: '10px', textAlign: 'center', fontSize: '13px', color: '#334155' }}>{it.quantidade}</td>
                    <td style={{ padding: '10px', textAlign: 'right', fontSize: '13px', color: '#334155' }}>R$ {Number(it.valorUnitario).toFixed(2)}</td>
                    <td style={{ padding: '10px', textAlign: 'right', fontSize: '13px', fontWeight: '600', color: '#0f172a' }}>
                      R$ {(Number(it.quantidade) * Number(it.valorUnitario)).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Total */}
            <div style={{ marginTop: '20px', textAlign: 'right' }}>
              <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>VALOR TOTAL</span>
              <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#16a34a' }}>
                R$ {orcamentoParaPdf.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>

            {/* Rodapé */}
            <div style={{ marginTop: '40px', paddingTop: '16px', borderTop: '1px solid #e2e8f0', textAlign: 'center' }}>
              <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>Obrigado pela oportunidade de apresentar esta proposta!</p>
              <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px', margin: 0 }}>Validade desta proposta: 15 dias a contar da data de emissão.</p>
            </div>

          </div>
        )}
      </div>

    </div>
  );
}