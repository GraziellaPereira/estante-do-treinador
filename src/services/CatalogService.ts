import BASE_URL from "../../apiService/api";
import type { Card, ExploreFilter } from "../types/explore";
import {
  CartaAtendeFiltros,
  FILTRO_TODOS,
  NormalizarCodigo,
  NormalizarTexto,
} from "../utils/BuscaUtils";
import TCGdex, { Query } from "@tcgdex/sdk";
import MemoryCache from "@cachex/memory";

type CatalogCardApi = Partial<Card> & {
  numero?: string;
  set?: string;
};

type TcgDexCard = import("@tcgdex/sdk").Card;

type SetInfo = {
  name: string;
  logo?: string;
  serie?: string;
  cardCount?: any;
  released_at?: string | null;
};
let tcgdexClient: TCGdex | null = null;

const setNameCache = new Map<string, string>();
const setInfoCache = new Map<string, SetInfo>();
const cardDetailCache = new Map<string, Card>();

const LIMITE_COLECOES_RECENTES = 15;
const QUALIDADE_CARTA_LISTA = "low";

const SETS_ANTIGOS_PARA_BUSCA = [
  "base1", // Base Set
  "base2", // Jungle
  "base3", // Fossil
  "base4", // Base Set 2
  "base5", // Team Rocket
  "gym1",
  "gym2",
  "neo1",
  "neo2",
  "neo3",
  "neo4",
  "ecard1",
  "ecard2",
  "ecard3",
];

const TCGDEX_REST_BASE = "https://api.tcgdex.net/v2";
const TCGDEX_REST_IDIOMAS = ["pt", "en"] as const;

const SETS_VINTAGE_PARA_BUSCA = [
  { id: "base1", name: "Base Set", total: 102 },
  { id: "base2", name: "Jungle", total: 64 },
  { id: "base3", name: "Fossil", total: 62 },
  { id: "base4", name: "Base Set 2", total: 130 },
  { id: "base5", name: "Team Rocket", total: 83 },
  { id: "gym1", name: "Gym Heroes", total: 132 },
  { id: "gym2", name: "Gym Challenge", total: 132 },
  { id: "neo1", name: "Neo Genesis", total: 111 },
  { id: "neo2", name: "Neo Discovery", total: 75 },
  { id: "neo3", name: "Neo Revelation", total: 66 },
  { id: "neo4", name: "Neo Destiny", total: 113 },
  { id: "base6", name: "Legendary Collection", total: 110 },
];

let colecoesRecentesIdsCache = new Set<string>();

function LimparTexto(valor: unknown) {
  return String(valor || "").trim();
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("timeout")), ms),
  );

  return Promise.race([promise, timeout]);
}

function criarStorageFallback() {
  const data = new Map<string, string>();

  return {
    getItem(key: string) {
      return data.has(key) ? data.get(key) ?? null : null;
    },
    setItem(key: string, value: string) {
      data.set(key, value);
    },
    removeItem(key: string) {
      data.delete(key);
    },
    clear() {
      data.clear();
    },
    key(index: number) {
      return Array.from(data.keys())[index] ?? null;
    },
    get length() {
      return data.size;
    },
  };
}

function getTcgDexClient(): TCGdex | null {
  if (tcgdexClient) {
    return tcgdexClient;
  }

  try {
    if (typeof window !== "undefined") {
      const win = window as any;

      if (!win.localStorage) {
        win.localStorage = criarStorageFallback();
      }

      if (!win.sessionStorage) {
        win.sessionStorage = criarStorageFallback();
      }
    }

    const cliente = new TCGdex("pt");
    cliente.setEndpoint("https://api.tcgdex.net/v2");
    cliente.setCache(new MemoryCache());

    tcgdexClient = cliente;
    return cliente;
  } catch {
    return null;
  }
}

function EhSetIdPocket(setId: string) {
  const id = LimparTexto(setId).toLowerCase();

  return (
    id.startsWith("tcgp") ||
    id.startsWith("pocket") ||
    /^[ab]\d[a-z]?$/i.test(id) ||
    id === "promo-a" ||
    id === "p-a"
  );
}

function EhSetIdFisico(setId: string) {
  const id = LimparTexto(setId).toLowerCase();

  if (!id) {
    return false;
  }

  return !EhSetIdPocket(id);
}

function ObterSerieId(set: any) {
  return LimparTexto(set?.serie?.id || set?.serieId || set?.series?.id || set?.serie).toLowerCase();
}

function EhColecaoPocket(set: any) {
  const id = LimparTexto(set?.id).toLowerCase();
  const serieId = ObterSerieId(set);

  const texto = NormalizarTexto(
    `${set?.name || ""} ${set?.title || ""} ${set?.serie?.name || ""} ${set?.series?.name || ""}`,
  );

  return (
    serieId === "tcgp" ||
    EhSetIdPocket(id) ||
    texto.includes("pocket") ||
    texto.includes("paldean wonders")
  );
}

function EhColecaoBlackStarPromo(set: any) {
  const id = LimparTexto(set?.id).toLowerCase();

  const nome = NormalizarTexto(
    `${set?.name || ""} ${set?.title || ""} ${set?.serie?.name || ""} ${set?.series?.name || ""}`,
  );

  return (
    nome.includes("black star") ||
    nome.includes("black star promos") ||
    id === "svp" ||
    id === "swshp" ||
    id === "smp" ||
    id === "xyp" ||
    id === "bwp" ||
    id === "dpp" ||
    id === "hsp" ||
    id === "np" ||
    id === "wotc"
  );
}

function EhColecaoMegaEvolucaoEnergia(set: any) {
  const id = LimparTexto(set?.id).toLowerCase();

  const nome = NormalizarTexto(
    `${set?.name || ""} ${set?.title || ""} ${set?.serie?.name || ""} ${set?.series?.name || ""}`,
  );

  return (
    id === "mee" ||
    nome.includes("mega evolution energy") ||
    nome.includes("megaevolucao energia") ||
    nome.includes("mega evolução energia")
  );
}

function EhColecaoFisicaParaFiltro(set: any) {
  const id = LimparTexto(set?.id);

  if (
    !id ||
    EhColecaoPocket(set) ||
    EhColecaoBlackStarPromo(set) ||
    EhColecaoMegaEvolucaoEnergia(set)
  ) {
    return false;
  }

  return EhSetIdFisico(id);
}

function EhCartaTcgFisica(rawOuCard: any) {
  const setId = ObterSetIdDaCarta(rawOuCard) || LimparTexto(rawOuCard?.setId);
  return EhSetIdFisico(setId);
}

function NormalizarAssetTcgDex(url?: string, tipo: "card" | "set" = "set") {
  const asset = LimparTexto(url).replace(/\/$/, "");

  if (!asset) {
    return undefined;
  }

  if (/\.(png|jpg|jpeg|webp)$/i.test(asset)) {
    return asset;
  }

  if (tipo === "card") {
    return `${asset}/${QUALIDADE_CARTA_LISTA}.png`;
  }

  return `${asset}.png`;
}

function ObterLogoColecao(set: any) {
  return NormalizarAssetTcgDex(
    set?.logo ||
      set?.images?.logo ||
      set?.assets?.logo ||
      set?.symbol ||
      set?.image,
    "set",
  );
}

function ObterDataColecao(set: any) {
  return (
    LimparTexto(set?.releaseDate) ||
    LimparTexto(set?.released_at) ||
    LimparTexto(set?.release_date) ||
    LimparTexto(set?.date) ||
    null
  );
}

function ObterSetIdDaCarta(raw: any) {
  const setIdDireto = LimparTexto(raw?.setId || raw?.set?.id);

  if (setIdDireto) {
    return setIdDireto;
  }

  const cardId = LimparTexto(raw?.id);

  if (!cardId || !cardId.includes("-")) {
    return "";
  }

  const partes = cardId.split("-");
  partes.pop();

  return partes.join("-");
}

async function BuscarInfoSetPorId(cliente: TCGdex, setId: string): Promise<SetInfo | undefined> {
  const id = LimparTexto(setId);

  if (!id) {
    return undefined;
  }

  const cached = setInfoCache.get(id);

  if (cached?.name && cached?.serie) {
    return cached;
  }

  try {
    const setObj = await withTimeout(cliente.fetch("sets", id) as Promise<any>, 3500);

    const info: SetInfo = {
  name: LimparTexto(setObj?.name || id),
  logo: ObterLogoColecao(setObj),
  serie: LimparTexto(setObj?.serie?.name || setObj?.serie || ""),
  cardCount: setObj?.cardCount,
  released_at: ObterDataColecao(setObj),
};

    setInfoCache.set(id, info);
    setNameCache.set(id, info.name);

    return info;
  } catch {
    return cached;
  }
}

function AplicarInfoSetNaCarta(raw: any, setId: string, info?: SetInfo) {
  return {
    ...raw,
    set: {
      ...(raw?.set || {}),
      id: raw?.set?.id || setId,
      name: raw?.set?.name || info?.name || setId,
      serie: raw?.set?.serie || {
        name: info?.serie || "",
      },
      cardCount: raw?.set?.cardCount || info?.cardCount,
    },
  };
}

function ExtrairTextoCampo(valor: any): string {
  if (valor === undefined || valor === null) {
    return "";
  }

  if (typeof valor === "string" || typeof valor === "number") {
    return LimparTexto(valor);
  }

  if (typeof valor === "object") {
    return LimparTexto(valor.name || valor.nome || valor.label || valor.title || valor.id || "");
  }

  return "";
}

function ExtrairPrimeiroTexto(valor: any): string {
  if (Array.isArray(valor)) {
    const primeiroValido = valor
      .map((item) => ExtrairTextoCampo(item))
      .find((item) => item.length > 0);

    return primeiroValido || "";
  }

  return ExtrairTextoCampo(valor);
}

function ExtrairTipoCarta(raw: any): string {
  return (
    ExtrairPrimeiroTexto(raw?.types) ||
    ExtrairPrimeiroTexto(raw?.type) ||
    ExtrairPrimeiroTexto(raw?.energyType) ||
    ExtrairPrimeiroTexto(raw?.weaknesses) ||
    ExtrairPrimeiroTexto(raw?.category) ||
    ExtrairPrimeiroTexto(raw?.supertype) ||
    "Carta"
  );
}

function ExtrairRaridadeCarta(raw: any): string {
  return ExtrairTextoCampo(raw?.rarity) || "Sem raridade";
}

function FiltrarColecoesRecentes(cards: Card[]) {
  return cards.filter((card) => {
    const setId = LimparTexto(card.setId);

    if (!EhSetIdFisico(setId)) {
      return false;
    }

    if (colecoesRecentesIdsCache.size === 0) {
      return true;
    }

    return colecoesRecentesIdsCache.has(setId);
  });
}

function ObterRankRaridade(raridade?: string) {
  const r = NormalizarTexto(raridade || "");

  if (!r || r.includes("sem raridade")) {
    return 0;
  }

  /**
   * Ordem oficial desejada:
   * 10 - Comum
   * 20 - Incomum
   * 30 - Rara
   * 40 - Rara Dupla
   * 50 - Rara ACE SPEC
   * 60 - Rara Ultra
   * 70 - Ilustração Rara
   * 80 - Ilustração Rara Especial
   * 90 - Rara Hiper / Dourada
   */

  // Rara Hiper / Dourada
  if (
    r.includes("hyper rare") ||
    r.includes("rara hiper") ||
    r.includes("hiper") ||
    r.includes("gold") ||
    r.includes("dourada") ||
    r.includes("dourado") ||
    r.includes("secret rare") ||
    r.includes("rara secreta") ||
    r.includes("secreta")
  ) {
    return 90;
  }

  // Ilustração Rara Especial
  if (
    r.includes("special illustration rare") ||
    r.includes("special illustration") ||
    r.includes("ilustracao rara especial") ||
    r.includes("ilustração rara especial") ||
    r.includes("ilustracao especial") ||
    r.includes("ilustração especial")
  ) {
    return 80;
  }

  // Ilustração Rara
  // Importante: vem depois de "Special Illustration", senão a especial cairia aqui.
  if (
    r.includes("illustration rare") ||
    r.includes("illustration") ||
    r.includes("ilustracao rara") ||
    r.includes("ilustração rara") ||
    r.includes("ilustracao") ||
    r.includes("ilustração")
  ) {
    return 70;
  }

  // Rara Ultra
  if (
    r.includes("ultra rare") ||
    r.includes("rara ultra") ||
    r.includes("ultra")
  ) {
    return 60;
  }

  // Rara ACE SPEC
  if (
    r.includes("ace spec") ||
    r.includes("acespec") ||
    r.includes("ace")
  ) {
    return 50;
  }

  // Rara Dupla
  if (
    r.includes("double rare") ||
    r.includes("rara dupla") ||
    r.includes("dupla")
  ) {
    return 40;
  }

  // Rara
  // Inclui rare holo, rare holo ex, rare holo v, rare holo gx etc.
  // Mas precisa vir depois das raridades acima.
  if (
    r.includes("rare") ||
    r.includes("rara") ||
    r.includes("holo")
  ) {
    return 30;
  }

  // Incomum
  // Importante: vem antes de Common, porque "uncommon" contém "common".
  if (
    r.includes("uncommon") ||
    r.includes("incomum")
  ) {
    return 20;
  }

  // Comum
  if (
    r.includes("common") ||
    r.includes("comum")
  ) {
    return 10;
  }

  return 0;
}

async function GarantirColecoesRecentesCarregadas() {
  if (colecoesRecentesIdsCache.size > 0) {
    return;
  }

  await ListarColecoes();
}

function MapearCarta(item: CatalogCardApi): Card | null {
  const id = LimparTexto(item.id);
  const nome = LimparTexto(item.nome);
  const codigo = LimparTexto(item.codigo || item.numero);
  

  if (!id || !nome || !codigo) {
    return null;
  }

  return {
    id,
    nome,
    codigo,
    colecao: LimparTexto(item.colecao || item.set || "Sem coleção"),
    setId: LimparTexto(item.set || (item as any).setId),
    pokemon: LimparTexto(item.pokemon || nome.split(" ")[0] || "Desconhecido"),
    tipo: LimparTexto(item.tipo || item.raridade || "Carta"),
    imageUrl: LimparTexto(item.imageUrl),
    raridade: item.raridade,
    
    serie: LimparTexto((item as any).serie),
    artista: LimparTexto((item as any).artista || (item as any).artist || (item as any).illustrator),
    hp: LimparTexto((item as any).hp),
    categoria: LimparTexto((item as any).categoria || (item as any).category),
    estagio: LimparTexto((item as any).estagio || (item as any).stage),
    regulacao: LimparTexto((item as any).regulacao || (item as any).regulationMark),
  } as Card;
}

function MapearCartaDoTcgDex(card: TcgDexCard): Card {
  const raw = card as any;
  const setId = ObterSetIdDaCarta(raw);
  const cachedSet = setInfoCache.get(setId);

  const imageUrl = NormalizarAssetTcgDex(raw?.image, "card") || "";

  const localId = LimparTexto(raw?.localId);
  const setTotal = raw?.set?.cardCount?.official || raw?.set?.cardCount?.total || cachedSet?.cardCount?.official || cachedSet?.cardCount?.total || "";
  const codigoCompleto = setTotal ? `${localId}/${setTotal}` : localId || LimparTexto(raw?.id);

  const tipoPrincipal = ExtrairTipoCarta(raw);
  const raridade = ExtrairRaridadeCarta(raw);

  const setName = LimparTexto(raw?.set?.name || cachedSet?.name || raw?.set?.id || setId || "Sem coleção");
  const serieName = LimparTexto(raw?.set?.serie?.name || cachedSet?.serie || raw?.set?.serie?.id || "");

  const setLogoUrl =
  ObterLogoColecao(raw?.set) ||
  cachedSet?.logo ||
  "";

const totalSetCards = Number(
  raw?.set?.cardCount?.official ||
    raw?.set?.cardCount?.total ||
    cachedSet?.cardCount?.official ||
    cachedSet?.cardCount?.total ||
    0,
);

  const dataLancamento =
  ObterDataColecao(raw.set) ||
  raw.set?.releaseDate ||
  raw.set?.released_at ||
  cachedSet?.released_at ||
  null;

  return {
    id: LimparTexto(raw?.id),
    nome: LimparTexto(raw?.name),
    codigo: codigoCompleto,
    colecao: setName,
    setId,
    pokemon: LimparTexto(raw?.name?.split(" ")?.[0] || "Desconhecido"),
    tipo: tipoPrincipal,
    serie: serieName,
    imageUrl,
    raridade,
    artista: ExtrairTextoCampo(raw?.illustrator || raw?.artist),
    hp: ExtrairTextoCampo(raw?.hp),
    categoria: ExtrairTextoCampo(raw?.category),
    estagio: ExtrairTextoCampo(raw?.stage),
    regulacao: ExtrairTextoCampo(raw?.regulationMark),
    dataLancamento,
    raridadeRank: ObterRankRaridade(raridade),
    setLogoUrl,
totalSetCards,
  } as Card;
}

async function BuscarDetalheBrutoCarta(cliente: TCGdex, raw: any) {
  const cardId = LimparTexto(raw?.id);

  if (!cardId) {
    return raw;
  }

  try {
    const detalhe = await withTimeout(cliente.fetch("cards", cardId) as Promise<any>, 4000);
    return detalhe || raw;
  } catch {
    return raw;
  }
}

async function MapearResultadoBuscaTcgDex(cliente: TCGdex, raw: any): Promise<Card> {
  const detalhe = await BuscarDetalheBrutoCarta(cliente, raw);

  const setId = ObterSetIdDaCarta(detalhe) || ObterSetIdDaCarta(raw);
  const infoSet = setId ? await BuscarInfoSetPorId(cliente, setId) : undefined;

  const sourceComSet = AplicarInfoSetNaCarta(detalhe || raw, setId, infoSet);

  const cardMapped = MapearCartaDoTcgDex(sourceComSet as unknown as TcgDexCard);

  return {
    ...cardMapped,
    setId,
    colecao: LimparTexto(infoSet?.name || cardMapped.colecao || setId || "Sem coleção"),
    serie: LimparTexto(infoSet?.serie || cardMapped.serie || ""),
    dataLancamento: infoSet?.released_at || cardMapped.dataLancamento || null,
    raridadeRank: ObterRankRaridade(cardMapped.raridade),
  };
}

function CodigoDaCartaConfere(card: Card, codigoNumero: string, codigoTotal: string) {
  const codigo = NormalizarCodigo(card.codigo);
  const [local, total] = codigo.split("/");

  const localDigits = NormalizarNumeroCodigo(local || "");
  const totalDigits = NormalizarNumeroCodigo(total || "");

  const numeroOk =
    localDigits === NormalizarNumeroCodigo(codigoNumero);

  const totalOk = codigoTotal
    ? totalDigits === NormalizarNumeroCodigo(codigoTotal)
    : true;

  return numeroOk && totalOk;
}

async function BuscarTcgDexRest(path: string): Promise<any | null> {
  for (const idioma of TCGDEX_REST_IDIOMAS) {
    try {
      const resposta = await withTimeout(
        fetch(`${TCGDEX_REST_BASE}/${idioma}/${path.replace(/^\/+/, "")}`),
        5000,
      );

      if (!resposta.ok) {
        continue;
      }

      const json = await resposta.json();

      if (json) {
        return json;
      }
    } catch {
      // tenta o próximo idioma
    }
  }

  return null;
}

async function ListarColecoesRest(): Promise<
  Array<{ id: string; name: string; logo?: string; released_at?: string | null; seq?: number }>
> {
  const sets = await BuscarTcgDexRest("sets");

  if (!Array.isArray(sets)) {
    return [];
  }

  const mapped = sets
    .filter((set: any) => EhColecaoFisicaParaFiltro(set))
    .map((set: any, idx: number) => ({
      id: LimparTexto(set?.id),
      name: LimparTexto(set?.name || set?.title),
      logo: ObterLogoColecao(set),
      released_at: ObterDataColecao(set),
      seq: idx,
    }))
    .filter((set: any) => set.id && set.name)
    .sort((a: any, b: any) => {
      const dataA = a.released_at ? Date.parse(String(a.released_at)) : 0;
      const dataB = b.released_at ? Date.parse(String(b.released_at)) : 0;

      if (dataB !== dataA) {
        return dataB - dataA;
      }

      return Number(b.seq || 0) - Number(a.seq || 0);
    })
    .slice(0, LIMITE_COLECOES_RECENTES);

  colecoesRecentesIdsCache = new Set(mapped.map((set) => set.id));

  for (const set of mapped) {
    const cached = setInfoCache.get(set.id);
    setInfoCache.set(set.id, {
      name: set.name || cached?.name || set.id,
      logo: set.logo || cached?.logo,
      serie: cached?.serie || "",
      cardCount: cached?.cardCount,
    });
    setNameCache.set(set.id, set.name);
  }

  return mapped;
}

async function BuscarCartasPorColecaoRest(setId: string): Promise<Card[]> {
  const setIdLimpo = LimparTexto(setId);

  if (!setIdLimpo) {
    return [];
  }

  const setObj = await BuscarTcgDexRest(`sets/${setIdLimpo}`);

  if (!setObj || !EhColecaoFisicaParaFiltro(setObj)) {
    return [];
  }

  const setName = LimparTexto(setObj?.name || setIdLimpo);
  const serieName = LimparTexto(setObj?.serie?.name || setObj?.serie);
  const logo = ObterLogoColecao(setObj);

  const setInfo: SetInfo = {
    name: setName,
    logo,
    serie: serieName,
    cardCount: setObj?.cardCount,
    released_at: ObterDataColecao(setObj),
  };

  setInfoCache.set(setIdLimpo, setInfo);
  setNameCache.set(setIdLimpo, setName);

  const cardsResumo = Array.isArray(setObj?.cards) ? setObj.cards : [];

  return cardsResumo
    .map((item: any) => {
      const card = MapearCartaDoTcgDex(
        AplicarInfoSetNaCarta(item, setIdLimpo, setInfo) as unknown as TcgDexCard,
      );

      return {
        ...card,
        setId: setIdLimpo,
        colecao: setName,
        serie: serieName,
      };
    })
    .filter((card: Card) => card.id && card.nome && card.codigo);
}

async function ListarCatalogoTcgDexRest(): Promise<Card[]> {
  const sets = await ListarColecoesRest();

  if (sets.length === 0) {
    return [];
  }

  const grupos = await Promise.all(
    sets.slice(0, 6).map((set) =>
      BuscarCartasPorColecaoRest(set.id).catch(() => []),
    ),
  );

  return grupos.flat();
}

function NormalizarNumeroVintage(valor: string | number | undefined | null) {
  const digitos = String(valor || "").replace(/\D/g, "");
  const semZeros = digitos.replace(/^0+/, "");

  return semZeros || digitos;
}

function ObterLocalIdVintage(raw: any) {
  const direto =
    LimparTexto(raw?.localId) ||
    LimparTexto(raw?.localID) ||
    LimparTexto(raw?.number);

  if (direto) {
    return direto;
  }

  const id = LimparTexto(raw?.id);

  if (!id.includes("-")) {
    return "";
  }

  return id.split("-").pop() || "";
}

function MontarCodigoVintage(localId: string, total?: number | string) {
  const local = NormalizarNumeroVintage(localId);

  if (!local) {
    return "";
  }

  if (!total) {
    return local;
  }

  return `${local}/${total}`;
}

function CardJaExiste(lista: Card[], cardId: string) {
  return lista.some((card) => String(card.id) === String(cardId));
}

function AplicarSetVintageNaCarta(raw: any, setObj: any, setFallback: { id: string; name: string; total: number }) {
  return {
    ...raw,
    set: {
      ...(raw?.set || {}),
      id: raw?.set?.id || setFallback.id,
      name: raw?.set?.name || setObj?.name || setFallback.name,
      serie: raw?.set?.serie || setObj?.serie || {
        name: "Wizards of the Coast",
      },
      cardCount: raw?.set?.cardCount || setObj?.cardCount || {
        total: setFallback.total,
      },
      releaseDate:
        raw?.set?.releaseDate ||
        setObj?.releaseDate ||
        setObj?.released_at ||
        null,
      released_at:
        raw?.set?.released_at ||
        setObj?.released_at ||
        setObj?.releaseDate ||
        null,
    },
  };
}

async function BuscarCartasVintageDireto(
  filtros: ExploreFilter,
  existentes: Card[],
): Promise<Card[]> {
  const consulta = LimparTexto(filtros.query);

  if (!consulta) {
    return [];
  }

  const codigoMatch = consulta.match(/(\d{1,4})\s*\/\s*(\d{1,4})/);
  const codigoNumero = codigoMatch ? String(codigoMatch[1]) : "";
  const codigoTotal = codigoMatch ? String(codigoMatch[2]) : "";

  const nomeQuery = codigoMatch
    ? consulta.replace(codigoMatch[0], "").trim()
    : consulta;

  const nomeNormalizado = NormalizarTexto(nomeQuery);
  const encontrados: Card[] = [];

  for (const setFallback of SETS_VINTAGE_PARA_BUSCA) {
    try {
      const totalSet = String(setFallback.total);

      if (codigoTotal && NormalizarNumeroVintage(codigoTotal) !== NormalizarNumeroVintage(totalSet)) {
        continue;
      }

      const setObj = await BuscarTcgDexRest(`sets/${setFallback.id}`);

      if (!setObj) {
        continue;
      }

      /**
       * Caso 1:
       * Busca por código, exemplo 60/64.
       * Tenta direto o card conhecido: base2-60.
       */
      if (codigoNumero) {
        const idDireto = `${setFallback.id}-${NormalizarNumeroVintage(codigoNumero)}`;
        const detalheDireto = await BuscarTcgDexRest(`cards/${idDireto}`);

        if (detalheDireto) {
          const detalheComSet = AplicarSetVintageNaCarta(detalheDireto, setObj, setFallback);
          const cardMapped = MapearCartaDoTcgDex(detalheComSet as unknown as TcgDexCard);

          const nomeOk = nomeNormalizado
            ? NormalizarTexto(cardMapped.nome).includes(nomeNormalizado)
            : true;

          const codigoOk = CodigoDaCartaConfere(cardMapped, codigoNumero, codigoTotal);

          if (
            nomeOk &&
            codigoOk &&
            !CardJaExiste(existentes, cardMapped.id) &&
            !CardJaExiste(encontrados, cardMapped.id)
          ) {
            encontrados.push({
              ...cardMapped,
              colecao: cardMapped.colecao || setFallback.name,
              setId: cardMapped.setId || setFallback.id,
              codigo: cardMapped.codigo || MontarCodigoVintage(codigoNumero, setFallback.total),
              tipo: cardMapped.tipo || "Carta",
              raridade: cardMapped.raridade || "Sem raridade",
              raridadeRank: cardMapped.raridadeRank || ObterRankRaridade(cardMapped.raridade),
            });
          }
        }
      }

      /**
       * Caso 2:
       * Busca por nome, exemplo Pikachu.
       * Varre os cards resumidos do set antigo.
       */
      const cardsResumo = Array.isArray(setObj?.cards) ? setObj.cards : [];

      for (const raw of cardsResumo) {
        const nomeCarta = NormalizarTexto(raw?.name || "");

        if (nomeNormalizado && !nomeCarta.includes(nomeNormalizado)) {
          continue;
        }

        const localId = ObterLocalIdVintage(raw);

        if (codigoNumero && NormalizarNumeroVintage(localId) !== NormalizarNumeroVintage(codigoNumero)) {
          continue;
        }

        const cardId = LimparTexto(raw?.id) || `${setFallback.id}-${NormalizarNumeroVintage(localId)}`;

        if (!cardId) {
          continue;
        }

        let detalhe = await BuscarTcgDexRest(`cards/${cardId}`);

        if (!detalhe && localId) {
          detalhe = await BuscarTcgDexRest(
            `cards/${setFallback.id}-${NormalizarNumeroVintage(localId)}`,
          );
        }

        const source = detalhe || raw;
        const sourceComSet = AplicarSetVintageNaCarta(source, setObj, setFallback);
        const cardMapped = MapearCartaDoTcgDex(sourceComSet as unknown as TcgDexCard);

        if (codigoNumero && !CodigoDaCartaConfere(cardMapped, codigoNumero, codigoTotal)) {
          continue;
        }

        const filtrosBusca: ExploreFilter = {
          ...filtros,
          query: "",
          colecao: FILTRO_TODOS,
          tipo: FILTRO_TODOS,
        };

        if (!CartaAtendeFiltros(cardMapped, filtrosBusca)) {
          continue;
        }

        if (CardJaExiste(existentes, cardMapped.id) || CardJaExiste(encontrados, cardMapped.id)) {
          continue;
        }

        encontrados.push({
          ...cardMapped,
          colecao: cardMapped.colecao || setFallback.name,
          setId: cardMapped.setId || setFallback.id,
          codigo: cardMapped.codigo || MontarCodigoVintage(localId, setFallback.total),
          tipo: cardMapped.tipo || "Carta",
          raridade: cardMapped.raridade || "Sem raridade",
          raridadeRank: cardMapped.raridadeRank || ObterRankRaridade(cardMapped.raridade),
        });

        if (encontrados.length >= 80) {
          return encontrados;
        }
      }
    } catch {
      // segue para o próximo set vintage
    }
  }

  return encontrados;
}

async function BuscarCartasEmSetsAntigos(
  cliente: TCGdex,
  filtros: ExploreFilter,
  existentes: Card[],
): Promise<Card[]> {
  const consulta = LimparTexto(filtros.query);

  if (!consulta) {
    return [];
  }

  const codigoMatch = consulta.match(/(\d{1,4})\s*\/\s*(\d{1,4})/);
  const codigoToken = codigoMatch ? `${codigoMatch[1]}/${codigoMatch[2]}` : "";
  const codigoNumero = codigoMatch ? String(codigoMatch[1]) : "";
  const codigoTotal = codigoMatch ? String(codigoMatch[2]) : "";

  const nomeQuery = codigoToken
    ? consulta.replace(codigoMatch![0], "").trim()
    : consulta;

  const nomeNormalizado = NormalizarTexto(nomeQuery);
  const encontrados: Card[] = [];

  for (const setId of SETS_ANTIGOS_PARA_BUSCA) {
    try {
      const setObj = await withTimeout(cliente.fetch("sets", setId) as Promise<any>, 4500);
      const cards = Array.isArray(setObj?.cards) ? setObj.cards : [];

      for (const raw of cards) {
        const rawComSet = {
          ...raw,
          set: {
            ...(raw?.set || {}),
            id: setId,
            name: setObj?.name || setId,
            serie: setObj?.serie,
            cardCount: setObj?.cardCount,
            releaseDate: setObj?.releaseDate,
            released_at: setObj?.released_at,
          },
        };

        const nomeCarta = NormalizarTexto(rawComSet?.name || "");

        if (nomeNormalizado && !nomeCarta.includes(nomeNormalizado)) {
          continue;
        }

        if (codigoNumero) {
          const localRaw = NormalizarNumeroCodigo(ObterLocalIdRaw(rawComSet));

          if (localRaw !== NormalizarNumeroCodigo(codigoNumero)) {
            continue;
          }
        }

        const cardMapped = await MapearResultadoBuscaTcgDex(cliente, rawComSet);

        if (CartaJaExiste(existentes, cardMapped.id) || CartaJaExiste(encontrados, cardMapped.id)) {
          continue;
        }

        if (codigoToken && !CodigoDaCartaConfere(cardMapped, codigoNumero, codigoTotal)) {
          continue;
        }

        const filtrosBusca: ExploreFilter = {
          ...filtros,
          query: "",
          colecao: FILTRO_TODOS,
          tipo: FILTRO_TODOS,
        };

        if (!CartaAtendeFiltros(cardMapped, filtrosBusca)) {
          continue;
        }

        encontrados.push(cardMapped);

        if (encontrados.length >= 80) {
          return encontrados;
        }
      }
    } catch {
      // Ignora set antigo indisponível e continua nos próximos.
    }
  }

  return encontrados;
}

function NormalizarNumeroCodigo(valor: string) {
  const apenasDigitos = String(valor || "").replace(/\D/g, "");
  const semZeros = apenasDigitos.replace(/^0+/, "");

  return semZeros || apenasDigitos;
}

function ObterLocalIdRaw(raw: any) {
  const direto =
    LimparTexto(raw?.localId) ||
    LimparTexto(raw?.localID) ||
    LimparTexto(raw?.number);

  if (direto) {
    return direto;
  }

  const id = LimparTexto(raw?.id);

  if (!id || !id.includes("-")) {
    return "";
  }

  return id.split("-").pop() || "";
}

function CartaJaExiste(lista: Card[], cardId: string) {
  return lista.some((card) => String(card.id) === String(cardId));
}

async function MapearResultadoTcgDexComSet(cliente: TCGdex, raw: any): Promise<Card | null> {
  const setId = ObterSetIdDaCarta(raw);

  if (!setId || !EhSetIdFisico(setId)) {
    return null;
  }

  const infoSet = await BuscarInfoSetPorId(cliente, setId);
  const rawComSet = AplicarInfoSetNaCarta(raw, setId, infoSet);
  const cardMapped = MapearCartaDoTcgDex(rawComSet as unknown as TcgDexCard);

  cardMapped.colecao = LimparTexto(infoSet?.name || cardMapped.colecao || setId || "Sem coleção");
  cardMapped.serie = LimparTexto(infoSet?.serie || cardMapped.serie || "");
  cardMapped.setId = setId;

  return cardMapped;
}

async function BuscarCardCompletoSePossivel(cliente: TCGdex, resumo: any): Promise<any> {
  const id = LimparTexto(resumo?.id);

  if (!id) {
    return resumo;
  }

  if (typeof resumo?.getCard === "function") {
    try {
      return await withTimeout(resumo.getCard() as Promise<any>, 3500);
    } catch {
      // usa fallback abaixo
    }
  }

  try {
    const completo = await withTimeout(cliente.fetch("cards", id) as Promise<any>, 3500);
    return completo || resumo;
  } catch {
    return resumo;
  }
}

export async function BuscarDetalheCartaTcgDex(card: Card): Promise<Card> {
  const cardId = LimparTexto(card.id);

  if (!cardId) {
    return card;
  }

  const cached = cardDetailCache.get(cardId);

  if (cached) {
    return cached;
  }

  const cliente = getTcgDexClient();

  if (!cliente) {
    return card;
  }

  try {
    const detalhe = await withTimeout(cliente.fetch("cards", cardId) as Promise<any>, 5000);

    if (!detalhe) {
      return card;
    }

    const setId = ObterSetIdDaCarta(detalhe) || card.setId || "";
    const infoSet = setId ? await BuscarInfoSetPorId(cliente, setId) : undefined;
    const detalheComSet = AplicarInfoSetNaCarta(detalhe, setId, {
      name: infoSet?.name || card.colecao,
      logo: infoSet?.logo,
      serie: infoSet?.serie || card.serie,
      cardCount: infoSet?.cardCount,
    });

    const cardDetalhada = MapearCartaDoTcgDex(detalheComSet as unknown as TcgDexCard);

    const resultado: Card = {
  ...card,
  ...cardDetalhada,

  // No modal usa imagem em alta qualidade.
  imageUrl: detalhe?.image
    ? `${LimparTexto(detalhe.image).replace(/\/$/, "")}/high.png`
    : card.imageUrl,

  // Garante que o set não volte para "bw1", "xy6", "swsh12" etc.
  setId: cardDetalhada.setId || card.setId,
  colecao: infoSet?.name || cardDetalhada.colecao || card.colecao,
  serie: infoSet?.serie || cardDetalhada.serie || card.serie,

  // Campos usados na ordenação e nos filtros.
  dataLancamento:
    infoSet?.released_at ||
    cardDetalhada.dataLancamento ||
    card.dataLancamento ||
    null,

  raridadeRank: ObterRankRaridade(cardDetalhada.raridade || card.raridade),

  setLogoUrl:
  infoSet?.logo ||
  cardDetalhada.setLogoUrl ||
  (card as any).setLogoUrl ||
  "",

totalSetCards:
  Number(
    infoSet?.cardCount?.official ||
      infoSet?.cardCount?.total ||
      (cardDetalhada as any).totalSetCards ||
      (card as any).totalSetCards ||
      0,
  ),
};

    cardDetailCache.set(cardId, resultado);

    return resultado;
  } catch {
    return card;
  }
}

export async function ListarColecoes(): Promise<
  Array<{ id: string; name: string; logo?: string; released_at?: string | null; seq?: number }>
> {
  const cliente = getTcgDexClient();

  if (!cliente) {
    return await ListarColecoesRest();
  }

  try {
    const sets = await withTimeout(cliente.fetch("sets") as Promise<any>, 5000);

    if (!Array.isArray(sets)) {
      return [];
    }

    const mapped = sets
      .filter((set: any) => EhColecaoFisicaParaFiltro(set))
      .map((set: any, idx: number) => ({
        id: LimparTexto(set?.id),
        name: LimparTexto(set?.name || set?.title),
        logo: ObterLogoColecao(set),
        released_at: ObterDataColecao(set),
        seq: idx,
      }))
      .filter((set: any) => set.id && set.name)
      .sort((a: any, b: any) => {
        const dataA = a.released_at ? Date.parse(String(a.released_at)) : 0;
        const dataB = b.released_at ? Date.parse(String(b.released_at)) : 0;

        const dataValidaA = Number.isFinite(dataA) ? dataA : 0;
        const dataValidaB = Number.isFinite(dataB) ? dataB : 0;

        if (dataValidaA !== dataValidaB) {
          return dataValidaB - dataValidaA;
        }

        return Number(b.seq || 0) - Number(a.seq || 0);
      })
      .slice(0, LIMITE_COLECOES_RECENTES);

    colecoesRecentesIdsCache = new Set(mapped.map((set) => set.id));

    for (const set of mapped) {
      const cached = setInfoCache.get(set.id);
      setInfoCache.set(set.id, {
        name: set.name || cached?.name || set.id,
        logo: set.logo || cached?.logo,
        serie: cached?.serie || "",
        cardCount: cached?.cardCount,
      });
      setNameCache.set(set.id, set.name);
    }

    return mapped;
  } catch {
    return await ListarColecoesRest();
  }
}

export async function BuscarCartasPorColecao(setId: string): Promise<Card[]> {
  const setIdLimpo = LimparTexto(setId);

  if (!setIdLimpo) {
    return [];
  }

  await GarantirColecoesRecentesCarregadas();

  if (!EhSetIdFisico(setIdLimpo)) {
    return [];
  }

  if (colecoesRecentesIdsCache.size > 0 && !colecoesRecentesIdsCache.has(setIdLimpo)) {
    return [];
  }

  const cliente = getTcgDexClient();

  if (!cliente) {
    const rest = await BuscarCartasPorColecaoRest(setIdLimpo).catch(() => []);

    if (rest.length > 0) {
      return rest;
    }

    const catalogo = await ListarCatalogo();

    return FiltrarColecoesRecentes(catalogo).filter(
      (card) =>
        card.setId === setIdLimpo ||
        NormalizarTexto(card.colecao) === NormalizarTexto(setIdLimpo),
    );
  }

  try {
    const setObj = await withTimeout(cliente.fetch("sets", setIdLimpo) as Promise<any>, 5000);

    if (!setObj || !EhColecaoFisicaParaFiltro(setObj)) {
      return [];
    }

    const setName = LimparTexto(setObj?.name || setIdLimpo);
    const serieName = LimparTexto(setObj?.serie?.name || setObj?.serie);
    const logo = ObterLogoColecao(setObj);

    const setInfo: SetInfo = {
      name: setName,
      logo,
      serie: serieName,
      cardCount: setObj?.cardCount,
    };

    setNameCache.set(setIdLimpo, setName);
    setInfoCache.set(setIdLimpo, setInfo);

    const cardsResumo = Array.isArray(setObj?.cards) ? setObj.cards : [];

    return cardsResumo.map((item: any) => {
      const card = MapearCartaDoTcgDex(
        AplicarInfoSetNaCarta(item, setIdLimpo, setInfo) as unknown as TcgDexCard,
      );

      return {
        ...card,
        setId: setIdLimpo,
        colecao: setName,
        serie: serieName,
      };
    });
  } catch {
    const rest = await BuscarCartasPorColecaoRest(setIdLimpo).catch(() => []);

    if (rest.length > 0) {
      return rest;
    }

    const catalogo = await ListarCatalogo();

    return FiltrarColecoesRecentes(catalogo).filter(
      (card) =>
        card.setId === setIdLimpo ||
        NormalizarTexto(card.colecao) === NormalizarTexto(setIdLimpo),
    );
  }
}

export async function PreBuscarDetalhesSets(
  setIds: string[],
  chunkSize = 5,
): Promise<Record<string, { logo?: string; serie?: string; name?: string }>> {
  const cliente = getTcgDexClient();
  const result: Record<string, { logo?: string; serie?: string; name?: string }> = {};

  if (!cliente) {
    return result;
  }

  const ids = (setIds || []).filter(Boolean);

  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize);

    const promises = chunk.map(async (setId) => {
      try {
        const info = await BuscarInfoSetPorId(cliente, setId);

        if (!info) {
          return;
        }

        const entry = {
          logo: info.logo,
          serie: info.serie,
          name: info.name,
        };

        result[setId] = entry;
      } catch {
        // ignora erros por coleção
      }
    });

    await Promise.allSettled(promises);
  }

  return result;
}

async function BuscarCartaPorCodigoRest(codigo: string): Promise<Card[]> {
  const consulta = LimparTexto(codigo);
  const codigoMatch = consulta.match(/(\d{1,4})\s*\/\s*(\d{1,4})/);

  if (!codigoMatch) {
    return [];
  }

  const codigoNumero = NormalizarNumeroVintage(codigoMatch[1]);
  const codigoTotal = NormalizarNumeroVintage(codigoMatch[2]);
  const encontrados: Card[] = [];
  const sets = await ListarColecoesRest().catch(() => []);

  for (const set of sets) {
    try {
      const setObj = await BuscarTcgDexRest(`sets/${set.id}`);

      if (!setObj || !EhColecaoFisicaParaFiltro(setObj)) {
        continue;
      }

      const totalSet = NormalizarNumeroVintage(
        setObj?.cardCount?.official || setObj?.cardCount?.total || "",
      );

      if (codigoTotal && totalSet && codigoTotal !== totalSet) {
        continue;
      }

      const setInfo: SetInfo = {
        name: LimparTexto(setObj?.name || set.name || set.id),
        logo: ObterLogoColecao(setObj) || set.logo,
        serie: LimparTexto(setObj?.serie?.name || setObj?.serie || ""),
        cardCount: setObj?.cardCount,
        released_at: ObterDataColecao(setObj),
      };

      const cardsResumo = Array.isArray(setObj?.cards) ? setObj.cards : [];

      for (const raw of cardsResumo) {
        const localId = ObterLocalIdVintage(raw);

        if (NormalizarNumeroVintage(localId) !== codigoNumero) {
          continue;
        }

        const cardId = LimparTexto(raw?.id) || `${set.id}-${localId}`;
        const localSemZeros = NormalizarNumeroVintage(localId);
        const tentativasCardId = Array.from(
          new Set([
            cardId,
            `${set.id}-${localId}`,
            `${set.id}-${localSemZeros}`,
            `${set.id}-${localSemZeros.padStart(2, "0")}`,
            `${set.id}-${localSemZeros.padStart(3, "0")}`,
          ].filter(Boolean)),
        );

        let detalhe: any | null = null;

        for (const tentativa of tentativasCardId) {
          detalhe = await BuscarTcgDexRest(`cards/${tentativa}`);

          if (detalhe) {
            break;
          }
        }

        const source = AplicarInfoSetNaCarta(detalhe || raw, set.id, setInfo);
        const cardMapped = MapearCartaDoTcgDex(source as unknown as TcgDexCard);

        if (!CodigoDaCartaConfere(cardMapped, codigoNumero, codigoTotal)) {
          continue;
        }

        encontrados.push({
          ...cardMapped,
          setId: set.id,
          colecao: setInfo.name || cardMapped.colecao,
          serie: setInfo.serie || cardMapped.serie,
          setLogoUrl: setInfo.logo || cardMapped.setLogoUrl,
        });

        if (encontrados.length >= 20) {
          return encontrados;
        }
      }
    } catch {
      // segue para o próximo set
    }
  }

  return encontrados;
}

async function BuscarCartaPorCodigoPeloTcgDex(codigo: string): Promise<Card[]> {
  const codigoTrim = codigo.trim().toLowerCase();

  if (!codigoTrim) {
    return [];
  }

  const cliente = getTcgDexClient();

  if (!cliente) {
    return [];
  }

  try {
    const cartaTcgDex = await withTimeout(cliente.fetch("cards", codigoTrim) as Promise<any>, 5000);

    if (cartaTcgDex) {
      const card = await MapearResultadoTcgDexComSet(cliente, cartaTcgDex);
      return card ? [card] : [];
    }

    const partesCodigo = codigoTrim.split("-");

    if (partesCodigo.length === 2) {
      const [setId, localId] = partesCodigo;

      if (setId && localId) {
        const cartaPorSet = await withTimeout(
          cliente.fetch("sets", setId, localId) as Promise<any>,
          5000,
        );

        if (cartaPorSet) {
          const card = await MapearResultadoTcgDexComSet(cliente, cartaPorSet);
          return card ? [card] : [];
        }
      }
    }
  } catch {
    // fallback para catálogo local
  }

  return [];
}

async function BuscarRecurso(caminho: "catalogCards" | "cards") {
  const resposta = await fetch(`${BASE_URL}/${caminho}`);

  if (!resposta.ok) {
    throw new Error("Falha ao carregar catalogo");
  }

  return (await resposta.json()) as CatalogCardApi[];
}

export async function ListarCatalogo(): Promise<Card[]> {
  try {
    const catalogo = await BuscarRecurso("catalogCards");
    const mapped = catalogo.map(MapearCarta).filter(Boolean) as Card[];

    if (mapped.length > 0) {
      return mapped;
    }
  } catch {
    // No web, o json-server pode não ter catalogCards.
  }

  const catalogoTcgDex = await ListarCatalogoTcgDexRest().catch(() => []);

  if (catalogoTcgDex.length > 0) {
    return catalogoTcgDex;
  }

  try {
    const cardsUsuario = await BuscarRecurso("cards");
    return cardsUsuario.map(MapearCarta).filter(Boolean) as Card[];
  } catch {
    return [];
  }
}

export async function BuscarCartaPorId(cardId: string): Promise<Card | null> {
  const id = LimparTexto(cardId);

  if (!id) {
    return null;
  }

  const cliente = getTcgDexClient();

  if (cliente) {
    try {
      const cartaTcgDex = await withTimeout(cliente.fetch("cards", id) as Promise<any>, 5000);

      if (cartaTcgDex) {
        const card = await MapearResultadoTcgDexComSet(cliente, cartaTcgDex);

        if (card) {
          return card;
        }
      }
    } catch {
      // fallback local
    }
  }

  const catalogo = await ListarCatalogo();
  return catalogo.find((card) => card.id === id) || null;
}

export async function BuscarCartaPorCodigo(codigo: string): Promise<Card[]> {
  const cartasRest = await BuscarCartaPorCodigoRest(codigo).catch(() => []);

  if (cartasRest.length > 0) {
    return cartasRest;
  }

  const cartasApi = await BuscarCartaPorCodigoPeloTcgDex(codigo);

  if (cartasApi.length > 0) {
    return cartasApi;
  }

  const catalogo = await ListarCatalogo();
  const codigoNormalizado = NormalizarCodigo(codigo);

  return catalogo.filter((card) => NormalizarCodigo(card.codigo) === codigoNormalizado);
}

async function MapearResultadosBusca(
  cliente: TCGdex,
  resultados: any[],
  filtros: ExploreFilter,
  codigoToken: string,
  nomeQuery: string,
) {
  const mapped: Card[] = [];
  const limiteProcessamento = resultados.slice(0, 350);

  for (const item of limiteProcessamento) {
    const source = await BuscarCardCompletoSePossivel(cliente, item);
    const cardMapped = await MapearResultadoTcgDexComSet(cliente, source || item);

    if (!cardMapped) {
      continue;
    }

    if (codigoToken) {
      const [tokenA = "", tokenB = ""] = codigoToken.replace(/\s+/g, "").split("/");
      const localDigits = LimparTexto((source as any)?.localId || (item as any)?.localId).replace(/\D/g, "");
      const totalDigits = LimparTexto(
        (source as any)?.set?.cardCount?.official ||
          (source as any)?.set?.cardCount?.total ||
          (item as any)?.set?.cardCount?.official ||
          (item as any)?.set?.cardCount?.total ||
          cardMapped.codigo.split("/")?.[1] ||
          "",
      ).replace(/\D/g, "");

      const matchA = tokenA.replace(/\D/g, "") === localDigits;
      const matchB = tokenB
        ? tokenB.replace(/\D/g, "") === totalDigits ||
          NormalizarCodigo(cardMapped.codigo).includes(NormalizarCodigo(codigoToken))
        : true;

      if (!matchA || !matchB) {
        continue;
      }
    }

    if (nomeQuery) {
      const nomeNormalizado = NormalizarTexto(nomeQuery);

      if (!NormalizarTexto(cardMapped.nome).includes(nomeNormalizado)) {
        continue;
      }
    }

    if (!CartaAtendeFiltros(cardMapped, filtros)) {
      continue;
    }

    mapped.push(cardMapped);

    if (mapped.length >= 140) {
      break;
    }
  }

  return mapped;
}

export async function BuscarCartas(filtros: ExploreFilter): Promise<Card[]> {
  const consulta = LimparTexto(filtros.query);

  if (!consulta) {
    const catalogo = await ListarCatalogo();
    return catalogo.filter((card) => CartaAtendeFiltros(card, filtros));
  }

  const codigoMatch = consulta.match(/(\d{1,4})\s*\/\s*(\d{1,4})/);
  const codigoToken = codigoMatch ? `${codigoMatch[1]}/${codigoMatch[2]}` : "";
  const codigoNumero = codigoMatch ? String(codigoMatch[1]) : "";
  const codigoTotal = codigoMatch ? String(codigoMatch[2]) : "";
  const nomeQuery = codigoToken ? consulta.replace(codigoMatch![0], "").trim() : consulta;

  const cliente = getTcgDexClient();

  if (!cliente) {
    const catalogo = await ListarCatalogo();

    return catalogo.filter((card) =>
      CartaAtendeFiltros(card, {
        ...filtros,
        colecao: FILTRO_TODOS,
      }),
    );
  }

  try {
    const queryBusca = codigoToken && !nomeQuery
      ? Query.create().contains("localId", codigoNumero)
      : Query.create().contains("name", nomeQuery || consulta);

    const resultados = await withTimeout(cliente.card.list(queryBusca as any) as Promise<any>, 6000);

    if (!Array.isArray(resultados) || resultados.length === 0) {
      return [];
    }

    const mapped: Card[] = [];

    for (const item of resultados.slice(0, 120)) {
      const cardMapped = await MapearResultadoBuscaTcgDex(cliente, item);

      if (codigoToken && !CodigoDaCartaConfere(cardMapped, codigoNumero, codigoTotal)) {
        continue;
      }

      if (nomeQuery) {
        const nomeNormalizado = NormalizarTexto(nomeQuery);

        if (!NormalizarTexto(cardMapped.nome).includes(nomeNormalizado)) {
          continue;
        }
      }

      const filtrosSemBuscaNemColecao: ExploreFilter = {
  ...filtros,
  query: "",
  colecao: FILTRO_TODOS,
  tipo: FILTRO_TODOS,
};

      if (!CartaAtendeFiltros(cardMapped, filtrosSemBuscaNemColecao)) {
        continue;
      }

      mapped.push(cardMapped);

      if (mapped.length >= 140) {
        break;
      }
    }

const vintage = await BuscarCartasVintageDireto(filtros, mapped);

for (const cardVintage of vintage) {
  if (!CardJaExiste(mapped, cardVintage.id)) {
    mapped.push(cardVintage);
  }

  if (mapped.length >= 180) {
    break;
  }
}

return mapped;

  } catch {
    const catalogo = await ListarCatalogo();

    return catalogo.filter((card) =>
  CartaAtendeFiltros(card, {
    ...filtros,
    colecao: FILTRO_TODOS,
    tipo: FILTRO_TODOS,
  }),
);
  }
}