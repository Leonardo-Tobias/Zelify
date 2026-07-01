import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Hash SHA-256 via SubtleCrypto (disponível em navegadores modernos e Node 18+).
 * Garante que senhas nunca sejam salvas em texto puro no localStorage (modo Mock).
 */
async function hashPassword(password: string): Promise<string> {
  if (typeof window !== 'undefined' && window.crypto?.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
  // Fallback para SSR (nunca deve rodar no servidor neste projeto client-side)
  return btoa(password);
}

// Hash pré-computado da senha seed '123456' para as contas de demo
// SHA-256('123456') = 8d969eef...
const SEED_PASSWORD_HASH = '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92';

/**
 * Estima o uso atual do localStorage em kilobytes.
 * Cada caractere em localStorage ocupa ~2 bytes (UTF-16).
 */
function getLocalStorageUsageKB(): number {
  if (typeof window === 'undefined') return 0;
  let total = 0;
  for (const key of Object.keys(localStorage)) {
    const value = localStorage.getItem(key) || '';
    total += (key.length + value.length) * 2; // bytes
  }
  return Math.round(total / 1024); // KB
}

// Limite seguro: 4MB (deixa 1MB de margem do limite de 5MB do navegador)
const LOCAL_STORAGE_SAFE_LIMIT_KB = 4096;

export function logClient(msg: string) {
  if (typeof window !== 'undefined') {
    const w = window as any;
    w.clientLogs = w.clientLogs || [];
    w.clientLogs.push(`[${new Date().toLocaleTimeString('pt-BR')}] ${msg}`);
  }
}

// --- Interfaces de Tipos ---

export interface Condominio {
  id: string;
  nome: string;
  slug: string;
  codigo_acesso: string;
  plan_type: 'free' | 'pro' | 'corporate';
  subscription_status: 'active' | 'past_due' | 'canceled';
  asaas_customer_id?: string | null;
  asaas_subscription_id?: string | null;
  billing_type?: 'PIX' | 'CREDIT_CARD' | null;
  current_period_end?: string | null;
  created_at: string;
}

export interface UsuarioGestor {
  id: string;
  user_id: string;
  condominio_id: string;
  nome: string;
  papel: 'sindico' | 'zelador' | 'admin';
  created_at: string;
}

export interface Chamado {
  id: string;
  condominio_id: string;
  tipo: 'manutencao' | 'achado_perdido';
  local: string;
  bloco: string;
  apartamento: string;
  descricao: string;
  foto_url?: string;
  status: 'pendente' | 'em_execucao' | 'resolvido' | 'encontrado' | 'aguardando_retirada' | 'entregue';
  created_at: string;
  updated_at: string;
}

// --- Detecção do Supabase ---

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

let supabase: SupabaseClient | null = null;
if (isSupabaseConfigured) {
  supabase = createClient(supabaseUrl!, supabaseAnonKey!);
}

// --- Dados Mock Iniciais (Semente) ---

const MOCK_CONDOMINIOS: Condominio[] = [
  {
    id: 'condo-id-1',
    nome: 'Residencial Viver Bem',
    slug: 'viverbem',
    codigo_acesso: '1234',
    plan_type: 'free',
    subscription_status: 'active',
    asaas_customer_id: null,
    current_period_end: null,
    created_at: new Date().toISOString()
  },
  {
    id: 'condo-id-2',
    nome: 'Residencial Harmony',
    slug: 'harmony',
    codigo_acesso: '0000',
    plan_type: 'free',
    subscription_status: 'active',
    asaas_customer_id: null,
    current_period_end: null,
    created_at: new Date().toISOString()
  }
];

const MOCK_GESTORES: UsuarioGestor[] = [
  {
    id: 'gestor-id-1',
    user_id: 'sindico-auth-id',
    condominio_id: 'condo-id-1',
    nome: 'Carlos Santos (Síndico)',
    papel: 'sindico',
    created_at: new Date().toISOString()
  },
  {
    id: 'gestor-id-2',
    user_id: 'zelador-auth-id',
    condominio_id: 'condo-id-1',
    nome: 'Marcos Silva (Zelador)',
    papel: 'zelador',
    created_at: new Date().toISOString()
  }
];

const MOCK_CHAMADOS: Chamado[] = [
  {
    id: 'chamado-1',
    condominio_id: 'condo-id-1',
    tipo: 'manutencao',
    local: 'Elevador',
    bloco: 'A',
    apartamento: '102',
    descricao: 'O elevador de serviço está fazendo um barulho metálico muito forte ao passar pelo 4º andar.',
    status: 'pendente',
    created_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(), // 2 horas atrás
    updated_at: new Date(Date.now() - 1000 * 60 * 120).toISOString()
  },
  {
    id: 'chamado-2',
    condominio_id: 'condo-id-1',
    tipo: 'manutencao',
    local: 'Garagem',
    bloco: 'B',
    apartamento: '45',
    descricao: 'Infiltração no teto da vaga 12 da garagem subterrânea, gotejando água com calcário sobre a pintura dos carros.',
    status: 'em_execucao',
    created_at: new Date(Date.now() - 1000 * 60 * 600).toISOString(), // 10 horas atrás
    updated_at: new Date(Date.now() - 1000 * 60 * 300).toISOString()
  },
  {
    id: 'chamado-3',
    condominio_id: 'condo-id-1',
    tipo: 'manutencao',
    local: 'Piscina',
    bloco: 'A',
    apartamento: '305',
    descricao: 'A lâmpada subaquática da piscina infantil soltou do nicho de fixação. Risco de segurança elétrica.',
    status: 'resolvido',
    created_at: new Date(Date.now() - 1000 * 60 * 1440).toISOString(), // 1 dia atrás
    updated_at: new Date(Date.now() - 1000 * 60 * 720).toISOString()
  },
  {
    id: 'chamado-4',
    condominio_id: 'condo-id-1',
    tipo: 'achado_perdido',
    local: 'Playground',
    bloco: 'Portaria',
    apartamento: '00',
    descricao: 'Ursinho de pelúcia marrom (chaveiro) encontrado perto dos balanços do playground infantil.',
    status: 'encontrado',
    created_at: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 180).toISOString()
  },
  {
    id: 'chamado-5',
    condominio_id: 'condo-id-1',
    tipo: 'achado_perdido',
    local: 'Hall',
    bloco: 'Portaria',
    apartamento: '00',
    descricao: 'Chave de carro com chaveiro azul encontrada nos sofás da recepção social.',
    status: 'aguardando_retirada',
    created_at: new Date(Date.now() - 1000 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 500).toISOString()
  },
  {
    id: 'chamado-6',
    condominio_id: 'condo-id-1',
    tipo: 'achado_perdido',
    local: 'Corredor',
    bloco: 'B',
    apartamento: '12',
    descricao: 'Óculos de grau com armação metálica fina encontrado no corredor do Bloco B, 2º andar.',
    status: 'entregue',
    created_at: new Date(Date.now() - 1000 * 60 * 2000).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 1500).toISOString()
  }
];

// --- Classe para Acesso Local (Mock) ---

export interface MockAuthCredential {
  email: string;
  password: string;
  gestor_id: string;
}

class LocalDB {
  private isBrowser() {
    return typeof window !== 'undefined';
  }

  private getStorageItem<T>(key: string, defaultValue: T): T {
    if (!this.isBrowser()) return defaultValue;
    const value = localStorage.getItem(key);
    if (!value) {
      localStorage.setItem(key, JSON.stringify(defaultValue));
      return defaultValue;
    }
    try {
      return JSON.parse(value);
    } catch {
      return defaultValue;
    }
  }

  private setStorageItem<T>(key: string, value: T): void {
    if (this.isBrowser()) {
      localStorage.setItem(key, JSON.stringify(value));
    }
  }

  // Obter condomínios
  getCondominios(): Condominio[] {
    return this.getStorageItem('zelcore_condominios', MOCK_CONDOMINIOS);
  }

  // Obter gestores
  getGestores(): UsuarioGestor[] {
    return this.getStorageItem('zelcore_gestores', MOCK_GESTORES);
  }

  // Obter chamados
  getChamadosRaw(): Chamado[] {
    return this.getStorageItem('zelcore_chamados', MOCK_CHAMADOS);
  }

  // Obter credenciais de login mock
  getAuthCredentials(): MockAuthCredential[] {
    return this.getStorageItem('zelcore_auth_credentials', []);
  }

  // Salvar condomínios
  saveCondominios(data: Condominio[]): void {
    this.setStorageItem('zelcore_condominios', data);
  }

  // Salvar gestores
  saveGestores(data: UsuarioGestor[]): void {
    this.setStorageItem('zelcore_gestores', data);
  }

  // Salvar chamados
  saveChamados(data: Chamado[]): void {
    this.setStorageItem('zelcore_chamados', data);
  }

  // Salvar credenciais de login mock
  saveAuthCredentials(data: MockAuthCredential[]): void {
    this.setStorageItem('zelcore_auth_credentials', data);
  }
}

const localDB = new LocalDB();

// --- Implementação Unificada das Operações ---

export const db = {
  /**
   * Busca um condomínio pelo slug correspondente.
   */
  async getCondominioBySlug(slug: string): Promise<Condominio | null> {
    logClient(`getCondominioBySlug: Iniciado para slug="${slug}"`);
    if (supabase) {
      logClient(`getCondominioBySlug: Usando Supabase`);
      try {
        const { data, error } = await supabase
          .from('condominios')
          .select('*')
          .eq('slug', slug)
          .maybeSingle();
        if (error) {
          logClient(`getCondominioBySlug: Erro Supabase = ${error.message}`);
          console.error('Erro getCondominioBySlug:', error);
        }
        logClient(`getCondominioBySlug: Sucesso Supabase = ${JSON.stringify(data)}`);
        return data;
      } catch (err) {
        logClient(`getCondominioBySlug: Crash Supabase = ${err instanceof Error ? err.message : String(err)}`);
        throw err;
      }
    } else {
      logClient(`getCondominioBySlug: Usando LocalDB (Mock)`);
      try {
        const condominios = localDB.getCondominios();
        logClient(`getCondominioBySlug: Condominios carregados do localStorage = ${condominios.length} itens`);
        const result = condominios.find(c => c.slug.toLowerCase() === slug.toLowerCase()) || null;
        logClient(`getCondominioBySlug: Encontrado = ${JSON.stringify(result)}`);
        return result;
      } catch (err) {
        logClient(`getCondominioBySlug: Crash LocalDB = ${err instanceof Error ? err.message : String(err)}`);
        throw err;
      }
    }
  },

  /**
   * Valida o código de acesso de um condomínio.
   */
  async validateAcesso(condominioId: string, codigo: string): Promise<boolean> {
    if (supabase) {
      // SEGURANÇA: Usa RPC com SECURITY DEFINER para validar o código sem expô-lo via SELECT.
      // A ANON_KEY nunca acessa o campo codigo_acesso diretamente.
      const { data, error } = await supabase.rpc('validar_codigo_acesso', {
        p_condominio_id: condominioId,
        p_codigo: codigo
      });
      if (error) return false;
      return data === true;
    } else {
      const condominios = localDB.getCondominios();
      const condo = condominios.find(c => c.id === condominioId);
      return condo?.codigo_acesso === codigo;
    }
  },

  /**
   * Retorna os chamados de um condomínio, opcionalmente filtrados por tipo.
   */
  async getChamados(condominioId: string, tipo?: 'manutencao' | 'achado_perdido'): Promise<Chamado[]> {
    if (supabase) {
      let query = supabase
        .from('chamados')
        .select('*')
        .eq('condominio_id', condominioId);
      
      if (tipo) {
        query = query.eq('tipo', tipo);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) {
        console.error('Erro ao buscar chamados:', error);
        return [];
      }
      return data || [];
    } else {
      let chamados = localDB.getChamadosRaw();
      chamados = chamados.filter(c => c.condominio_id === condominioId);
      if (tipo) {
        chamados = chamados.filter(c => c.tipo === tipo);
      }
      // Ordenar decrescente por data de criação
      return chamados.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
  },

  /**
   * Cria um chamado no condomínio.
   */
  async createChamado(chamado: Omit<Chamado, 'id' | 'created_at' | 'updated_at'>): Promise<Chamado> {
    const timestamp = new Date().toISOString();
    const id = 'chamado-' + Math.random().toString(36).substring(2, 9);
    
    if (supabase) {
      const { data, error } = await supabase
        .from('chamados')
        .insert({
          ...chamado,
          created_at: timestamp,
          updated_at: timestamp
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    } else {
      const novoChamado: Chamado = {
        ...chamado,
        id,
        created_at: timestamp,
        updated_at: timestamp
      };

      // Guarda de espaço: verificar se salvar este chamado (com foto base64) excederia o limite seguro
      // Evita corrupção silenciosa do localStorage por estouro de 5MB
      const chamadoJson = JSON.stringify(novoChamado);
      const chamadoSizeKB = Math.round((chamadoJson.length * 2) / 1024);
      const currentUsageKB = getLocalStorageUsageKB();

      if (currentUsageKB + chamadoSizeKB > LOCAL_STORAGE_SAFE_LIMIT_KB && novoChamado.foto_url) {
        // Espaço insuficiente: salvar sem a foto para não corromper o localStorage
        console.warn(`[Zelcore Mock] Limite de armazenamento local próximo (${currentUsageKB}KB). Foto removida do chamado para evitar estouro.`);
        novoChamado.foto_url = '';
      }

      const chamados = localDB.getChamadosRaw();
      chamados.push(novoChamado);
      localDB.saveChamados(chamados);
      return novoChamado;
    }
  },

  /**
   * Altera o status de um chamado (Kanban ou Achados e Perdidos).
   */
  async updateChamadoStatus(
    id: string, 
    status: Chamado['status']
  ): Promise<Chamado | null> {
    const timestamp = new Date().toISOString();
    
    if (supabase) {
      const { data, error } = await supabase
        .from('chamados')
        .update({
          status,
          updated_at: timestamp
        })
        .eq('id', id)
        .select()
        .maybeSingle();
      if (error) throw error;
      return data;
    } else {
      const chamados = localDB.getChamadosRaw();
      const index = chamados.findIndex(c => c.id === id);
      if (index === -1) return null;
      
      chamados[index] = {
        ...chamados[index],
        status,
        updated_at: timestamp
      };
      localDB.saveChamados(chamados);
      return chamados[index];
    }
  },

  /**
   * Atualiza as configurações de slug, nome e código do condomínio.
   */
  async updateCondominioSettings(
    id: string,
    nome: string,
    slug: string,
    codigoAcesso: string
  ): Promise<Condominio | null> {
    if (supabase) {
      const { data, error } = await supabase
        .from('condominios')
        .update({
          nome,
          slug,
          codigo_acesso: codigoAcesso
        })
        .eq('id', id)
        .select()
        .maybeSingle();
      if (error) throw error;
      return data;
    } else {
      const condominios = localDB.getCondominios();
      const index = condominios.findIndex(c => c.id === id);
      if (index === -1) return null;
      
      condominios[index] = {
        ...condominios[index],
        nome,
        slug,
        codigo_acesso: codigoAcesso
      };
      localDB.saveCondominios(condominios);
      return condominios[index];
    }
  },

  /**
   * Efetua o login do Gestor.
   * Retorna os dados do gestor logado e do condomínio associado.
   */
  async loginGestor(email: string, password: string): Promise<{ gestor: UsuarioGestor; condominio: Condominio } | null> {
    if (supabase) {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      if (authError || !authData.user) return null;
      
      const { data: gestorData, error: gestorError } = await supabase
        .from('usuarios_gestores')
        .select('*, condominios(*)')
        .eq('user_id', authData.user.id)
        .single();
      
      if (gestorError || !gestorData) return null;
      
      const { condominios: condo, ...gestor } = gestorData as any;
      return {
        gestor,
        condominio: condo
      };
    } else {
      // 1. Procurar nas credenciais dinâmicas cadastradas
      const credentials = localDB.getAuthCredentials();
      // Comparar usando hash SHA-256 — senhas nunca ficam em texto puro
      const hashedInput = await hashPassword(password);
      const match = credentials.find(c => c.email.toLowerCase() === email.toLowerCase() && c.password === hashedInput);
      
      let gestor: UsuarioGestor | undefined;
      if (match) {
        const gestores = localDB.getGestores();
        gestor = gestores.find(g => g.id === match.gestor_id);
      } else {
        // Fallback para os dados pré-semeados (mock padrão)
        // Compara com hash pré-computado de '123456'
        if (hashedInput !== SEED_PASSWORD_HASH) return null;
        
        const gestores = localDB.getGestores();
        if (email === 'sindico@viverbem.com') {
          gestor = gestores.find(g => g.papel === 'sindico' && g.id === 'gestor-id-1');
        } else if (email === 'zelador@viverbem.com') {
          gestor = gestores.find(g => g.papel === 'zelador' && g.id === 'gestor-id-2');
        }
      }
      
      if (!gestor) return null;
      
      const condominios = localDB.getCondominios();
      const condo = condominios.find(c => c.id === gestor!.condominio_id);
      if (!condo) return null;
      
      return {
        gestor,
        condominio: condo
      };
    }
  },

  /**
   * Verifica se um slug de condomínio é único e está disponível.
   */
  async isSlugUnique(slug: string): Promise<boolean> {
    const cleanSlug = slug.trim().toLowerCase();
    if (supabase) {
      const { data, error } = await supabase
        .from('condominios')
        .select('id')
        .eq('slug', cleanSlug)
        .maybeSingle();
      if (error) return false;
      return !data;
    } else {
      const condominios = localDB.getCondominios();
      const exists = condominios.some(c => c.slug.toLowerCase() === cleanSlug);
      return !exists;
    }
  },

  /**
   * Efetua o cadastro do Gestor e criação do condomínio.
   * Retorna os dados do gestor e do condomínio cadastrado.
   */
  async cadastrarGestor(dados: {
    nome: string;
    email: string;
    password: string;
    condominioNome: string;
    condominioSlug: string;
    codigoAcesso: string;
  }): Promise<{ gestor: UsuarioGestor; condominio: Condominio }> {
    if (supabase) {
      // 1. Criar o usuário no Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: dados.email,
        password: dados.password,
        options: {
          data: {
            nome: dados.nome
          }
        }
      });
      if (authError || !authData.user) {
        throw new Error(authError?.message || 'Falha ao criar usuário de autenticação.');
      }

      // 2. Inserir o condomínio com plano grátis ativo por padrão
      const { data: condoData, error: condoError } = await supabase
        .from('condominios')
        .insert({
          nome: dados.condominioNome,
          slug: dados.condominioSlug.trim().toLowerCase(),
          codigo_acesso: dados.codigoAcesso,
          plan_type: 'free',
          subscription_status: 'active'
        })
        .select()
        .single();
      if (condoError || !condoData) {
        throw new Error(condoError?.message || 'Falha ao registrar o condomínio.');
      }

      // 3. Inserir o gestor vinculado
      const gestorId = crypto.randomUUID();
      const { error: gestorError } = await supabase
        .from('usuarios_gestores')
        .insert({
          id: gestorId,
          user_id: authData.user.id,
          condominio_id: condoData.id,
          nome: dados.nome,
          papel: 'sindico'
        });
      if (gestorError) {
        throw new Error(gestorError.message || 'Falha ao registrar o perfil do gestor.');
      }

      const gestorData: UsuarioGestor = {
        id: gestorId,
        user_id: authData.user.id,
        condominio_id: condoData.id,
        nome: dados.nome,
        papel: 'sindico',
        created_at: new Date().toISOString()
      };

      return {
        gestor: gestorData,
        condominio: condoData
      };
    } else {
      // 1. Validar unicidade do e-mail no Mock
      const credentials = localDB.getAuthCredentials();
      const emailExists = credentials.some(c => c.email.toLowerCase() === dados.email.toLowerCase()) || 
                          dados.email === 'sindico@viverbem.com' || dados.email === 'zelador@viverbem.com';
      if (emailExists) {
        throw new Error('E-mail já cadastrado.');
      }

      // 2. Criar condomínio mock
      const condoId = 'condo-mock-' + Math.random().toString(36).substring(2, 9);
      const novoCondo: Condominio = {
        id: condoId,
        nome: dados.condominioNome,
        slug: dados.condominioSlug.trim().toLowerCase(),
        codigo_acesso: dados.codigoAcesso,
        plan_type: 'free',
        subscription_status: 'active',
        asaas_customer_id: null,
        current_period_end: null,
        created_at: new Date().toISOString()
      };
      const condominios = localDB.getCondominios();
      condominios.push(novoCondo);
      localDB.saveCondominios(condominios);

      // 3. Criar gestor mock
      const gestorId = 'gestor-mock-' + Math.random().toString(36).substring(2, 9);
      const novoGestor: UsuarioGestor = {
        id: gestorId,
        user_id: 'user-mock-' + Math.random().toString(36).substring(2, 9),
        condominio_id: condoId,
        nome: dados.nome,
        papel: 'sindico',
        created_at: new Date().toISOString()
      };
      const gestores = localDB.getGestores();
      gestores.push(novoGestor);
      localDB.saveGestores(gestores);

      // 4. Salvar credencial de login mock com senha hasheada (SHA-256)
      // Nunca salvar senha em texto puro no localStorage
      const hashedPassword = await hashPassword(dados.password);
      const novaCredencial: MockAuthCredential = {
        email: dados.email,
        password: hashedPassword,
        gestor_id: gestorId
      };
      credentials.push(novaCredencial);
      localDB.saveAuthCredentials(credentials);

      return {
        gestor: novoGestor,
        condominio: novoCondo
      };
    }
  },

  /**
   * Upload de imagem para o Supabase Storage.
   * Em modo Mock, apenas retorna a string base64 enviada.
   */
  async uploadImagem(file: File | string, condominioId: string): Promise<string> {
    if (typeof file === 'string') {
      // Já é uma string Base64 (usada para o modo Mock ou imagens pré-processadas)
      if (!supabase) {
        return file; // Retorna o base64 para salvar direto no banco (localStorage)
      }
      
      // Se for Supabase e vier como base64 string, converte para blob primeiro
      try {
        const res = await fetch(file);
        const blob = await res.blob();
        const fileObj = new File([blob], `upload-${Date.now()}.jpg`, { type: 'image/jpeg' });
        return await uploadFileToSupabase(fileObj, condominioId);
      } catch (err) {
        console.error('Falha ao converter base64 para upload:', err);
        return file;
      }
    } else {
      if (!supabase) {
        // Se for modo Mock e for um arquivo cru, não deve acontecer, mas previne
        return '';
      }
      return await uploadFileToSupabase(file, condominioId);
    }
  },

  /**
   * Obtém a quantidade de chamados criados no mês atual para um condomínio.
   */
  async getMonthlyChamadosCount(condominioId: string): Promise<number> {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    if (supabase) {
      const { count, error } = await supabase
        .from('chamados')
        .select('*', { count: 'exact', head: true })
        .eq('condominio_id', condominioId)
        .gte('created_at', startOfMonth.toISOString());
      
      if (error) {
        console.error('Erro ao contar chamados do mês:', error);
        return 0;
      }
      return count || 0;
    } else {
      const chamados = localDB.getChamadosRaw();
      return chamados.filter(c => 
        c.condominio_id === condominioId && 
        new Date(c.created_at) >= startOfMonth
      ).length;
    }
  },

  /**
   * Atualiza o plano e status de assinatura do condomínio.
   */
  async updateCondominioPlan(
    id: string,
    planType: 'free' | 'pro' | 'corporate',
    subscriptionStatus: 'active' | 'past_due' | 'canceled',
    billingInterval: 'monthly' | 'yearly' = 'monthly',
    billingType?: 'PIX' | 'CREDIT_CARD'
  ): Promise<Condominio | null> {
    const days = billingInterval === 'yearly' ? 365 : 30;
    const periodEnd = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
    
    if (supabase) {
      const updateData: Record<string, unknown> = {
        plan_type: planType,
        subscription_status: subscriptionStatus,
        current_period_end: periodEnd
      };
      if (billingType) updateData.billing_type = billingType;
      
      const { data, error } = await supabase
        .from('condominios')
        .update(updateData)
        .eq('id', id)
        .select()
        .maybeSingle();
      
      if (error) throw error;
      return data as Condominio;
    } else {
      const condominios = localDB.getCondominios();
      const index = condominios.findIndex(c => c.id === id);
      if (index === -1) return null;
      
      condominios[index] = {
        ...condominios[index],
        plan_type: planType,
        subscription_status: subscriptionStatus,
        current_period_end: periodEnd,
        billing_type: (billingType || condominios[index].billing_type) as 'PIX' | 'CREDIT_CARD' | null | undefined,
      };
      localDB.saveCondominios(condominios);
      return condominios[index];
    }
  },

  /**
   * Obtém todos os condomínios aos quais o gestor tem acesso (para administradoras).
   */
  /**
   * Retorna o usuário autenticado atual do Supabase.
   * Usado para verificar se o JWT ainda é válido ao carregar o dashboard.
   * Retorna null em modo Mock (sem Supabase).
   */
  async getCurrentUser(): Promise<{ id: string } | null> {
    if (supabase) {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) return null;
      return { id: user.id };
    }
    return null; // Modo Mock: sem validação de JWT real
  },

  async getCondominiosByGestorUser(userId: string): Promise<Condominio[]> {
    if (supabase) {
      const { data: gestorRows, error: gestorError } = await supabase
        .from('usuarios_gestores')
        .select('condominio_id')
        .eq('user_id', userId);
      
      if (gestorError || !gestorRows) {
        console.error('Erro ao buscar vinculos do gestor:', gestorError);
        return [];
      }
      
      const condoIds = gestorRows.map(r => r.condominio_id);
      if (condoIds.length === 0) return [];
      
      const { data: condos, error: condoError } = await supabase
        .from('condominios')
        .select('*')
        .in('id', condoIds);
      
      if (condoError || !condos) {
        console.error('Erro ao buscar condominios por IDs:', condoError);
        return [];
      }
      return condos;
    } else {
      // No modo Mock, buscamos todos os gestores vinculados a esse user_id
      const gestores = localDB.getGestores();
      const userGestores = gestores.filter(g => g.user_id === userId);
      const condoIds = userGestores.map(g => g.condominio_id);
      
      const condominios = localDB.getCondominios();
      return condominios.filter(c => condoIds.includes(c.id));
    }
  },

  async resetToFreePlan(id: string): Promise<Condominio | null> {
    if (supabase) {
      const { data, error } = await supabase
        .from('condominios')
        .update({
          plan_type: 'free',
          subscription_status: 'active',
          billing_type: null,
          current_period_end: null,
          asaas_customer_id: null,
          asaas_subscription_id: null,
        })
        .eq('id', id)
        .select()
        .maybeSingle();

      if (error) throw error;
      return data as Condominio;
    } else {
      const condominios = localDB.getCondominios();
      const index = condominios.findIndex(c => c.id === id);
      if (index === -1) return null;

      condominios[index] = {
        ...condominios[index],
        plan_type: 'free',
        subscription_status: 'active',
        billing_type: null,
        current_period_end: null,
        asaas_customer_id: null,
        asaas_subscription_id: null,
      };
      localDB.saveCondominios(condominios);
      return condominios[index];
    }
  }
};

async function uploadFileToSupabase(file: File, condominioId: string): Promise<string> {
  const fileExt = file.name.split('.').pop() || 'jpg';
  const fileName = `${condominioId}/${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
  
  const { data, error } = await supabase!
    .storage
    .from('chamados')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false
    });
    
  if (error) throw error;
  
  // Obter URL pública do arquivo
  const { data: publicUrlData } = supabase!
    .storage
    .from('chamados')
    .getPublicUrl(data.path);
    
  return publicUrlData.publicUrl;
}
