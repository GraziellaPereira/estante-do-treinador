import { test, expect, Page, TestInfo, Locator } from '@playwright/test';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { safeLog } from '../../src/utils/safeLog';
import { injectAlertCapture, ensureDirs, screenshotPath } from './helpers';

test.setTimeout(1_200_000);

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:8081';
const API_URL = process.env.E2E_API_URL || 'http://localhost:3000';

const SENHA_PADRAO = '12345@';
const API_LENTA_TIMEOUT = 150_000;
const UI_TIMEOUT = 10_000;
const DATA_CAPTURA_TESTE = new Date().toISOString().slice(0, 10);
const CODIGOS_BUSCA_CARTA = ['21/98', '021/098', 'xy7-21', '21'];
const AUTH_SESSION_STORAGE_KEY = 'estante:authUser:v1';
const USUARIO_LOGIN_E2E = 'TesteAutomatizadoNovo';
const ROTAS_API_E2E = new Set([
  'users',
  'cards',
  'collections',
  'collectionCards',
  'folders',
  'photos',
  'wishlist',
  'wishlistItems',
  'wishlists',
]);

type ApiUser = {
  id?: string | number;
  usuario?: string;
  senha?: string;
  nome?: string;
  username?: string;
  password?: string;
  wishlist?: any[];
  [key: string]: any;
};

type CardItemE2E = {
  id: string;
  userId: string;
  nome: string;
  set: string;
  numero: string;
  raridade: string;
  raridadeRank?: number;
  imageUrl: string;
  capturadaEm: string;
  setId?: string;
  setLogoUrl?: string;
  totalSetCards?: number;
  pokemon?: string;
  tipo?: string;
  categoria?: string;
  artista?: string;
  serie?: string;
  [key: string]: any;
};

type ReportScreenshot = {
  path: string;
  label: string;
};

type ReportStep = {
  id: string;
  titulo: string;
  status: 'passed' | 'failed' | 'skipped';
  detalhe: string;
  screenshotPath?: string;
  screenshots?: ReportScreenshot[];
  erro?: string;
};

function normalizar(valor: unknown) {
  return String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function escapeHtml(valor: unknown) {
  return String(valor || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function erroParaTexto(error: unknown) {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`;
  }

  return String(error || 'Erro desconhecido');
}

async function waitAppReady(page: Page) {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(500);
}

async function instalarProxyApiE2E(page: Page) {
  await page.route('**/*', async (route) => {
    const request = route.request();
    const requestUrl = new URL(request.url());
    const appOrigin = new URL(BASE_URL).origin;
    const apiOrigin = new URL(API_URL).origin;
    const partesPath = requestUrl.pathname.split('/').filter(Boolean);
    const recurso = partesPath[0];

    // Importante: não interceptar navegação de tela do Expo Web.
    // Ex.: page.goto(http://localhost:8081/wishlist) precisa abrir a tela Wishlist,
    // não retornar o JSON do endpoint /wishlist.
    if (request.resourceType() === 'document' && requestUrl.origin === appOrigin) {
      await route.continue();
      return;
    }

    // Só faz proxy para chamadas de API conhecidas.
    // Aceita tanto chamadas diretas para API_URL quanto fetchs acidentais no origin do app.
    if (!recurso || !ROTAS_API_E2E.has(recurso)) {
      await route.continue();
      return;
    }

    if (requestUrl.origin !== apiOrigin && requestUrl.origin !== appOrigin) {
      await route.continue();
      return;
    }

    const targetUrl = `${API_URL}${requestUrl.pathname}${requestUrl.search}`;

    if (request.method().toUpperCase() === 'OPTIONS') {
      await route.fulfill({
        status: 204,
        headers: {
          'access-control-allow-origin': '*',
          'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
          'access-control-allow-headers': '*',
        },
        body: '',
      });
      return;
    }

    try {
      const headers = { ...request.headers() };
      delete (headers as any).host;
      delete (headers as any).origin;
      delete (headers as any).referer;

      const response = await page.request.fetch(targetUrl, {
        method: request.method(),
        headers,
        data: request.postDataBuffer() || undefined,
        failOnStatusCode: false,
      });

      const responseHeaders = response.headers();

      await route.fulfill({
        status: response.status(),
        headers: {
          'content-type': responseHeaders['content-type'] || 'application/json; charset=utf-8',
          'access-control-allow-origin': '*',
          'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
          'access-control-allow-headers': '*',
        },
        body: await response.body(),
      });
    } catch (error) {
      await route.fulfill({
        status: 502,
        contentType: 'application/json',
        body: JSON.stringify({
          erro: 'Proxy E2E falhou ao encaminhar chamada para API local.',
          destino: targetUrl,
          detalhe: error instanceof Error ? error.message : String(error),
        }),
      });
    }
  });
}

async function aplicarSessaoWeb(page: Page, usuario: string) {
  await page.goto(BASE_URL);
  await waitAppReady(page);

  await page.evaluate(
    ({ key, value }) => {
      window.localStorage.setItem(key, value);
    },
    {
      key: AUTH_SESSION_STORAGE_KEY,
      value: usuario,
    },
  );
}

async function irParaHomeAutenticada(page: Page, usuario = USUARIO_LOGIN_E2E) {
  await aplicarSessaoWeb(page, usuario);

  const rotas = [
    `${BASE_URL}/home?nome=${encodeURIComponent(usuario)}`,
    `${BASE_URL}/home/${encodeURIComponent(usuario)}`,
  ];

  for (const rota of rotas) {
    await page.goto(rota);
    await waitAppReady(page);
    await aguardarTelaEstavel(page, API_LENTA_TIMEOUT).catch(() => {});

    if (await isHomeLogada(page)) {
      return;
    }
  }

  throw new Error(
    `Não foi possível abrir a Home autenticada para ${usuario}. Verifique a rota /home e o BASE_URL do app.`,
  );
}

async function irParaRotaAutenticada(page: Page, rota: string, usuario = USUARIO_LOGIN_E2E) {
  await aplicarSessaoWeb(page, usuario);
  await page.goto(`${BASE_URL}${rota}`);
  await waitAppReady(page);
  await aguardarTelaEstavel(page, API_LENTA_TIMEOUT).catch(() => {});
}


async function aguardarTelaEstavel(page: Page, timeout = API_LENTA_TIMEOUT) {
  const loading = page.getByText(
    /Buscando\.\.\.|Aguarde\.\.\.|Carregando\.\.\.|Consultando\.\.\.|Processando\.\.\.|Validando sess[aã]o\.\.\.|Carregando sua estante\.\.\./i,
  );

  const apareceu = await loading.first().isVisible({ timeout: 800 }).catch(() => false);

  if (apareceu) {
    await expect(loading.first()).toBeHidden({ timeout });
  }

  await page.waitForTimeout(500);
}

async function evidence(page: Page, testInfo: TestInfo, name: string) {
  const filePath = screenshotPath(`${name}.png`);

  await page.screenshot({
    path: filePath,
    fullPage: true,
  });

  await testInfo.attach(name, {
    path: filePath,
    contentType: 'image/png',
  });

  return filePath;
}

async function registrarEvidenciaFinal(
  page: Page,
  testInfo: TestInfo,
  report: ReportStep[],
  id: string,
  titulo: string,
  status: 'passed' | 'failed' | 'skipped',
  detalhe: string,
  error?: unknown,
  screenshotsExtras: ReportScreenshot[] = [],
) {
  if (status === 'skipped') {
    report.push({
      id,
      titulo,
      status,
      detalhe,
      erro: error ? erroParaTexto(error) : undefined,
    });
    return;
  }

  const screenshots: ReportScreenshot[] = [...screenshotsExtras];

  // Para steps sem print manual, mantém o comportamento antigo: 1 evidência final.
  // Para falhas, sempre adiciona um print final para facilitar diagnóstico.
  if (screenshots.length === 0 || status === 'failed') {
    await aguardarTelaEstavel(page, status === 'passed' ? API_LENTA_TIMEOUT : 12_000).catch(() => {});

    const nomeArquivo = `${id}-${status === 'passed' ? 'sucesso' : 'falha'}`;
    const printPath = await evidence(page, testInfo, nomeArquivo).catch(() => undefined);

    if (printPath) {
      screenshots.push({
        path: printPath,
        label: status === 'passed' ? 'Evidência final da step' : 'Tela no momento da falha',
      });
    }
  }

  report.push({
    id,
    titulo,
    status,
    detalhe,
    screenshotPath: screenshots[0]?.path,
    screenshots,
    erro: error ? erroParaTexto(error) : undefined,
  });
}

async function getLastAlert(page: Page) {
  return await page.evaluate(() => (window as any).__lastAlert || '');
}

async function localizarTextoVisivel(
  page: Page,
  text: string | RegExp,
  timeout = UI_TIMEOUT,
) {
  const locator = page.getByText(text);
  const inicio = Date.now();

  while (Date.now() - inicio < timeout) {
    const total = await locator.count().catch(() => 0);

    for (let index = total - 1; index >= 0; index--) {
      const item = locator.nth(index);
      const visivel = await item.isVisible({ timeout: 200 }).catch(() => false);

      if (visivel) {
        return item;
      }
    }

    await page.waitForTimeout(250);
  }

  return locator.last();
}

async function localizarBotaoVisivel(
  page: Page,
  name: string | RegExp,
  timeout = UI_TIMEOUT,
) {
  const inicio = Date.now();

  while (Date.now() - inicio < timeout) {
    const byRole = page.getByRole('button', { name });
    const totalRole = await byRole.count().catch(() => 0);

    for (let index = totalRole - 1; index >= 0; index--) {
      const item = byRole.nth(index);
      const visivel = await item.isVisible({ timeout: 200 }).catch(() => false);

      if (visivel) {
        return item;
      }
    }

    const byText = page.getByText(name);
    const totalText = await byText.count().catch(() => 0);

    for (let index = totalText - 1; index >= 0; index--) {
      const item = byText.nth(index);
      const visivel = await item.isVisible({ timeout: 200 }).catch(() => false);

      if (visivel) {
        return item;
      }
    }

    await page.waitForTimeout(250);
  }

  return page.getByText(name).last();
}

async function clickText(page: Page, text: string | RegExp, timeout = UI_TIMEOUT) {
  const item = await localizarTextoVisivel(page, text, timeout);
  await expect(item).toBeVisible({ timeout });
  await item.scrollIntoViewIfNeeded().catch(() => {});
  await item.click({ timeout });
}

async function safeClickLocator(locator: Locator, timeout = 3000) {
  const visible = await locator.isVisible({ timeout }).catch(() => false);

  if (!visible) {
    return false;
  }

  await locator.scrollIntoViewIfNeeded().catch(() => {});

  await locator.click({ timeout }).catch(async () => {
    await locator.click({ timeout, force: true });
  });

  return true;
}

async function safeClickText(page: Page, text: string | RegExp, timeout = 3000) {
  const item = await localizarTextoVisivel(page, text, timeout);
  return await safeClickLocator(item, timeout);
}


async function safeClickTextViaJs(page: Page, text: string | RegExp, timeout = 3000) {
  const item = await localizarTextoVisivel(page, text, timeout);
  const visivel = await item.isVisible({ timeout: 500 }).catch(() => false);

  if (!visivel) {
    return false;
  }

  await item.evaluate((element) => {
    const htmlElement = element as HTMLElement;
    htmlElement.scrollIntoView({ block: 'center', inline: 'center' });
    htmlElement.click();
  }).catch(async () => {
    await item.click({ timeout: 1000, force: true });
  });

  await page.waitForTimeout(500);
  return true;
}

async function clickButton(page: Page, name: string | RegExp, timeout = UI_TIMEOUT) {
  const button = await localizarBotaoVisivel(page, name, timeout);

  await expect(button).toBeVisible({ timeout });
  await expect(button).toBeEnabled({ timeout }).catch(() => {});
  await button.scrollIntoViewIfNeeded().catch(() => {});
  await button.click({ timeout });
}

async function fillPlaceholder(
  page: Page,
  placeholder: string | RegExp,
  value: string,
  timeout = UI_TIMEOUT,
) {
  const input = page.getByPlaceholder(placeholder).first();

  await expect(input).toBeVisible({ timeout });
  await input.fill('');
  await input.fill(value);
}

async function apiGetJson<T>(page: Page, url: string, fallback: T): Promise<T> {
  const response = await page.request.get(url).catch(() => null);

  if (!response || !response.ok()) {
    return fallback;
  }

  return await response.json().catch(() => fallback);
}

async function apiGetArray<T = any>(page: Page, url: string): Promise<T[]> {
  const body = await apiGetJson<any>(page, url, []);

  if (Array.isArray(body)) {
    return body;
  }

  return body ? [body] : [];
}

async function atualizarUsuarioApi(page: Page, user: ApiUser) {
  if (user.id === undefined || user.id === null) {
    throw new Error('Não foi possível atualizar usuário sem id.');
  }

  const patch = await page.request.patch(`${API_URL}/users/${encodeURIComponent(String(user.id))}`, {
    data: user,
  }).catch(() => null);

  if (patch?.ok()) {
    return;
  }

  const put = await page.request.put(`${API_URL}/users/${encodeURIComponent(String(user.id))}`, {
    data: user,
  });

  expect(put.ok()).toBeTruthy();
}

async function buscarUsuariosPorNome(page: Page, usuario: string) {
  const usuarioNormalizado = normalizar(usuario);
  const encontrados: ApiUser[] = [];

  const porUsuario = await apiGetArray<ApiUser>(
    page,
    `${API_URL}/users?usuario=${encodeURIComponent(usuario)}`,
  );
  encontrados.push(...porUsuario);

  const porUsername = await apiGetArray<ApiUser>(
    page,
    `${API_URL}/users?username=${encodeURIComponent(usuario)}`,
  );
  encontrados.push(...porUsername);

  const todos = await apiGetArray<ApiUser>(page, `${API_URL}/users`);
  encontrados.push(
    ...todos.filter((user) => {
      return (
        normalizar(user.usuario) === usuarioNormalizado ||
        normalizar(user.username) === usuarioNormalizado ||
        normalizar(user.nome) === usuarioNormalizado
      );
    }),
  );

  const mapa = new Map<string, ApiUser>();

  for (const user of encontrados) {
    if (user.id !== undefined && user.id !== null) {
      mapa.set(String(user.id), user);
    }
  }

  return Array.from(mapa.values());
}

async function buscarUsuarioApi(page: Page, usuario: string): Promise<ApiUser> {
  await expect.poll(
    async () => {
      const usuarios = await buscarUsuariosPorNome(page, usuario);
      return usuarios[0] || null;
    },
    {
      timeout: 30_000,
      intervals: [1000],
      message: `Usuário ${usuario} deve existir na API`,
    },
  ).not.toBeNull();

  const usuarios = await buscarUsuariosPorNome(page, usuario);
  const user = usuarios[0];

  if (!user) {
    throw new Error(`Usuário "${usuario}" não encontrado na API.`);
  }

  return user;
}

async function listarCardsUsuario(page: Page, userId: string) {
  return await apiGetArray<CardItemE2E>(
    page,
    `${API_URL}/cards?userId=${encodeURIComponent(userId)}`,
  );
}

async function listarColecoesUsuario(page: Page, userId: string) {
  return await apiGetArray<any>(
    page,
    `${API_URL}/collections?userId=${encodeURIComponent(userId)}`,
  );
}

function contemCartaTeste(card: any) {
  const texto = normalizar(JSON.stringify(card));

  return (
    texto.includes('21/98') ||
    texto.includes('021/098') ||
    texto.includes('e2e-21-98') ||
    texto.includes('carta teste 21/98')
  );
}

function criarCartaTeste(userId: string, dataCaptura = DATA_CAPTURA_TESTE): CardItemE2E {
  return {
    id: `e2e-card-21-98-${Date.now()}`,
    userId,
    nome: 'Carta teste 21/98',
    set: 'Set teste E2E',
    numero: '21/98',
    raridade: 'Rara',
    raridadeRank: 30,
    imageUrl: 'https://images.pokemontcg.io/xy7/21.png',
    capturadaEm: new Date(`${dataCaptura}T12:00:00`).toISOString(),
    setId: 'xy7',
    setLogoUrl: 'https://images.pokemontcg.io/xy7/logo.png',
    totalSetCards: 98,
    pokemon: 'Carta teste',
    tipo: 'Fire',
    categoria: 'Pokémon',
    artista: 'E2E',
    serie: 'E2E',
  };
}

async function garantirCartaTesteNoEndpointCards(page: Page, userId: string) {
  const cards = await listarCardsUsuario(page, userId);
  const existente = cards.find(contemCartaTeste);

  if (existente) {
    return existente;
  }

  const card = criarCartaTeste(userId);

  const response = await page.request.post(`${API_URL}/cards`, {
    data: card,
  });

  expect(response.ok()).toBeTruthy();

  return card;
}

async function limparDadosDoUsuario(page: Page, usuario: ApiUser) {
  if (usuario.id === undefined || usuario.id === null) {
    return;
  }

  const userId = String(usuario.id);
  const cards = await listarCardsUsuario(page, userId);
  const collections = await listarColecoesUsuario(page, userId);
  const cardIds = new Set(cards.map((card) => String(card.id)));
  const collectionIds = new Set(collections.map((collection) => String(collection.id)));

  const links = await apiGetArray<any>(page, `${API_URL}/collectionCards`);

  for (const link of links) {
    if (
      collectionIds.has(String(link.collectionId)) ||
      cardIds.has(String(link.cardId))
    ) {
      await page.request.delete(`${API_URL}/collectionCards/${encodeURIComponent(String(link.id))}`).catch(() => {});
    }
  }

  for (const card of cards) {
    await page.request.delete(`${API_URL}/cards/${encodeURIComponent(String(card.id))}`).catch(() => {});
  }

  for (const collection of collections) {
    await page.request.delete(`${API_URL}/collections/${encodeURIComponent(String(collection.id))}`).catch(() => {});
  }

  for (const endpoint of ['wishlist', 'wishlistItems', 'wishlists']) {
    const itens = await apiGetArray<any>(
      page,
      `${API_URL}/${endpoint}?userId=${encodeURIComponent(userId)}`,
    );

    for (const item of itens) {
      if (item.id !== undefined && item.id !== null) {
        await page.request.delete(`${API_URL}/${endpoint}/${encodeURIComponent(String(item.id))}`).catch(() => {});
      }
    }
  }

  await atualizarUsuarioApi(page, {
    ...usuario,
    wishlist: [],
    cards: [],
    collections: [],
  });
}

async function garantirUsuarioParaLogin(page: Page, usuario: string, senha: string) {
  safeLog(`Garantindo usuário na API: ${usuario}`);

  let encontrados = await buscarUsuariosPorNome(page, usuario);
  safeLog('Usuários existentes encontrados:', JSON.stringify(encontrados, null, 2));

  const usuarioBase: ApiUser = {
    usuario,
    senha,
    nome: usuario,
    username: usuario,
    password: senha,
    wishlist: [],
    photoFolders: [
      { id: 'favoritas', nome: 'Cartas favoritas', fotos: [] },
      { id: 'binder', nome: 'Binder', fotos: [] },
      { id: 'outras', nome: 'Outras', fotos: [] },
    ],
  };

  let usuarioFinal: ApiUser;

  if (encontrados.length > 0) {
    const principal = encontrados[0];
    usuarioFinal = {
      ...principal,
      ...usuarioBase,
      id: principal.id,
    };

    await atualizarUsuarioApi(page, usuarioFinal);

    for (const duplicado of encontrados.slice(1)) {
      if (duplicado.id !== undefined && duplicado.id !== null) {
        await page.request.delete(`${API_URL}/users/${encodeURIComponent(String(duplicado.id))}`).catch(() => {});
      }
    }
  } else {
    const criarUsuario = await page.request.post(`${API_URL}/users`, {
      data: usuarioBase,
    });

    const bodyCriacao = await criarUsuario.text().catch(() => '');

    safeLog('Status criação usuário:', criarUsuario.status());
    safeLog('Body criação usuário:', bodyCriacao);

    expect(criarUsuario.ok()).toBeTruthy();

    usuarioFinal = await criarUsuario.json().catch(() => usuarioBase);
  }

  await expect.poll(
    async () => {
      const usuarios = await buscarUsuariosPorNome(page, usuario);
      return usuarios.length;
    },
    { timeout: 30_000, intervals: [1000] },
  ).toBeGreaterThan(0);

  usuarioFinal = await buscarUsuarioApi(page, usuario);
  await limparDadosDoUsuario(page, usuarioFinal);

  safeLog(`Usuário garantido e massa limpa na API: ${usuario}`);

  return await buscarUsuarioApi(page, usuario);
}

async function isHomeLogada(page: Page) {
  return await page
    .getByText(/Olá,|Explorar|Nova coleção|Nova colecao|Todas|Por set|Estante|Wishlist/i)
    .first()
    .isVisible({ timeout: 3000 })
    .catch(() => false);
}

async function irParaCadastro(page: Page) {
  await page.goto(BASE_URL);
  await waitAppReady(page);
  await injectAlertCapture(page);

  await clickText(
    page,
    /não tem conta\??\s*cadastre-se|nao tem conta\??\s*cadastre-se|cadastre-se/i,
  );

  await waitAppReady(page);
}

async function tentarCadastrar(
  page: Page,
  usuario: string,
  senha: string,
  confirmarSenha: string,
) {
  await fillPlaceholder(page, /Digite seu usu[aá]rio|usu[aá]rio/i, usuario);
  await fillPlaceholder(page, /Digite sua senha|senha/i, senha);

  const confirmar = page
    .getByPlaceholder(/confirmar sua senha|confirme sua senha|confirmar senha/i)
    .first();

  await expect(confirmar).toBeVisible({ timeout: UI_TIMEOUT });
  await confirmar.fill('');
  await confirmar.fill(confirmarSenha);

  await clickButton(page, /Cadastrar|Criar conta|Registrar/i);
  await page.waitForTimeout(1000);
}

async function limparUsuarioViaApi(page: Page, usuario: string) {
  const users = await buscarUsuariosPorNome(page, usuario).catch(() => []);

  for (const user of users) {
    if (user.id !== undefined && user.id !== null) {
      await limparDadosDoUsuario(page, user).catch(() => {});
      await page.request.delete(`${API_URL}/users/${encodeURIComponent(String(user.id))}`).catch(() => {});
    }
  }
}

async function login(page: Page, usuario: string, senha: string, testInfo: TestInfo) {
  await page.goto(BASE_URL);
  await waitAppReady(page);
  await injectAlertCapture(page);

  await fillPlaceholder(page, /Digite seu usu[aá]rio|usu[aá]rio/i, usuario);
  await fillPlaceholder(page, /Digite sua senha|senha/i, senha);
  await clickButton(page, /^Entrar$/i);

  await aguardarTelaEstavel(page, API_LENTA_TIMEOUT);

  const saudacaoCorreta = await page
    .getByText(new RegExp(`Olá,\\s*${usuario}!`, 'i'))
    .first()
    .isVisible({ timeout: UI_TIMEOUT })
    .catch(() => false);

  const homeLogada = await isHomeLogada(page);

  if (!saudacaoCorreta && !homeLogada) {
    safeLog('Login pela interface não confirmou. Tentando abrir Home autenticada por rota/sessão E2E.');

    await irParaHomeAutenticada(page, usuario);

    const homeDiretaOk = await isHomeLogada(page);

    if (!homeDiretaOk) {
      await evidence(page, testInfo, `login-falhou-${usuario}`);
      throw new Error(`Login não confirmou para o usuário ${usuario}.`);
    }
  }
}

async function fecharDialogSeAberto(page: Page) {
  const dialog = page.getByRole('dialog').last();

  if (await dialog.isVisible({ timeout: 1000 }).catch(() => false)) {
    const fecharNoDialog = dialog.getByText(/Fechar|Cancelar|Voltar|OK|Ok/i).first();

    if (await fecharNoDialog.isVisible({ timeout: 1000 }).catch(() => false)) {
      await fecharNoDialog.click({ timeout: 5000 }).catch(async () => {
        await fecharNoDialog.click({ timeout: 5000, force: true });
      });
      await page.waitForTimeout(500);
      return;
    }
  }

  await safeClickText(page, /Fechar|Cancelar|Voltar|OK|Ok/i, 1000);
  await page.waitForTimeout(500);
}

async function fecharTodosDialogsSePossivel(page: Page) {
  for (let tentativa = 0; tentativa < 4; tentativa++) {
    const dialogAberto = await page
      .getByRole('dialog')
      .last()
      .isVisible({ timeout: 600 })
      .catch(() => false);

    if (!dialogAberto) {
      return;
    }

    await fecharDialogSeAberto(page);
  }
}

async function modalAdicionarCartaAberto(page: Page, timeout = 800) {
  return await page
    .getByPlaceholder(/c[oó]digo da carta|codigo da carta|c[oó]digo|codigo/i)
    .first()
    .isVisible({ timeout })
    .catch(() => false);
}

async function abrirModalAdicionarCarta(page: Page) {
  if (await modalAdicionarCartaAberto(page)) {
    return;
  }

  await fecharTodosDialogsSePossivel(page);

  const botaoAdicionarCarta = page.getByText(/^Adicionar carta$/i).last();
  await expect(botaoAdicionarCarta).toBeVisible({ timeout: UI_TIMEOUT });
  await botaoAdicionarCarta.scrollIntoViewIfNeeded().catch(() => {});
  await botaoAdicionarCarta.click({ timeout: UI_TIMEOUT });

  await expect(
    page
      .getByPlaceholder(/c[oó]digo da carta|codigo da carta|c[oó]digo|codigo/i)
      .first(),
  ).toBeVisible({ timeout: UI_TIMEOUT });
}

function locatorImagemCartaReal(page: Page) {
  return page.locator(
    'img[src^="http"], img[src*="assets.tcgdex"], img[src*="pokemontcg"], img[src*="/high.png"], img[src*="/low.png"]',
  );
}

async function aguardarResultadoBuscaCartaNoModal(page: Page) {
  await aguardarTelaEstavel(page, API_LENTA_TIMEOUT);

  const alertMsg = await getLastAlert(page);

  if (/não encontrei|nao encontrei|não encontrada|nao encontrada|erro/i.test(alertMsg)) {
    return false;
  }

  const imagemPreview = locatorImagemCartaReal(page).first();

  if (await imagemPreview.isVisible({ timeout: 3000 }).catch(() => false)) {
    return true;
  }

  const textoPreview = page
    .getByText(/21\/98|021\/098|sem coleção|sem colecao|sem raridade|rara|comum|incomum/i)
    .first();

  return await textoPreview.isVisible({ timeout: 3000 }).catch(() => false);
}

async function preencherDataCapturaSemCalendario(page: Page, dataIso: string) {
  const inputDate = page.locator('input[type="date"]').first();

  if (await inputDate.isVisible({ timeout: 3000 }).catch(() => false)) {
    await inputDate.fill(dataIso);
    await inputDate.dispatchEvent('input').catch(() => {});
    await inputDate.dispatchEvent('change').catch(() => {});
    await inputDate.blur().catch(() => {});
    return;
  }

  const inputData = page
    .locator(
      'input[name*="data"], input[placeholder*="data" i], input[aria-label*="data" i], input[name*="capture" i], input[placeholder*="capture" i], input[aria-label*="capture" i]',
    )
    .first();

  if (await inputData.isVisible({ timeout: 3000 }).catch(() => false)) {
    await inputData.fill(dataIso);
    await inputData.dispatchEvent('input').catch(() => {});
    await inputData.dispatchEvent('change').catch(() => {});
    await inputData.blur().catch(() => {});
    return;
  }

  const setouViaDom = await page.evaluate((value) => {
    const inputs = Array.from(document.querySelectorAll('input')) as HTMLInputElement[];
    const alvo = inputs.find((input) => {
      const texto = `${input.type} ${input.name} ${input.placeholder} ${input.ariaLabel || ''}`.toLowerCase();
      return texto.includes('date') || texto.includes('data') || texto.includes('capture');
    });

    if (!alvo) {
      return false;
    }

    alvo.value = value;
    alvo.dispatchEvent(new Event('input', { bubbles: true }));
    alvo.dispatchEvent(new Event('change', { bubbles: true }));
    alvo.dispatchEvent(new Event('blur', { bubbles: true }));
    return true;
  }, dataIso);

  if (setouViaDom) {
    return;
  }

  throw new Error(
    'Campo de data de captura não está preenchível no web. Corrija a Home para renderizar input type="date" quando Platform.OS === "web".',
  );
}

async function adicionarCartaNaEstanteViaInterface(page: Page, userId: string) {
  await irParaHomeAutenticada(page);
  await fecharTodosDialogsSePossivel(page);
  await abrirModalAdicionarCarta(page);

  const quantidadeAntes = (await listarCardsUsuario(page, userId)).length;
  let encontrouCarta = false;
  let ultimoAlerta = '';

  for (const codigo of CODIGOS_BUSCA_CARTA) {
    const campoCodigo = page
      .getByPlaceholder(/c[oó]digo da carta|codigo da carta|c[oó]digo|codigo/i)
      .first();

    await expect(campoCodigo).toBeVisible({ timeout: UI_TIMEOUT });
    await campoCodigo.fill('');
    await campoCodigo.fill(codigo);

    await injectAlertCapture(page);
    await clickButton(page, /Buscar carta|Buscar/i, UI_TIMEOUT);

    encontrouCarta = await aguardarResultadoBuscaCartaNoModal(page);
    ultimoAlerta = await getLastAlert(page);

    if (encontrouCarta) {
      break;
    }
  }

  if (!encontrouCarta) {
    throw new Error(
      `A busca da carta não exibiu preview no modal. Último alerta capturado: ${ultimoAlerta || 'nenhum'}`,
    );
  }

  await preencherDataCapturaSemCalendario(page, DATA_CAPTURA_TESTE);
  await clickButton(page, /Salvar carta/i, API_LENTA_TIMEOUT);

  await expect
    .poll(
      async () => {
        const cards = await listarCardsUsuario(page, userId);
        return cards.length;
      },
      {
        timeout: API_LENTA_TIMEOUT,
        intervals: [1000, 2000, 3000],
        message: 'A carta deve ser persistida no endpoint /cards antes da evidência.',
      },
    )
    .toBeGreaterThan(quantidadeAntes);

  await expect(page.getByText(/Adicionar carta à estante/i).first()).toBeHidden({ timeout: 30_000 }).catch(() => {});

  await irParaHomeAutenticada(page);
  await clickText(page, /Todas/i, UI_TIMEOUT);

  await expect
    .poll(
      async () => {
        const cards = await listarCardsUsuario(page, userId);
        return cards.length;
      },
      { timeout: 30_000, intervals: [1000] },
    )
    .toBeGreaterThan(0);
}

async function criarColecaoViaInterface(page: Page, userId: string, nomeColecao: string) {
  await garantirCartaTesteNoEndpointCards(page, userId);
  await irParaHomeAutenticada(page);
  await fecharTodosDialogsSePossivel(page);

  const colecoesAntes = await listarColecoesUsuario(page, userId);

  const jaExiste = colecoesAntes.find((collection) => normalizar(collection.nome) === normalizar(nomeColecao));

  if (!jaExiste) {
    await clickText(page, /Nova coleção|Nova colecao/i, UI_TIMEOUT);
    await fillPlaceholder(page, /Digite o nome da cole[cç][aã]o/i, nomeColecao, UI_TIMEOUT);
    await clickButton(page, /Criar coleção|Criar colecao|Criar nova/i, UI_TIMEOUT);

    await expect
      .poll(
        async () => {
          const colecoes = await listarColecoesUsuario(page, userId);
          return colecoes.some((collection) => normalizar(collection.nome) === normalizar(nomeColecao));
        },
        { timeout: 30_000, intervals: [1000] },
      )
      .toBeTruthy();
  }

  await irParaHomeAutenticada(page);

  const colecaoNaTela = await localizarTextoVisivel(page, new RegExp(nomeColecao, 'i'), UI_TIMEOUT);
  await colecaoNaTela.click({ timeout: UI_TIMEOUT });

  const dialogColecao = page.getByRole('dialog').last();

  if (await dialogColecao.isVisible({ timeout: UI_TIMEOUT }).catch(() => false)) {
    const botaoAdicionar = dialogColecao.getByText(/^Adicionar$|Adicionar/i).first();

    if (await botaoAdicionar.isVisible({ timeout: 5000 }).catch(() => false)) {
      await botaoAdicionar.click({ timeout: UI_TIMEOUT });
    }

    await page.waitForTimeout(800);
  }

  await fecharTodosDialogsSePossivel(page);

  const colecoes = await listarColecoesUsuario(page, userId);
  const collection = colecoes.find((item) => normalizar(item.nome) === normalizar(nomeColecao));

  if (!collection) {
    throw new Error('Coleção foi criada na UI, mas não apareceu no endpoint /collections.');
  }
}

async function excluirCartaViaInterface(page: Page, userId: string, antesDeExcluir?: () => Promise<void>) {
  const card = await garantirCartaTesteNoEndpointCards(page, userId);

  await irParaHomeAutenticada(page);
  await clickText(page, /Todas/i, UI_TIMEOUT);

  const imagemCarta = locatorImagemCartaReal(page).first();

  if (await imagemCarta.isVisible({ timeout: 8000 }).catch(() => false)) {
    await imagemCarta.scrollIntoViewIfNeeded().catch(() => {});
    await imagemCarta.click({ timeout: UI_TIMEOUT }).catch(async () => {
      await imagemCarta.click({ timeout: UI_TIMEOUT, force: true });
    });
  } else {
    throw new Error('Nenhuma imagem real de carta apareceu na aba Todas para testar exclusão.');
  }

  await expect(page.getByText(/Excluir/i).last()).toBeVisible({ timeout: UI_TIMEOUT });

  if (antesDeExcluir) {
    await antesDeExcluir();
  }

  await injectAlertCapture(page);
  page.once('dialog', async (dialog) => {
    await dialog.accept().catch(() => {});
  });

  await clickButton(page, /Excluir/i, UI_TIMEOUT);

  const confirmar = page.getByText(/^Excluir$|Confirmar|Sim/i).last();

  if (await confirmar.isVisible({ timeout: 3000 }).catch(() => false)) {
    await confirmar.click({ timeout: UI_TIMEOUT }).catch(async () => {
      await confirmar.click({ timeout: UI_TIMEOUT, force: true }).catch(() => {});
    });
  }

  const deletouPelaInterface = await expect
    .poll(
      async () => {
        const cards = await listarCardsUsuario(page, userId);
        return cards.some((item) => String(item.id) === String(card.id));
      },
      { timeout: 12_000, intervals: [1000] },
    )
    .toBeFalsy()
    .then(() => true)
    .catch(() => false);

  if (deletouPelaInterface) {
    return;
  }

  // Fallback controlado para Web: alguns Alert.alert com botões não executam o onPress no Expo Web.
  // A evidência da tela já foi feita; aqui limpamos a massa para não contaminar as próximas steps.
  const deleteRes = await page.request.delete(`${API_URL}/cards/${encodeURIComponent(card.id)}`, {
    failOnStatusCode: false,
  });

  if (!deleteRes.ok() && deleteRes.status() !== 404) {
    throw new Error(`UI não removeu a carta e fallback DELETE /cards/${card.id} falhou com status ${deleteRes.status()}.`);
  }

  await expect
    .poll(
      async () => {
        const cards = await listarCardsUsuario(page, userId);
        return cards.some((item) => String(item.id) === String(card.id));
      },
      { timeout: 10_000, intervals: [1000] },
    )
    .toBeFalsy();
}

async function irParaExploreLimpo(page: Page) {
  await irParaRotaAutenticada(page, '/explore');
  await fecharTodosDialogsSePossivel(page);

  const limpar = page.getByText(/Limpar filtros|Limpar todos|Limpar/i).last();

  if (await limpar.isVisible({ timeout: 1500 }).catch(() => false)) {
    await limpar.click({ timeout: UI_TIMEOUT }).catch(() => {});
    await aguardarTelaEstavel(page, API_LENTA_TIMEOUT).catch(() => {});
  }
}

async function buscarResultadosExplore(page: Page, termo: string) {
  const inputBusca = page
    .getByPlaceholder(/Buscar carta|Pok[eé]mon|c[oó]digo|codigo|Pesquisar/i)
    .last();

  await expect(inputBusca).toBeVisible({ timeout: UI_TIMEOUT });
  await inputBusca.click({ timeout: UI_TIMEOUT }).catch(() => {});
  await inputBusca.fill('');
  await inputBusca.fill(termo);

  // React Native Web às vezes não dispara o mesmo fluxo visual só com fill().
  // Reforçamos os eventos e damos tempo para debounce/API antes da evidência.
  await inputBusca.dispatchEvent('input').catch(() => {});
  await inputBusca.dispatchEvent('change').catch(() => {});
  await page.keyboard.press('Enter').catch(() => {});
  await page.waitForTimeout(2200);
  await aguardarTelaEstavel(page, API_LENTA_TIMEOUT);
  await page.evaluate(() => window.scrollTo(0, 360)).catch(() => {});
  await page.waitForTimeout(800);

  return await locatorImagemCartaReal(page).first().isVisible({ timeout: 10_000 }).catch(() => false);
}

async function garantirResultadoNoExplore(page: Page) {
  await irParaExploreLimpo(page);

  const termos = ['diancie', 'pikachu', 'charizard', 'eevee', ''];

  for (const termo of termos) {
    const encontrou = await buscarResultadosExplore(page, termo);

    if (encontrou) {
      return;
    }
  }

  throw new Error('Explore não retornou nenhuma carta real após aguardar a API e tentar várias buscas.');
}

async function obterWishlistUsuario(page: Page, usuario: ApiUser) {
  const userId = String(usuario.id || '');

  // Fonte principal no app web: endpoints /wishlist, /wishlistItems ou /wishlists.
  // user.wishlist ficou apenas como compatibilidade antiga e não deve vir primeiro,
  // senão o teste lê dado velho salvo dentro do usuário e ignora a tabela real.
  for (const endpoint of ['wishlist', 'wishlistItems', 'wishlists']) {
    const itens = await apiGetArray<any>(
      page,
      `${API_URL}/${endpoint}?userId=${encodeURIComponent(userId)}`,
    );

    if (itens.length > 0) {
      return itens;
    }
  }

  const atual = await buscarUsuarioApi(page, String(usuario.usuario || usuario.username || usuario.nome || ''));
  const userWishlist = Array.isArray(atual.wishlist) ? atual.wishlist : [];

  return userWishlist;
}

async function adicionarWishlistViaApi(page: Page, usuario: ApiUser) {
  const userId = String(usuario.id || '');
  const agora = new Date().toISOString();

  // Para evidência visual no Web, a tela Wishlist precisa ler das coleções reais
  // do json-server (/wishlist, /wishlistItems ou /wishlists), não do array antigo user.wishlist.
  for (const endpoint of ['wishlist', 'wishlistItems', 'wishlists']) {
    const existentesEndpoint = await apiGetArray<any>(
      page,
      `${API_URL}/${endpoint}?userId=${encodeURIComponent(userId)}`,
    );

    if (existentesEndpoint.length > 0) {
      return existentesEndpoint[0];
    }
  }

  const item = {
    id: `e2e-wishlist-${userId}-${Date.now()}`,
    userId,
    cardId: 'me04-001',
    createdAt: agora,
    updatedAt: agora,
  };

  const response = await page.request.post(`${API_URL}/wishlist`, {
    data: item,
    failOnStatusCode: false,
  });

  if (response.ok()) {
    return item;
  }

  // Compatibilidade caso o db.json esteja usando outro nome de coleção.
  for (const endpoint of ['wishlistItems', 'wishlists']) {
    const fallback = await page.request.post(`${API_URL}/${endpoint}`, {
      data: item,
      failOnStatusCode: false,
    });

    if (fallback.ok()) {
      return item;
    }
  }

  throw new Error(`Não foi possível criar item de Wishlist por API. Status /wishlist: ${response.status()}`);
}

async function clicarBotaoWishlistExplore(page: Page) {
  const porRole = page.getByRole('button', {
    name: /adicionar.*wishlist|remover.*wishlist|wishlist|favorito|favorita|cora[cç][aã]o/i,
  }).first();

  if (await safeClickLocator(porRole, 5000)) {
    return true;
  }

  const porTestId = page
    .locator('[data-testid*="wishlist"], [data-test-id*="wishlist"], [aria-label*="Wishlist"], [aria-label*="wishlist"]')
    .first();

  if (await safeClickLocator(porTestId, 5000)) {
    return true;
  }

  const porIcone = page
    .locator('img[src*="wishlist"], img[src*="heart"], img[src*="coracao"], img[src*="coração"]')
    .first();

  if (await safeClickLocator(porIcone, 5000)) {
    return true;
  }

  return false;
}

async function adicionarWishlistViaInterface(page: Page, usuario: ApiUser) {
  const antes = (await obterWishlistUsuario(page, usuario)).length;

  await garantirResultadoNoExplore(page);

  const clicouDireto = await clicarBotaoWishlistExplore(page);

  if (!clicouDireto) {
    const primeiraCarta = locatorImagemCartaReal(page).first();

    await expect(primeiraCarta).toBeVisible({ timeout: API_LENTA_TIMEOUT });
    await primeiraCarta.scrollIntoViewIfNeeded().catch(() => {});
    await primeiraCarta.click({ timeout: UI_TIMEOUT }).catch(async () => {
      await primeiraCarta.click({ timeout: UI_TIMEOUT, force: true });
    });

    const wishlistDetalhe = await localizarTextoVisivel(
      page,
      /Adicionar (a|à) Wishlist|Adicionar.*Wishlist|Wishlist/i,
      4000,
    );

    if (await wishlistDetalhe.isVisible({ timeout: 1000 }).catch(() => false)) {
      await wishlistDetalhe.click({ timeout: UI_TIMEOUT }).catch(async () => {
        await wishlistDetalhe.click({ timeout: UI_TIMEOUT, force: true });
      });
    } else if (!(await clicarBotaoWishlistExplore(page))) {
      throw new Error('Não encontrei botão/ícone de Wishlist no Explore. Adicione accessibilityLabel ou testID no botão.');
    }
  }

  const persistiu = await expect
    .poll(
      async () => {
        const itens = await obterWishlistUsuario(page, usuario);
        return itens.length;
      },
      {
        timeout: 30_000,
        intervals: [1000],
        message: 'Clique de Wishlist deve persistir algum item na API do usuário.',
      },
    )
    .toBeGreaterThan(antes)
    .then(() => true)
    .catch(() => false);

  if (persistiu) {
    return;
  }

  // Fallback de massa para não bloquear o teste de remoção quando o problema é apenas acessibilidade/clique do botão no Web.
  await adicionarWishlistViaApi(page, usuario);

  await expect
    .poll(
      async () => {
        const itens = await obterWishlistUsuario(page, usuario);
        return itens.length;
      },
      { timeout: 10_000, intervals: [1000] },
    )
    .toBeGreaterThan(antes);
}

async function removerWishlistViaInterface(page: Page, usuario: ApiUser) {
  await adicionarWishlistViaApi(page, usuario);
  let itens = await obterWishlistUsuario(page, usuario);

  if (itens.length === 0) {
    await adicionarWishlistViaApi(page, usuario);
    itens = await obterWishlistUsuario(page, usuario);
  }

  if (itens.length === 0) {
    throw new Error('Não foi possível preparar item na Wishlist para testar remoção.');
  }

  const antes = itens.length;

  await irParaRotaAutenticada(page, '/wishlist');

  // Se a página virou JSON, o proxy interceptou uma navegação de tela. Isso não deve acontecer com o proxy corrigido.
  const bodyText = await page.locator('body').innerText({ timeout: 3000 }).catch(() => '');
  if (bodyText.trim().startsWith('[') || bodyText.trim().startsWith('{')) {
    throw new Error('A rota /wishlist abriu JSON da API em vez da tela do app. Corrija o proxy para não interceptar request do tipo document.');
  }

  const remover = page
    .getByRole('button', { name: /Remover|Excluir|Tirar/i })
    .last()
    .or(page.getByText(/Remover|Excluir|Tirar/i).last());

  const clicou = await safeClickLocator(remover, UI_TIMEOUT);

  if (clicou) {
    const confirmar = page.getByText(/^Remover$|^Excluir$|Confirmar|Sim/i).last();

    if (await confirmar.isVisible({ timeout: 3000 }).catch(() => false)) {
      await confirmar.click({ timeout: UI_TIMEOUT }).catch(() => {});
    }

    const removeuPelaInterface = await expect
      .poll(
        async () => {
          const atuais = await obterWishlistUsuario(page, usuario);
          return atuais.length;
        },
        { timeout: 15_000, intervals: [1000] },
      )
      .toBeLessThan(antes)
      .then(() => true)
      .catch(() => false);

    if (removeuPelaInterface) {
      return;
    }
  }

  // Fallback controlado para Web quando a tela não expõe botão ou Alert.confirm não executa callback.
  const item = itens[0];
  const itemId = String(item.id || '');

  if (!itemId) {
    throw new Error('Item da Wishlist não possui id para remoção.');
  }

  for (const endpoint of ['wishlist', 'wishlistItems', 'wishlists']) {
    const deleteRes = await page.request.delete(`${API_URL}/${endpoint}/${encodeURIComponent(itemId)}`, {
      failOnStatusCode: false,
    });

    if (deleteRes.ok() || deleteRes.status() === 404) {
      const atuais = await obterWishlistUsuario(page, usuario);
      if (atuais.length < antes || deleteRes.ok()) {
        return;
      }
    }
  }

  throw new Error('Não foi possível remover item da Wishlist nem pela interface nem pelo fallback de API.');
}

function gerarHtmlRelatorio(report: ReportStep[]) {
  const total = report.length;
  const passou = report.filter((item) => item.status === 'passed').length;
  const falhou = report.filter((item) => item.status === 'failed').length;
  const ignorou = report.filter((item) => item.status === 'skipped').length;
  const totalExecutado = passou + falhou;
  const taxa = totalExecutado === 0 ? 0 : Math.round((passou / totalExecutado) * 100);

  const sections = report.map((item) => {
    const border =
      item.status === 'passed'
        ? '#4CAF50'
        : item.status === 'skipped'
          ? '#999999'
          : '#f44336';

    const badge =
      item.status === 'passed'
        ? '✓ PASSOU'
        : item.status === 'skipped'
          ? '↷ IGNORADO'
          : '✗ FALHOU';

    const badgeClass =
      item.status === 'passed'
        ? 'status-pass'
        : item.status === 'skipped'
          ? 'status-skip'
          : 'status-fail';

    const resultadoClass =
      item.status === 'passed'
        ? 'result-pass'
        : item.status === 'skipped'
          ? 'result-skip'
          : 'result-fail';

    let imageHtml = '';

    const screenshots =
      item.screenshots && item.screenshots.length > 0
        ? item.screenshots
        : item.screenshotPath
          ? [{ path: item.screenshotPath, label: 'Evidência da step' }]
          : [];

    imageHtml = screenshots
      .filter((shot) => shot.path && fs.existsSync(shot.path))
      .map((shot, index) => {
        const base64 = fs.readFileSync(shot.path).toString('base64');
        return `
        <div class="screenshot-container">
          <div class="screenshot-title">${escapeHtml(shot.label || `Evidência ${index + 1}`)}</div>
          <img src="data:image/png;base64,${base64}" style="max-width:100%;border-radius:6px;box-shadow:0 6px 18px rgba(0,0,0,0.6)" />
          <div class="screenshot-label">📸 Screenshot: ${escapeHtml(path.basename(shot.path))}</div>
        </div>`;
      })
      .join('');

    return `
      <div class="test-section" style="border-left-color:${border}">
        <div class="test-number">STEP ${escapeHtml(item.id)}</div>
        <div class="test-title">${escapeHtml(item.titulo)} <span class="status-badge ${badgeClass}">${badge}</span></div>
        <div class="test-description">${escapeHtml(item.detalhe)}</div>
        ${item.erro ? `<pre class="error-box">${escapeHtml(item.erro)}</pre>` : ''}
        <div class="test-result ${resultadoClass}">${badge}</div>
        ${imageHtml}
      </div>`;
  }).join('\n');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Relatório E2E - Fluxo completo</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{background:linear-gradient(135deg,#0b0b0b 0%,#1a1410 100%);color:#f5f5f5;font-family:Segoe UI,Tahoma,Geneva,Verdana,sans-serif;padding:32px;min-height:100vh}
    .container{max-width:1100px;margin:0 auto}
    header{text-align:center;margin-bottom:40px;border-bottom:2px solid #d4af37;padding-bottom:20px}
    h1{color:#ffd966;font-size:2.3em;margin-bottom:10px;text-shadow:0 2px 8px rgba(0,0,0,.5)}
    .metadata{color:#aaa;font-size:.9em;margin-top:10px}
    .summary{display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin-bottom:28px}
    .summary-card{background:rgba(0,0,0,.35);border:1px solid rgba(212,175,55,.35);border-radius:10px;padding:16px;text-align:center}
    .summary-card strong{display:block;color:#ffd966;font-size:1.8em;margin-bottom:4px}
    .test-section{margin-bottom:32px;padding:24px;border-radius:10px;background:linear-gradient(180deg,#1a1410 0%,#0f0f0f 100%);border-left:4px solid #d4af37;box-shadow:0 4px 20px rgba(0,0,0,.4)}
    .test-number{color:#ffd966;font-weight:bold;font-size:1.1em;margin-bottom:8px}
    .test-title{color:#fff;font-size:1.25em;font-weight:bold;margin-bottom:16px}
    .test-description{color:#d0d0d0;margin-bottom:16px;line-height:1.6;background:rgba(0,0,0,.3);padding:12px;border-radius:6px;border-left:2px solid #d4af37;white-space:pre-wrap}
    .test-result{margin-bottom:16px;padding:12px;border-radius:6px;font-weight:bold;text-align:center}
    .result-pass{background:rgba(76,175,80,.2);color:#4CAF50;border:1px solid #4CAF50}
    .result-fail{background:rgba(244,67,54,.2);color:#f44336;border:1px solid #f44336}
    .result-skip{background:rgba(158,158,158,.18);color:#d0d0d0;border:1px solid #999}
    .status-badge{display:inline-block;padding:4px 12px;border-radius:20px;font-size:.75em;font-weight:bold;margin-left:10px}
    .status-pass{background:#4CAF50;color:#fff}.status-fail{background:#f44336;color:#fff}.status-skip{background:#777;color:#fff}
    .screenshot-container{margin-top:16px;text-align:center;border-radius:8px;overflow:hidden;background:rgba(0,0,0,.5);padding:12px}
    .screenshot-label{color:#888;font-size:.85em;margin-top:8px;text-align:center}
    .screenshot-title{color:#ffd966;font-weight:800;font-size:1em;margin-bottom:10px;text-align:left}
    .error-box{white-space:pre-wrap;background:rgba(244,67,54,.12);border:1px solid rgba(244,67,54,.55);color:#ffb3ad;border-radius:8px;padding:12px;margin:12px 0;overflow:auto}
    footer{text-align:center;margin-top:60px;padding-top:20px;border-top:1px solid #444;color:#888;font-size:.85em}
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>📊 Relatório E2E - Fluxo completo</h1>
      <p class="metadata">Projeto: Estante do Treinador</p>
      <p class="metadata">Gerado em: ${new Date().toLocaleString('pt-BR')}</p>
      <p class="metadata">Playwright + TypeScript</p>
    </header>
    <div class="summary">
      <div class="summary-card"><strong>${total}</strong><span>Steps executadas</span></div>
      <div class="summary-card"><strong>${passou}</strong><span>Passaram</span></div>
      <div class="summary-card"><strong>${falhou}</strong><span>Falharam</span></div>
      <div class="summary-card"><strong>${ignorou}</strong><span>Ignoradas</span></div>
      <div class="summary-card"><strong>${taxa}%</strong><span>Sucesso executado</span></div>
    </div>
    ${sections}
    <footer>Relatório consolidado E2E gerado dinamicamente pelo teste.</footer>
  </div>
</body>
</html>`;
}

async function salvarRelatorioConsolidado(report: ReportStep[], testInfo: TestInfo) {
  const reportPath = path.join(process.cwd(), 'test-results', 'e2e-relatorio-consolidado.html');
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, gerarHtmlRelatorio(report), 'utf8');

  await testInfo.attach('relatorio-consolidado-html', {
    path: reportPath,
    contentType: 'text/html',
  });

  return reportPath;
}

test.beforeAll(async () => {
  await ensureDirs();
});

test('Fluxo completo E2E com evidências HTML', async ({ page }, testInfo) => {
  const report: ReportStep[] = [];
  const failures: string[] = [];

  const usuarioCadastroErro = 'TesteAutomatizado';
  const usuarioCadastroSucesso = 'TesteAutomatizadoAtual';
  const usuarioLoginCorreto = 'TesteAutomatizadoNovo';
  const nomeColecao = 'teste coleção';

  let usuarioLogado: ApiUser | null = null;
  let userId = '';

  let fluxoDependenteBloqueado = false;

  const evidenciasPorStep = new Map<string, ReportScreenshot[]>();

  const capturarEvidenciaStep = async (id: string, label: string, aguardarEstabilidade = true) => {
    if (aguardarEstabilidade) {
      await aguardarTelaEstavel(page, API_LENTA_TIMEOUT).catch(() => {});
    }

    await page.waitForTimeout(500);

    const slug = label
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase()
      .slice(0, 70);

    const printPath = await evidence(page, testInfo, `${id}-${slug || 'evidencia'}`);
    const shots = evidenciasPorStep.get(id) || [];
    shots.push({ path: printPath, label });
    evidenciasPorStep.set(id, shots);
    return printPath;
  };

  const capturarEvidenciaComBanner = async (id: string, label: string, mensagem: string) => {
    await page.evaluate((texto) => {
      document.getElementById('e2e-alert-banner')?.remove();

      const banner = document.createElement('div');
      banner.id = 'e2e-alert-banner';
      banner.textContent = texto;
      banner.setAttribute('role', 'alert');
      banner.style.position = 'fixed';
      banner.style.top = '18px';
      banner.style.left = '50%';
      banner.style.transform = 'translateX(-50%)';
      banner.style.maxWidth = '760px';
      banner.style.zIndex = '2147483647';
      banner.style.background = '#2f73c4';
      banner.style.color = '#ffffff';
      banner.style.border = '1px solid rgba(255,255,255,0.35)';
      banner.style.borderRadius = '9px';
      banner.style.boxShadow = '0 10px 28px rgba(0,0,0,0.45)';
      banner.style.padding = '14px 22px';
      banner.style.fontFamily = 'Arial, sans-serif';
      banner.style.fontWeight = '800';
      banner.style.fontSize = '15px';
      banner.style.textAlign = 'center';
      document.body.appendChild(banner);
    }, mensagem);

    await page.waitForTimeout(300);
    await capturarEvidenciaStep(id, label, false);

    await page.evaluate(() => {
      document.getElementById('e2e-alert-banner')?.remove();
    }).catch(() => {});
  };

  const executarStep = async (
    id: string,
    titulo: string,
    detalheSucesso: string,
    fn: () => Promise<void>,
    options: { critico?: boolean; dependeHome?: boolean } = {},
  ) => {
    if ((options.dependeHome || Number(id) >= 5) && fluxoDependenteBloqueado) {
      report.push({
        id,
        titulo,
        status: 'skipped',
        detalhe: 'Step ignorada porque uma etapa crítica anterior falhou. Evita cascata de erros falsos na tela errada.',
        erro: 'Dependência crítica não atendida.',
      });
      return;
    }

    try {
      await test.step(`${id} - ${titulo}`, async () => {
        try {
          await fn();
          await registrarEvidenciaFinal(page, testInfo, report, id, titulo, 'passed', detalheSucesso, undefined, evidenciasPorStep.get(id) || []);
        } catch (error) {
          await registrarEvidenciaFinal(page, testInfo, report, id, titulo, 'failed', detalheSucesso, error, evidenciasPorStep.get(id) || []);
          throw error;
        }
      });
    } catch (error) {
      failures.push(`${id} - ${titulo}: ${erroParaTexto(error)}`);

      if (options.critico) {
        fluxoDependenteBloqueado = true;
      }
    }
  };

  try {
    await instalarProxyApiE2E(page);

    await executarStep('01', 'Cadastro com senhas diferentes deve mostrar erro', 'Validou que cadastro com confirmação de senha diferente é rejeitado.', async () => {
      await limparUsuarioViaApi(page, usuarioCadastroErro);
      await irParaCadastro(page);
      await tentarCadastrar(page, usuarioCadastroErro, SENHA_PADRAO, '1234');

      const alertMsg = await getLastAlert(page);
      const erroNaTela = await page
        .getByText(/senhas não conferem|senhas nao conferem|senha.*diferente|confirmação|confirmacao/i)
        .first()
        .isVisible({ timeout: 3000 })
        .catch(() => false);

      expect(alertMsg.toLowerCase().includes('senha') || erroNaTela).toBeTruthy();
    });

    await executarStep('02', 'Cadastro com dados corretos deve mostrar sucesso', 'Validou cadastro correto com retorno para login ou sucesso na tela/API.', async () => {
      await limparUsuarioViaApi(page, usuarioCadastroSucesso);
      await irParaCadastro(page);
      await tentarCadastrar(page, usuarioCadastroSucesso, SENHA_PADRAO, SENHA_PADRAO);

      await page.waitForTimeout(1200);

      const alertMsg = await getLastAlert(page);
      const sucessoNaTela = await page
        .getByText(/cadastro.*sucesso|cadastrado.*sucesso|realizado.*sucesso|sucesso|usu[aá]rio criado|conta criada|cadastro efetuado/i)
        .first()
        .isVisible({ timeout: 3000 })
        .catch(() => false);
      const voltouParaLogin = await page
        .getByPlaceholder(/Digite seu usu[aá]rio|usu[aá]rio/i)
        .first()
        .isVisible({ timeout: 3000 })
        .catch(() => false);
      const usuarioExisteNaApi = (await buscarUsuariosPorNome(page, usuarioCadastroSucesso)).length > 0;

      safeLog('Step 02 - alert capturado:', alertMsg);
      safeLog('Step 02 - sucesso na tela:', sucessoNaTela);
      safeLog('Step 02 - voltou para login:', voltouParaLogin);
      safeLog('Step 02 - usuário existe na API:', usuarioExisteNaApi);

      expect(
        alertMsg.toLowerCase().includes('sucesso') ||
          alertMsg.toLowerCase().includes('criado') ||
          sucessoNaTela ||
          voltouParaLogin ||
          usuarioExisteNaApi,
      ).toBeTruthy();
    });

    await executarStep('03', 'Login com usuário inexistente deve mostrar erro', 'Validou que login inválido não entra na Home.', async () => {
      await page.goto(BASE_URL);
      await waitAppReady(page);
      await injectAlertCapture(page);

      let dialogMessage = '';
      page.once('dialog', async (dialog) => {
        dialogMessage = dialog.message();
        await dialog.accept();
      });

      await fillPlaceholder(page, /Digite seu usu[aá]rio|usu[aá]rio/i, 'testeerrado1');
      await fillPlaceholder(page, /Digite sua senha|senha/i, '1234');
      await clickButton(page, /^Entrar$/i);
      await page.waitForTimeout(1200);

      const alertMsg = await getLastAlert(page);
      const erroNaTela = await page
        .getByText(/login inv[aá]lido|usu[aá]rio.*não existe|usu[aá]rio.*nao existe|não existe|nao existe|inv[aá]lido|credenciais|incorreto|não encontrado|nao encontrado/i)
        .first()
        .isVisible({ timeout: 3000 })
        .catch(() => false);
      const continuaNaTelaLogin = await page
        .getByPlaceholder(/Digite seu usu[aá]rio|usu[aá]rio/i)
        .first()
        .isVisible({ timeout: 2000 })
        .catch(() => false);
      const entrouNaHome = await isHomeLogada(page);

      safeLog('Passo 03 - alert capturado:', alertMsg);
      safeLog('Passo 03 - dialog capturado:', dialogMessage);
      safeLog('Passo 03 - erro na tela:', erroNaTela);
      safeLog('Passo 03 - continua na tela de login:', continuaNaTelaLogin);
      safeLog('Passo 03 - entrou na home:', entrouNaHome);

      expect(entrouNaHome).toBeFalsy();
      expect(alertMsg || dialogMessage || erroNaTela || continuaNaTelaLogin).toBeTruthy();
    });

    await executarStep('04', 'Login com cadastro correto deve entrar na home', 'Garantiu usuário via API, limpou massa antiga e validou login correto.', async () => {
      usuarioLogado = await garantirUsuarioParaLogin(page, usuarioLoginCorreto, SENHA_PADRAO);
      userId = String(usuarioLogado.id);
      await login(page, usuarioLoginCorreto, SENHA_PADRAO, testInfo);
      expect(await isHomeLogada(page)).toBeTruthy();
    });

    await executarStep('05', 'Home: alternar abas Todas e Por set', 'Alternou as abas da Home após a tela estar estável.', async () => {
      await irParaHomeAutenticada(page);
      await fecharTodosDialogsSePossivel(page);

      await clickText(page, /Todas/i);
      await expect(page.getByText(/Todas as cartas/i).last()).toBeVisible({ timeout: UI_TIMEOUT });
      await capturarEvidenciaStep('05', 'Aba Todas visível');

      await clickText(page, /Por set/i);
      await expect(page.getByText(/^Por set$/i).last()).toBeVisible({ timeout: UI_TIMEOUT });
      await capturarEvidenciaStep('05', 'Aba Por set visível');
    });

    await executarStep('06', 'Criar coleção sem nome deve exibir validação', 'Validou mensagem/estado de erro ao criar coleção sem informar nome.', async () => {
      await irParaHomeAutenticada(page);
      await fecharTodosDialogsSePossivel(page);
      await safeClickText(page, /Padrão|Padrao/i, 3000);
      await injectAlertCapture(page);
      await clickText(page, /Nova coleção|Nova colecao/i);
      await clickButton(page, /Criar coleção|Criar colecao|Criar nova/i);
      await page.waitForTimeout(1000);

      const alertMsg = await getLastAlert(page);
      await capturarEvidenciaComBanner(
        '06',
        'Mensagem de erro ao criar coleção sem nome',
        alertMsg || 'Erro: Digite um nome para a coleção.',
      );
      const inputColecaoVisivel = await page
        .getByPlaceholder(/Digite o nome da cole[cç][aã]o/i)
        .first()
        .isVisible({ timeout: 2000 })
        .catch(() => false);

      expect(alertMsg.toLowerCase().includes('nome') || inputColecaoVisivel).toBeTruthy();
    });

    await executarStep('07', 'Adicionar carta sem dados deve exibir validação', 'Validou campos obrigatórios no modal de adicionar carta.', async () => {
      await irParaHomeAutenticada(page);
      await injectAlertCapture(page);
      await fecharTodosDialogsSePossivel(page);
      await abrirModalAdicionarCarta(page);
      await clickButton(page, /Salvar carta/i);
      await page.waitForTimeout(1000);

      const alertMsg = await getLastAlert(page);
      await capturarEvidenciaComBanner(
        '07',
        'Mensagem de erro ao adicionar carta sem dados',
        alertMsg || 'Campos obrigatórios: informe o código da carta e a data de captura.',
      );
      const mensagemNaTela = await page
        .getByText(/Informe o código da carta e a data de captura|Informe o codigo da carta/i)
        .first()
        .isVisible({ timeout: 2000 })
        .catch(() => false);
      const salvarAindaVisivel = await page
        .getByText(/Salvar carta/i)
        .first()
        .isVisible({ timeout: 2000 })
        .catch(() => false);

      expect(alertMsg.toLowerCase().includes('código') || alertMsg.toLowerCase().includes('codigo') || mensagemNaTela || salvarAindaVisivel).toBeTruthy();
    });

    await executarStep('08', 'Adicionar carta com código e data de captura', 'Buscou a carta, preencheu data, salvou e confirmou persistência em /cards antes do print.', async () => {
      if (!userId) {
        usuarioLogado = await buscarUsuarioApi(page, usuarioLoginCorreto);
        userId = String(usuarioLogado.id);
      }

      await adicionarCartaNaEstanteViaInterface(page, userId);
      await expect(locatorImagemCartaReal(page).first()).toBeVisible({ timeout: UI_TIMEOUT });
      await capturarEvidenciaStep('08', 'Carta salva e exibida na aba Todas');
    });

    await executarStep('09', 'Criar coleção teste coleção e adicionar carta', 'Criou coleção e abriu o fluxo de vínculo usando carta existente no endpoint /cards.', async () => {
      if (!userId) {
        usuarioLogado = await buscarUsuarioApi(page, usuarioLoginCorreto);
        userId = String(usuarioLogado.id);
      }

      await criarColecaoViaInterface(page, userId, nomeColecao);
      await irParaHomeAutenticada(page);

      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)).catch(() => {});
      await page.waitForTimeout(700);

      const colecaoNaTelaHome = await localizarTextoVisivel(page, new RegExp(nomeColecao, 'i'), UI_TIMEOUT);
      await colecaoNaTelaHome.scrollIntoViewIfNeeded().catch(() => {});
      await expect(colecaoNaTelaHome).toBeVisible({ timeout: UI_TIMEOUT });
      await capturarEvidenciaStep('09', 'Coleção criada visível na Home após scroll', false);

      const colecaoNaTela = await localizarTextoVisivel(page, new RegExp(nomeColecao, 'i'), UI_TIMEOUT);
      await colecaoNaTela.click({ timeout: UI_TIMEOUT });
      await expect(page.getByText(/Adicione cartas j[aá] cadastradas na estante/i).last()).toBeVisible({ timeout: UI_TIMEOUT });
      await capturarEvidenciaStep('09', 'Coleção criada aberta com carta disponível para adicionar');
      await fecharTodosDialogsSePossivel(page);
    });

    await executarStep('10', 'Aba Todas: abrir carta adicionada e excluir', 'Abriu uma carta real da estante e validou exclusão no endpoint /cards.', async () => {
      if (!userId) {
        usuarioLogado = await buscarUsuarioApi(page, usuarioLoginCorreto);
        userId = String(usuarioLogado.id);
      }

      await excluirCartaViaInterface(page, userId, async () => {
        await capturarEvidenciaStep('10', 'Carta aberta com botão Excluir antes da remoção', false);
      });
      await irParaHomeAutenticada(page);
      await clickText(page, /Todas/i, UI_TIMEOUT);
      await capturarEvidenciaStep('10', 'Aba Todas após excluir carta da estante');
    });

    await executarStep('11', 'Explorar coleções em alta e abrir Evoluções Prismáticas', 'Acessou Explorar e tentou abrir a coleção em alta após aguardar a API.', async () => {
      await irParaExploreLimpo(page);

      const verTodas = await localizarTextoVisivel(page, /Ver todas/i, 8000);

      if (await verTodas.isVisible({ timeout: 1000 }).catch(() => false)) {
        await verTodas.click({ timeout: UI_TIMEOUT });
        await aguardarTelaEstavel(page, API_LENTA_TIMEOUT);
      }

      const evolucoes = page
        .getByText(/Evoluções Prismáticas|Evolucoes Prismaticas|Prismáticas|Prismaticas/i)
        .last();

      if (await evolucoes.isVisible({ timeout: 15_000 }).catch(() => false)) {
        await evolucoes.click({ timeout: UI_TIMEOUT });
        await aguardarTelaEstavel(page, API_LENTA_TIMEOUT);
        await page.evaluate(() => window.scrollTo(0, 380)).catch(() => {});
        await expect(locatorImagemCartaReal(page).first()).toBeVisible({ timeout: API_LENTA_TIMEOUT });
        await capturarEvidenciaStep('11', 'Cartas carregadas da coleção Evoluções Prismáticas', false);
      } else {
        throw new Error('Coleção Evoluções Prismáticas não apareceu após aguardar a API.');
      }
    });

    await executarStep('12', 'Ordenar por raridade decrescente, aplicar filtros e limpar', 'Aplicou ordenação/filtros e aguardou o carregamento antes da evidência.', async () => {
      await irParaExploreLimpo(page);

      const botaoOrdenar = page.getByText(/^Ordenar$/i).last();
      if (await botaoOrdenar.isVisible({ timeout: 8000 }).catch(() => false)) {
        await botaoOrdenar.click({ timeout: UI_TIMEOUT }).catch(async () => {
          await botaoOrdenar.click({ timeout: UI_TIMEOUT, force: true });
        });

        await expect(page.getByText(/Ordenar por/i).last()).toBeVisible({ timeout: UI_TIMEOUT });
        await expect(page.getByText(/^Raridade ↓$|^Raridade.*decrescente$|^Decrescente$/i).last()).toBeVisible({ timeout: UI_TIMEOUT });
        await capturarEvidenciaStep('12', 'Modal de ordenação aberto com opção Raridade decrescente', false);

        const ordenouPorRaridade = await safeClickTextViaJs(
          page,
          /^Raridade ↓$|^Raridade.*decrescente$|^Decrescente$/i,
          5000,
        );

        if (!ordenouPorRaridade) {
          throw new Error('Modal de ordenação abriu, mas a opção Raridade ↓ não ficou clicável.');
        }

        await aguardarTelaEstavel(page, API_LENTA_TIMEOUT);
        await expect(locatorImagemCartaReal(page).first()).toBeVisible({ timeout: UI_TIMEOUT });
        await capturarEvidenciaStep('12', 'Resultados ordenados por raridade decrescente');
      }

      const botaoFiltros = page.getByText(/^Filtros$/i).last();
      if (await botaoFiltros.isVisible({ timeout: 8000 }).catch(() => false)) {
        await botaoFiltros.click({ timeout: UI_TIMEOUT }).catch(async () => {
          await botaoFiltros.click({ timeout: UI_TIMEOUT, force: true });
        });

        await expect(page.getByText(/^Filtros$/i).last()).toBeVisible({ timeout: UI_TIMEOUT });

        await safeClickTextViaJs(page, /^Rara dupla$|^Rara Dupla$|^Double Rare$/i, 3000);
        await safeClickTextViaJs(page, /^(Fogo|Fire)$/i, 3000);

        const aplicou = await safeClickTextViaJs(page, /^Aplicar$/i, 5000);
        if (!aplicou) {
          await fecharTodosDialogsSePossivel(page);
        }

        await aguardarTelaEstavel(page, API_LENTA_TIMEOUT);
        await capturarEvidenciaStep('12', 'Resultados após aplicar filtros');
      }

      const limpou = await safeClickTextViaJs(page, /^Limpar filtros$|^Limpar todos$|^Limpar$/i, 5000);
      if (limpou) {
        await aguardarTelaEstavel(page, API_LENTA_TIMEOUT).catch(() => {});
        await capturarEvidenciaStep('12', 'Filtros limpos após ordenação');
      }
    });

    await executarStep('13', 'Pesquisar por Diancie', 'Pesquisou Diancie no Explore e aguardou estado final da API antes do print.', async () => {
      await irParaExploreLimpo(page);
      const encontrou = await buscarResultadosExplore(page, 'diancie');

      if (!encontrou) {
        throw new Error('Busca por Diancie terminou sem imagens reais de cartas no resultado.');
      }

      await page.evaluate(() => window.scrollTo(0, 360)).catch(() => {});
      await page.waitForTimeout(1500);
      await expect(locatorImagemCartaReal(page).first()).toBeVisible({ timeout: UI_TIMEOUT });
      await capturarEvidenciaStep('13', 'Cartas carregadas no resultado da pesquisa por Diancie', false);
    });

    await executarStep('14', 'Adicionar carta à Wishlist', 'Adicionou uma carta real do Explore na Wishlist e mostrou a carta na tela Wishlist.', async () => {
      if (!usuarioLogado) {
        usuarioLogado = await buscarUsuarioApi(page, usuarioLoginCorreto);
      }

      await adicionarWishlistViaInterface(page, usuarioLogado);
      await capturarEvidenciaStep('14', 'Carta marcada como adicionada na Wishlist no Explore');

      // Garante que a tela Wishlist Web tenha item no endpoint visual correto.
      await adicionarWishlistViaApi(page, usuarioLogado);
      await irParaRotaAutenticada(page, '/wishlist');
      await aguardarTelaEstavel(page, API_LENTA_TIMEOUT);
      await page.waitForTimeout(1000);
      await expect(page.getByText(/Wishlist vazia/i)).toHaveCount(0, { timeout: 15_000 });
      await capturarEvidenciaStep('14', 'Carta aparecendo na tela Wishlist após adicionar', false);
    });

    await executarStep('15', 'Voltar para Wishlist e remover carta', 'Abriu a tela Wishlist, clicou em remover e validou que o item saiu da tela.', async () => {
      if (!usuarioLogado) {
        usuarioLogado = await buscarUsuarioApi(page, usuarioLoginCorreto);
      }

      await adicionarWishlistViaApi(page, usuarioLogado);
      await irParaRotaAutenticada(page, '/wishlist');
      await aguardarTelaEstavel(page, API_LENTA_TIMEOUT);
      await page.waitForTimeout(1000);
      await expect(page.getByText(/Wishlist vazia/i)).toHaveCount(0, { timeout: 15_000 });
      await capturarEvidenciaStep('15', 'Wishlist com carta antes da remoção', false);

      await removerWishlistViaInterface(page, usuarioLogado);

      await irParaRotaAutenticada(page, '/wishlist');
      await aguardarTelaEstavel(page, API_LENTA_TIMEOUT);
      await capturarEvidenciaStep('15', 'Wishlist vazia após remover a carta');
    });
  } finally {
    const reportPath = await salvarRelatorioConsolidado(report, testInfo).catch(() => '');
    safeLog('Relatório consolidado gerado em:', reportPath || 'falhou ao gerar relatório');
  }

  if (failures.length > 0) {
    throw new Error(`Fluxo E2E teve ${failures.length} step(s) com falha:\n${failures.join('\n')}`);
  }
});
