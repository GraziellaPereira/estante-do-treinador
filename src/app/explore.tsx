import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import BASE_URL from "../../apiService/api";
import {
  BuscarCartas,
  BuscarCartasPorColecao,
  BuscarDetalheCartaTcgDex,
  ListarCatalogo,
  ListarColecoes,
  PreBuscarDetalhesSets,
} from "../services/CatalogService";
import {
  BuscarWishlist,
  RemoverWishlistItem,
  UpsertWishlistItem,
} from "../services/WishlistService";
import type { Card, ExploreFilter, UsuarioApi } from "../types/explore";
import {
  CartaAtendeFiltros,
  FILTRO_TODOS,
  NormalizarTexto,
  OpcoesUnicas,
} from "../utils/BuscaUtils";

const AUTH_SESSION_STORAGE_KEY = "estante:authUser:v1";
const COLECOES_CACHE_KEY = "estante:colecoes-fisicas:v9";

const wishlistFilledIcon = require("../../assets/wishlist_filled_gold.png");
const wishlistOutlineIcon = require("../../assets/wishlist_outline.png");
const exploreHeaderBg = require("../../assets/explore_outline.png");
const backIcon = require("../../assets/icons/icon_back_gold.png");
const resultsCardsIcon = require("../../assets/icons/icon_results_cards_gold.png");
const filtersIcon = require("../../assets/icons/icon_filters_gold.png");
const sortIcon = require("../../assets/icons/icon_sort_gold.png");
const clearFiltersIcon = require("../../assets/icons/icon_clear_filters_gold.png");

type ColecaoApi = {
  id: string;
  name: string;
  logo?: string;
  released_at?: string | null;
  seq?: number;
};

type OrdenacaoExplore =
  | "RELEVANCIA"
  | "DATA_DESC"
  | "DATA_ASC"
  | "RARIDADE_DESC"
  | "RARIDADE_ASC";

  const OPCOES_ORDENACAO: { label: string; value: OrdenacaoExplore }[] = [
  { label: "Relevância", value: "RELEVANCIA" },
  { label: "Lançamento ↓", value: "DATA_DESC" },
  { label: "Lançamento ↑", value: "DATA_ASC" },
  { label: "Raridade ↓", value: "RARIDADE_DESC" },
  { label: "Raridade ↑", value: "RARIDADE_ASC" },
];

function ObterLabelOrdenacao(value: OrdenacaoExplore) {
  return OPCOES_ORDENACAO.find((item) => item.value === value)?.label || "Relevância";
}

const filtrosIniciais: ExploreFilter = {
  query: "",
  colecao: FILTRO_TODOS,
  raridade: FILTRO_TODOS,
  tipo: FILTRO_TODOS,
};

function ColecaoPareceFisica(colecao: Partial<ColecaoApi>) {
  const id = String(colecao.id || "").trim().toLowerCase();
  const nome = NormalizarTexto(colecao.name || "");

  const ehMegaEvolucaoEnergia =
    id === "mee" ||
    nome.includes("mega evolution energy") ||
    nome.includes("megaevolucao energia") ||
    nome.includes("mega evolução energia");

  const ehBlackStarPromo =
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
    id === "wotc";

  if (!id || !colecao.name) {
    return false;
  }

  return (
    !ehMegaEvolucaoEnergia &&
    !ehBlackStarPromo &&
    !nome.includes("pocket") &&
    !nome.includes("paldean wonders") &&
    !id.startsWith("tcgp") &&
    !/^a\d/i.test(id) &&
    !/^[a-z]\d[a-z]?$/i.test(id)
  );
}

function LimparOpcoesGenericas(opcoes: string[], genericos: string[]) {
  const genericosNormalizados = new Set(genericos.map((item) => NormalizarTexto(item)));

  const opcoesReais = opcoes.filter((opcao) => {
    if (opcao === FILTRO_TODOS) {
      return false;
    }

    return !genericosNormalizados.has(NormalizarTexto(opcao));
  });

  if (opcoesReais.length === 0) {
    return opcoes;
  }

  return [FILTRO_TODOS, ...opcoesReais];
}

function ObterTimestampLancamento(card: Card) {
  const dataBruta =
    card.dataLancamento ||
    (card as any).released_at ||
    (card as any).releaseDate ||
    null;

  if (!dataBruta) {
    return null;
  }

  const timestamp = Date.parse(String(dataBruta));

  if (Number.isNaN(timestamp)) {
    return null;
  }

  return timestamp;
}

function ObterNumeroCarta(card: Card) {
  const codigo = String(card.codigo || "");
  const numero = codigo.split("/")[0]?.replace(/\D/g, "");
  return Number(numero || 0);
}

function OrdenarCartas(cards: Card[], modo: OrdenacaoExplore) {
  const lista = [...cards];

  if (modo === "DATA_DESC") {
    return lista.sort((a, b) => {
      const dataA = ObterTimestampLancamento(a);
      const dataB = ObterTimestampLancamento(b);

      if (dataA === null && dataB === null) {
        return ObterNumeroCarta(a) - ObterNumeroCarta(b);
      }

      if (dataA === null) return 1;
      if (dataB === null) return -1;

      const diff = dataB - dataA;

      if (diff !== 0) {
        return diff;
      }

      return ObterNumeroCarta(a) - ObterNumeroCarta(b);
    });
  }

  if (modo === "DATA_ASC") {
    return lista.sort((a, b) => {
      const dataA = ObterTimestampLancamento(a);
      const dataB = ObterTimestampLancamento(b);

      if (dataA === null && dataB === null) {
        return ObterNumeroCarta(a) - ObterNumeroCarta(b);
      }

      if (dataA === null) return 1;
      if (dataB === null) return -1;

      const diff = dataA - dataB;

      if (diff !== 0) {
        return diff;
      }

      return ObterNumeroCarta(a) - ObterNumeroCarta(b);
    });
  }

  if (modo === "RARIDADE_DESC") {
    return lista.sort((a, b) => Number(b.raridadeRank || 0) - Number(a.raridadeRank || 0));
  }

  if (modo === "RARIDADE_ASC") {
    return lista.sort((a, b) => Number(a.raridadeRank || 0) - Number(b.raridadeRank || 0));
  }

  return lista;
}


async function BuscarUsuarioAutenticado() {
  const usuarioSessao = (await AsyncStorage.getItem(AUTH_SESSION_STORAGE_KEY))?.trim() || "";

  if (!usuarioSessao) {
    return null;
  }

  const resposta = await fetch(`${BASE_URL}/users?usuario=${encodeURIComponent(usuarioSessao)}`);

  if (!resposta.ok) {
    throw new Error("Falha ao carregar usuario");
  }

  const usuarios = (await resposta.json()) as UsuarioApi[];
  const usuario = usuarios.find(
    (item) => item.usuario?.toLowerCase() === usuarioSessao.toLowerCase(),
  );

  if (!usuario || usuario.id === undefined || usuario.id === null) {
    return null;
  }

  return {
    userId: String(usuario.id),
    usuario: usuario.usuario,
  };
}

export default function ExploreScreen() {
  const router = useRouter();

  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [userId, setUserId] = useState("");
  const [catalogo, setCatalogo] = useState<Card[]>([]);
  const [colecoesApiTyped, setColecoesApiTyped] = useState<ColecaoApi[]>([]);
  const [showCollectionsModal, setShowCollectionsModal] = useState(false);
  const [showDropdown, setShowDropdown] = useState<null | "raridade" | "tipo">(null);
  const [resultados, setResultados] = useState<Card[]>([]);
  const [cartasColecaoAtual, setCartasColecaoAtual] = useState<Card[]>([]);
  const [colecaoAtualCarregada, setColecaoAtualCarregada] = useState<string>(FILTRO_TODOS);
  const [filtros, setFiltros] = useState<ExploreFilter>(filtrosIniciais);
  const [salvandoCardId, setSalvandoCardId] = useState("");
  const [wishlistIds, setWishlistIds] = useState<Set<string>>(new Set());
  const [wishlistItemIds, setWishlistItemIds] = useState<Map<string, string>>(new Map());
  const [buscando, setBuscando] = useState(false);
  const [ordenacao, setOrdenacao] = useState<OrdenacaoExplore>("RELEVANCIA");
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const filtrosRef = useRef(filtros);
const colecaoSelecionadaRef = useRef(FILTRO_TODOS);

useEffect(() => {
  filtrosRef.current = filtros;
  colecaoSelecionadaRef.current = filtros.colecao;
}, [filtros]);

const RecarregarWishlistUsuario = useCallback(async () => {
  if (!userId) {
    return;
  }

  try {
    const itensWishlist = await BuscarWishlist(userId);

    setWishlistIds(new Set(itensWishlist.map((item) => String(item.cardId))));
    setWishlistItemIds(
      new Map(
        itensWishlist
          .filter((item) => item.id !== undefined && item.id !== null)
          .map((item) => [String(item.cardId), String(item.id)]),
      ),
    );
  } catch {
    setWishlistIds(new Set());
    setWishlistItemIds(new Map());
  }
}, [userId]);

useFocusEffect(
  useCallback(() => {
    void RecarregarWishlistUsuario();
  }, [RecarregarWishlistUsuario]),
);

  const CarregarExplorar = useCallback(async () => {
    setCarregando(true);
    setErro("");

    try {
      const usuario = await BuscarUsuarioAutenticado();

      if (!usuario) {
        Alert.alert("Sessao expirada", "Faca login novamente.");
        router.replace("/");
        return;
      }

      setUserId(usuario.userId);

      try {
        const itensWishlist = await BuscarWishlist(usuario.userId);
        setWishlistIds(new Set(itensWishlist.map((item) => String(item.cardId))));
        setWishlistItemIds(
          new Map(
            itensWishlist
              .filter((item) => item.id !== undefined && item.id !== null)
              .map((item) => [String(item.cardId), String(item.id)]),
          ),
        );
      } catch {
        setWishlistIds(new Set());
        setWishlistItemIds(new Map());
      }

      try {
        const cached = await AsyncStorage.getItem(COLECOES_CACHE_KEY);

        if (cached) {
          const parsed = JSON.parse(cached);

          if (Array.isArray(parsed) && parsed.length > 0) {
            const cacheFiltrado = parsed
              .map((p: any) => ({
                id: String(p.id || ""),
                name: String(p.name || ""),
                logo: p.logo,
                released_at: p.released_at || null,
                seq: p.seq,
              }))
              .filter(ColecaoPareceFisica);

            if (cacheFiltrado.length > 0) {
              setColecoesApiTyped(cacheFiltrado);
            }
          }
        }
      } catch {
        // Ignora erro de cache.
      }

      const sets = await ListarColecoes();
      const typed = (sets || [])
        .map((s: any) => ({
          id: String(s.id || ""),
          name: String(s.name || ""),
          logo: s.logo,
          released_at: s.released_at || null,
          seq: typeof s.seq === "number" ? s.seq : 0,
        }))
        .filter(ColecaoPareceFisica);

      setColecoesApiTyped(typed);

      const idsColecoesRecentes = new Set(typed.map((s) => String(s.id)));
      const cardsParaFiltros = await ListarCatalogo();
      const cardsLimitados = cardsParaFiltros.filter((card) =>
        idsColecoesRecentes.has(String(card.setId || "").trim()),
      );

      setCatalogo(cardsLimitados);
      setResultados(cardsLimitados);
      setCartasColecaoAtual([]);
      setColecaoAtualCarregada(FILTRO_TODOS);

      const ordered = [...typed].sort((a, b) => {
        const dataA = a.released_at ? Date.parse(String(a.released_at)) : 0;
        const dataB = b.released_at ? Date.parse(String(b.released_at)) : 0;

        if (dataB !== dataA) {
          return dataB - dataA;
        }

        return Number(b.seq || 0) - Number(a.seq || 0);
      });

      const idsTop15 = ordered.slice(0, 15).map((x) => x.id).filter(Boolean);

      if (idsTop15.length > 0) {
        const pre = await PreBuscarDetalhesSets(idsTop15);

        const updated = typed
          .map((s) => ({
            ...s,
            logo: (pre[s.id] && pre[s.id].logo) || s.logo,
          }))
          .filter(ColecaoPareceFisica);

        setColecoesApiTyped(updated);

        try {
          await AsyncStorage.setItem(COLECOES_CACHE_KEY, JSON.stringify(updated));
        } catch {
          // Ignora erro de cache.
        }
      }
    } catch {
      setErro("Nao foi possivel carregar o catalogo.");
      setCatalogo([]);
      setResultados([]);
      setCartasColecaoAtual([]);
      setColecaoAtualCarregada(FILTRO_TODOS);
    } finally {
      setCarregando(false);
    }
  }, [router]);

  useEffect(() => {
    void CarregarExplorar();
  }, [CarregarExplorar]);

  useEffect(() => {
    let ativo = true;

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(async () => {
      if (!ativo) {
        return;
      }

      const query = String(filtros.query || "").trim();

      if (filtros.colecao !== FILTRO_TODOS && colecaoAtualCarregada !== filtros.colecao) {
        setBuscando(true);

        try {
          const cartasDaColecao = await BuscarCartasPorColecao(filtros.colecao);

if (ativo) {
  setCartasColecaoAtual(cartasDaColecao);
  setColecaoAtualCarregada(filtros.colecao);

  const filtradas = cartasDaColecao.filter((card) =>
    CartaAtendeFiltros(card, { ...filtros, query }),
  );

  setResultados(filtradas);

  void EnriquecerCartasDaColecaoEmSegundoPlano(filtros.colecao, cartasDaColecao);
}
        } catch {
          if (ativo) {
            setCartasColecaoAtual([]);
            setResultados([]);
          }
        } finally {
          if (ativo) {
            setBuscando(false);
          }
        }

        return;
      }

      const baseLocal = filtros.colecao === FILTRO_TODOS ? catalogo : cartasColecaoAtual;

      if (!query) {
        setResultados(
          baseLocal.filter((card) => CartaAtendeFiltros(card, { ...filtros, query: "" })),
        );
        setBuscando(false);
        return;
      }

      if (query.length < 2) {
        setResultados(baseLocal.filter((card) => CartaAtendeFiltros(card, filtros)));
        setBuscando(false);
        return;
      }

      if (filtros.colecao !== FILTRO_TODOS) {
        setResultados(baseLocal.filter((card) => CartaAtendeFiltros(card, filtros)));
        setBuscando(false);
        return;
      }

      setBuscando(true);

      try {
        const resultadosApi = await BuscarCartas({
  ...filtros,
  colecao: FILTRO_TODOS,
  tipo: FILTRO_TODOS,
});

        if (ativo) {
          const filtrosSemBuscaNemColecao: ExploreFilter = {
            ...filtros,
            query: "",
            colecao: FILTRO_TODOS,
            tipo: FILTRO_TODOS,
          };

          const filtrados = resultadosApi.filter((card) =>
            CartaAtendeFiltros(card, filtrosSemBuscaNemColecao),
          );

          setResultados(filtrados);
        }
      } catch {
        if (ativo) {
          setResultados([]);
        }
      } finally {
        if (ativo) {
          setBuscando(false);
        }
      }
    }, 400);

    return () => {
      ativo = false;

      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [filtros, catalogo, cartasColecaoAtual, colecaoAtualCarregada]);

  const baseOpcoesFiltro = useMemo(() => {
    const temBusca = String(filtros.query || "").trim().length > 0;

    if (temBusca) {
      return resultados;
    }

    if (filtros.colecao === FILTRO_TODOS) {
      return resultados.length > 0 ? resultados : catalogo;
    }

    return cartasColecaoAtual.length > 0 ? cartasColecaoAtual : resultados;
  }, [filtros.query, filtros.colecao, catalogo, cartasColecaoAtual, resultados]);

  const opcoesRaridade = useMemo(
    () =>
      LimparOpcoesGenericas(
        OpcoesUnicas(baseOpcoesFiltro, "raridade"),
        ["Sem raridade", ""],
      ),
    [baseOpcoesFiltro],
  );

  const opcoesTipo = useMemo(
    () =>
      LimparOpcoesGenericas(
        OpcoesUnicas(baseOpcoesFiltro, "tipo"),
        ["Carta", ""],
      ),
    [baseOpcoesFiltro],
  );

  const temBuscaAtiva = useMemo(
  () => String(filtros.query || "").trim().length > 0,
  [filtros.query],
);

  const resultadosOrdenados = useMemo(
    () => OrdenarCartas(resultados, ordenacao),
    [resultados, ordenacao],
  );

  const colecoesOrdenadas = useMemo(() => {
    const arr = [...colecoesApiTyped].filter(ColecaoPareceFisica);

    arr.sort((a, b) => {
      const dataA = a.released_at ? Date.parse(String(a.released_at)) : 0;
      const dataB = b.released_at ? Date.parse(String(b.released_at)) : 0;

      if (dataB !== dataA) {
        return dataB - dataA;
      }

      return Number(b.seq || 0) - Number(a.seq || 0);
    });

    return arr;
  }, [colecoesApiTyped]);

  const colecoesTop5 = useMemo(() => colecoesOrdenadas.slice(0, 5), [colecoesOrdenadas]);

  function MesclarDetalhesCartas(base: Card[], detalhes: Card[]) {
  const detalhesPorId = new Map(detalhes.map((card) => [card.id, card]));

  return base.map((card) => {
    const detalhe = detalhesPorId.get(card.id);

    if (!detalhe) {
      return card;
    }

    return {
      ...card,
      ...detalhe,
      imageUrl: card.imageUrl || detalhe.imageUrl,
      serie: detalhe.serie || card.serie,
      colecao: detalhe.colecao || card.colecao,
      setId: detalhe.setId || card.setId,
      dataLancamento: detalhe.dataLancamento || card.dataLancamento || null,
      raridadeRank: detalhe.raridadeRank || card.raridadeRank || 0,
    };
  });
}

async function EnriquecerCartasDaColecaoEmSegundoPlano(setId: string, cartas: Card[]) {
  const setIdAtual = String(setId || "").trim();

  if (!setIdAtual || cartas.length === 0) {
    return;
  }

  let acumuladas = [...cartas];
  const tamanhoLote = 8;

  for (let i = 0; i < cartas.length; i += tamanhoLote) {
    if (colecaoSelecionadaRef.current !== setIdAtual) {
      return;
    }

    const lote = cartas.slice(i, i + tamanhoLote);

    const detalhes = await Promise.all(
      lote.map((card) => BuscarDetalheCartaTcgDex(card)),
    );

    if (colecaoSelecionadaRef.current !== setIdAtual) {
      return;
    }

    acumuladas = MesclarDetalhesCartas(acumuladas, detalhes);
    setCartasColecaoAtual(acumuladas);

    const filtrosAtuais = filtrosRef.current;
    const queryAtual = String(filtrosAtuais.query || "").trim();

    const filtradas = acumuladas.filter((card) =>
      CartaAtendeFiltros(card, {
        ...filtrosAtuais,
        query: queryAtual,
      }),
    );

    setResultados(filtradas);
  }
}

  function SelecionarColecao(id: string) {
    setShowCollectionsModal(false);

    setFiltros((atual) => ({
      ...atual,
      query: "",
      colecao: id,
      raridade: FILTRO_TODOS,
      tipo: FILTRO_TODOS,
    }));
  }

  function AtualizarFiltro(campo: keyof ExploreFilter, valor: string) {
  if (campo === "query") {
    const temBusca = String(valor || "").trim().length > 0;

    setFiltros((atual) => ({
      ...atual,
      query: valor,
      colecao: temBusca ? FILTRO_TODOS : atual.colecao,
      tipo: FILTRO_TODOS,
    }));

    if (temBusca) {
      setCartasColecaoAtual([]);
      setColecaoAtualCarregada(FILTRO_TODOS);
    }

    return;
  }

  setFiltros((atual) => ({
    ...atual,
    [campo]: valor,
  }));
}

  function LimparFiltros() {
    setFiltros(filtrosIniciais);
    setOrdenacao("RELEVANCIA");
    setCartasColecaoAtual([]);
    setColecaoAtualCarregada(FILTRO_TODOS);
    setResultados(catalogo);
  }

  async function AlternarWishlist(cardId: string) {
    if (!userId) {
      Alert.alert("Sessao expirada", "Faca login novamente.");
      router.replace("/");
      return;
    }

    const jaEstaNaWishlist = wishlistIds.has(cardId);
    setSalvandoCardId(cardId);

    try {
      if (jaEstaNaWishlist) {
        let itemId = wishlistItemIds.get(cardId);

        if (!itemId) {
          const itens = await BuscarWishlist(userId);
          const encontrado = itens.find((item) => String(item.cardId) === String(cardId));
          itemId = encontrado?.id !== undefined && encontrado?.id !== null ? String(encontrado.id) : "";
        }

        if (itemId) {
          await RemoverWishlistItem(itemId);
        }

        setWishlistIds((atual) => {
          const novo = new Set(atual);
          novo.delete(cardId);
          return novo;
        });

        setWishlistItemIds((atual) => {
          const novo = new Map(atual);
          novo.delete(cardId);
          return novo;
        });

        return;
      }

      const novoItem = await UpsertWishlistItem(userId, cardId);

      setWishlistIds((atual) => {
        const novo = new Set(atual);
        novo.add(cardId);
        return novo;
      });

      if (novoItem?.id !== undefined && novoItem?.id !== null) {
        setWishlistItemIds((atual) => {
          const novo = new Map(atual);
          novo.set(cardId, String(novoItem.id));
          return novo;
        });
      }
    } catch {
      Alert.alert("Erro", "Nao foi possivel atualizar a Wishlist.");
    } finally {
      setSalvandoCardId("");
    }
  }

  function Dropdown({
    label,
    value,
    options,
    onChange,
  }: {
    label: string;
    value: string;
    options: string[];
    onChange: (v: string) => void;
  }) {
    const dropdownKey = label === "Raridade" ? "raridade" : "tipo";

    return (
      <View style={styles.filterBlock}>
        <Text style={styles.filterTitle}>{label}</Text>

        <TouchableOpacity
          style={[styles.filterChip, styles.dropdownButton]}
          onPress={() => setShowDropdown(dropdownKey)}
        >
          <Text style={styles.filterChipText}>{value}</Text>
        </TouchableOpacity>

        <Modal
          visible={showDropdown === dropdownKey}
          transparent
          animationType="fade"
          onRequestClose={() => setShowDropdown(null)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalContainer}>
              <Text style={[styles.filterTitle, { marginBottom: 8 }]}>{label}</Text>

              <FlatList
                data={options}
                keyExtractor={(item) => item}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.modalItem}
                    onPress={() => {
                      onChange(item);
                      setShowDropdown(null);
                    }}
                  >
                    <Text style={styles.modalItemText}>{item}</Text>
                  </TouchableOpacity>
                )}
              />

              <TouchableOpacity style={styles.primaryButton} onPress={() => setShowDropdown(null)}>
                <Text style={styles.primaryButtonText}>Fechar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  if (carregando) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator color="#E4B56D" />
        <Text style={styles.loadingText}>Carregando Explorar...</Text>
      </View>
    );
  }

  return (
    <LinearGradient
  colors={["#070707", "#0E0A07", "#15100A"]}
  start={{ x: 0, y: 0 }}
  end={{ x: 1, y: 1 }}
  style={styles.screen}
>
  <View pointerEvents="none" style={styles.headerBackgroundLayer}>
  <Image
    source={exploreHeaderBg}
    style={styles.headerBackgroundImage}
    resizeMode="contain"
  />

  <LinearGradient
    colors={[
      "rgba(7, 7, 7, 0.00)",
      "rgba(7, 7, 7, 0.45)",
      "rgba(7, 7, 7, 0.88)",
      "#070707",
    ]}
    locations={[0, 0.42, 0.76, 1]}
    style={styles.headerBackgroundFade}
  />
</View>

  <ScrollView
    style={styles.scrollLayer}
    contentContainerStyle={styles.content}
    showsVerticalScrollIndicator={false}
  >
        <View style={styles.heroHeader}>
  <View style={styles.heroTopRow}>
    <TouchableOpacity style={styles.heroIconButton} onPress={() => router.back()}>
  <Image
    source={backIcon}
    style={styles.heroBackIcon}
    resizeMode="contain"
  />
</TouchableOpacity>

    <TouchableOpacity style={styles.heroIconButton} onPress={LimparFiltros}>
  <Image
    source={clearFiltersIcon}
    style={styles.heroActionIcon}
    resizeMode="contain"
  />
</TouchableOpacity>
  </View>

  <Text style={styles.title}>Explorar</Text>
  <Text style={styles.subtitle}>Busque cartas e complete sua coleção.</Text>

  <View style={styles.searchBox}>
    <Text style={styles.searchIcon}>⌕</Text>

    <TextInput
      value={filtros.query}
      onChangeText={(valor) => AtualizarFiltro("query", valor)}
      style={styles.searchInput}
      placeholder="Buscar carta, Pokémon ou código"
      placeholderTextColor="#A99D8E"
      autoCapitalize="none"
    />

    {buscando ? (
      <View style={styles.searchSpinner}>
        <ActivityIndicator size="small" color="#E4B56D" />
      </View>
    ) : null}
  </View>
</View>

        <Modal
          visible={showCollectionsModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowCollectionsModal(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={[styles.modalContainer, { maxHeight: 500 }]}>
              <Text style={[styles.filterTitle, { marginBottom: 8 }]}>Últimas 15 coleções físicas</Text>

              <FlatList
                data={colecoesOrdenadas}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.modalItem, styles.collectionModalItem]}
                    onPress={() => SelecionarColecao(item.id)}
                  >
                    {item.logo ? (
                      <Image
                        source={{ uri: item.logo }}
                        style={styles.collectionModalLogo}
                        resizeMode="contain"
                      />
                    ) : (
                      <View style={styles.collectionModalLogoFallback}>
                        <Text style={styles.collectionFallbackText}>
                          {item.name.slice(0, 2).toUpperCase()}
                        </Text>
                      </View>
                    )}

                    <Text style={styles.modalItemText}>{item.name}</Text>
                  </TouchableOpacity>
                )}
              />

              <TouchableOpacity style={styles.primaryButton} onPress={() => setShowCollectionsModal(false)}>
                <Text style={styles.primaryButtonText}>Fechar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

<Modal
  visible={showFiltersModal}
  transparent
  animationType="slide"
  onRequestClose={() => setShowFiltersModal(false)}
>
  <View style={styles.modalBackdrop}>
    <View style={styles.bottomSheet}>
      <View style={styles.sheetHandle} />

      <Text style={styles.sheetTitle}>Filtros</Text>

      <Text style={styles.sheetSectionTitle}>Raridade</Text>

      <View style={styles.optionWrap}>
        {opcoesRaridade.map((item) => (
          <TouchableOpacity
            key={`raridade-${item}`}
            style={[
              styles.optionChip,
              filtros.raridade === item && styles.optionChipActive,
            ]}
            onPress={() => AtualizarFiltro("raridade", item)}
          >
            <Text
              style={[
                styles.optionChipText,
                filtros.raridade === item && styles.optionChipTextActive,
              ]}
            >
              {item}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {!temBuscaAtiva ? (
        <>
          <Text style={styles.sheetSectionTitle}>Tipo</Text>

          <View style={styles.optionWrap}>
            {opcoesTipo.map((item) => (
              <TouchableOpacity
                key={`tipo-${item}`}
                style={[
                  styles.optionChip,
                  filtros.tipo === item && styles.optionChipActive,
                ]}
                onPress={() => AtualizarFiltro("tipo", item)}
              >
                <Text
                  style={[
                    styles.optionChipText,
                    filtros.tipo === item && styles.optionChipTextActive,
                  ]}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      ) : null}

      <View style={styles.sheetActions}>
        <TouchableOpacity
          style={styles.sheetSecondaryButton}
          onPress={() => {
            AtualizarFiltro("raridade", FILTRO_TODOS);
            AtualizarFiltro("tipo", FILTRO_TODOS);
          }}
        >
          <Text style={styles.sheetSecondaryButtonText}>Limpar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.sheetPrimaryButton}
          onPress={() => setShowFiltersModal(false)}
        >
          <Text style={styles.sheetPrimaryButtonText}>Aplicar</Text>
        </TouchableOpacity>
      </View>
    </View>
  </View>
</Modal>

<Modal
  visible={showSortModal}
  transparent
  animationType="slide"
  onRequestClose={() => setShowSortModal(false)}
>
  <View style={styles.modalBackdrop}>
    <View style={styles.bottomSheet}>
      <View style={styles.sheetHandle} />

      <Text style={styles.sheetTitle}>Ordenar por</Text>

      <View style={styles.optionWrap}>
        {OPCOES_ORDENACAO.map((item) => (
          <TouchableOpacity
            key={item.value}
            style={[
              styles.optionChip,
              ordenacao === item.value && styles.optionChipActive,
            ]}
            onPress={() => {
              setOrdenacao(item.value);
              setShowSortModal(false);
            }}
          >
            <Text
              style={[
                styles.optionChipText,
                ordenacao === item.value && styles.optionChipTextActive,
              ]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={styles.sheetPrimaryButton}
        onPress={() => setShowSortModal(false)}
      >
        <Text style={styles.sheetPrimaryButtonText}>Fechar</Text>
      </TouchableOpacity>
    </View>
  </View>
</Modal>

        <View style={styles.collectionsSection}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.filterTitle}>Coleções em alta</Text>

            <TouchableOpacity onPress={() => setShowCollectionsModal(true)}>
              <Text style={styles.seeAllText}>Ver todas</Text>
            </TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {colecoesTop5.map((colecao) => (
              <TouchableOpacity
                key={`top-${colecao.id}`}
                style={[
                  styles.collectionCard,
                  filtros.colecao === colecao.id && styles.collectionCardActive,
                ]}
                onPress={() => SelecionarColecao(colecao.id)}
              >
                {colecao.logo ? (
                  <Image
                    source={{ uri: colecao.logo }}
                    style={styles.collectionImage}
                    resizeMode="contain"
                  />
                ) : (
                  <View style={styles.collectionImageFallback}>
                    <Text style={styles.collectionFallbackText} numberOfLines={2}>
                      {colecao.name}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

<View style={styles.resultsPanel}>
  <View style={styles.resultsHeader}>
    <View style={styles.resultsTitleWrap}>
      <Image
  source={resultsCardsIcon}
  style={styles.resultsImageIcon}
  resizeMode="contain"
/>

      <View>
        <Text style={styles.resultsTitle}>Resultados</Text>
        <Text style={styles.resultsCount}>
          {resultadosOrdenados.length} cartas encontradas
        </Text>
      </View>
    </View>

    <View style={styles.resultsActions}>
      <TouchableOpacity
        style={styles.resultActionButton}
        onPress={() => setShowFiltersModal(true)}
      >
        <Image
  source={filtersIcon}
  style={styles.resultActionImageIcon}
  resizeMode="contain"
/>
<Text style={styles.resultActionText}>Filtros</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.resultActionButton}
        onPress={() => setShowSortModal(true)}
      >
        <Image
  source={sortIcon}
  style={styles.resultActionImageIcon}
  resizeMode="contain"
/>
<Text style={styles.resultActionText}>Ordenar</Text>
      </TouchableOpacity>
    </View>
  </View>

  <View style={styles.activeFiltersRow}>
    {filtros.raridade !== FILTRO_TODOS ? (
      <TouchableOpacity
        style={styles.activeFilterChip}
        onPress={() => AtualizarFiltro("raridade", FILTRO_TODOS)}
      >
        <Text style={styles.activeFilterChipText}>{filtros.raridade} ×</Text>
      </TouchableOpacity>
    ) : null}

    {!temBuscaAtiva && filtros.tipo !== FILTRO_TODOS ? (
      <TouchableOpacity
        style={styles.activeFilterChip}
        onPress={() => AtualizarFiltro("tipo", FILTRO_TODOS)}
      >
        <Text style={styles.activeFilterChipText}>{filtros.tipo} ×</Text>
      </TouchableOpacity>
    ) : null}

    {ordenacao !== "RELEVANCIA" ? (
      <TouchableOpacity
        style={styles.activeFilterChip}
        onPress={() => setOrdenacao("RELEVANCIA")}
      >
        <Text style={styles.activeFilterChipText}>{ObterLabelOrdenacao(ordenacao)} ×</Text>
      </TouchableOpacity>
    ) : null}
  </View>

  {erro ? (
    <View style={styles.stateBox}>
      <Text style={styles.stateTitle}>Catálogo indisponível</Text>
      <Text style={styles.stateText}>{erro}</Text>

      <TouchableOpacity style={styles.primaryButton} onPress={() => void CarregarExplorar()}>
        <Text style={styles.primaryButtonText}>Tentar novamente</Text>
      </TouchableOpacity>
    </View>
  ) : null}

  {!erro && resultados.length === 0 ? (
    <View style={styles.stateBox}>
      <Text style={styles.stateTitle}>Nenhuma carta encontrada</Text>
      <Text style={styles.stateText}>Ajuste a busca ou remova filtros para ver mais cartas.</Text>
    </View>
  ) : null}

  <FlatList
  data={resultadosOrdenados}
  keyExtractor={(item) => item.id}
  numColumns={2}
  contentContainerStyle={styles.grid}
  columnWrapperStyle={styles.gridRow}
    initialNumToRender={6}
    maxToRenderPerBatch={6}
    updateCellsBatchingPeriod={50}
    windowSize={5}
    removeClippedSubviews={false}
    scrollEnabled={false}
    renderItem={({ item: card }) => (
      <TouchableOpacity
        style={styles.cardShell}
        activeOpacity={0.9}
        onPress={() =>
          router.push({
            pathname: "/card-detail",
            params: { cardId: card.id },
          })
        }
      >
        <View style={styles.cardImageWrap}>
          {card.imageUrl ? (
            <Image source={{ uri: card.imageUrl }} style={styles.cardImageLarge} />
          ) : (
            <View style={styles.imageFallbackLarge}>
              <Text style={styles.imageFallbackText}>Sem imagem</Text>
            </View>
          )}

          <TouchableOpacity
            style={[
              styles.wishlistFloatingButton,
              wishlistIds.has(card.id) && styles.wishlistFloatingButtonActive,
            ]}
            onPress={(event) => {
              event.stopPropagation();
              void AlternarWishlist(card.id);
            }}
            disabled={salvandoCardId === card.id}
          >
            {salvandoCardId === card.id ? (
              <ActivityIndicator size="small" color="#E4B56D" />
            ) : (
              <Image
                source={wishlistIds.has(card.id) ? wishlistFilledIcon : wishlistOutlineIcon}
                style={[
                  styles.wishlistIconImage,
                  !wishlistIds.has(card.id) && styles.wishlistIconOutline,
                ]}
                resizeMode="contain"
              />
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.cardInfoBox}>
          <Text style={styles.cardNameCompact} numberOfLines={1}>
            {card.nome}
          </Text>

          <Text style={styles.cardSetCompact} numberOfLines={2}>
            {card.colecao}
          </Text>

          <View style={styles.cardMetaRow}>
            <Text style={styles.cardCodeCompact}>{card.codigo}</Text>

            <Text style={styles.cardTypeCompact} numberOfLines={2}>
              {card.serie || "Série não informada"}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    )}
  />
</View>

      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  loadingWrap: {
    flex: 1,
    backgroundColor: "#090909",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },

  loadingText: {
    color: "#F8E9CE",
    fontWeight: "700",
  },

  screen: {
    flex: 1,
  },

  scrollLayer: {
    zIndex: 2,
  },

  headerBackgroundLayer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 360,
    zIndex: 0,
  },

  headerBackgroundImage: {
    position: "absolute",
    top: -55,
    right: -120,
    width: "150%",
    height: 330,
    opacity: 0.6,
  },

  headerBackgroundFade: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 360,
  },

  content: {
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 32,
  },

  /**
   * HEADER NOVO
   */

  heroHeader: {
    marginBottom: 24,
  },

  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },

  heroSmallButton: {
    borderWidth: 1,
    borderColor: "rgba(228, 181, 109, 0.75)",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 9,
    backgroundColor: "rgba(8, 8, 8, 0.48)",
  },

  heroSmallButtonText: {
    color: "#E4B56D",
    fontWeight: "900",
    fontSize: 14,
  },

  heroCircleButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#E4B56D",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(8, 8, 8, 0.50)",
  },

  heroCircleButtonText: {
    color: "#F3DFC2",
    fontSize: 22,
    fontWeight: "900",
  },

  title: {
    color: "#F8F2E8",
    fontSize: 42,
    fontWeight: "900",
    letterSpacing: -1,
  },

  subtitle: {
    color: "#C4B8A8",
    marginTop: 4,
    fontSize: 16,
    lineHeight: 22,
  },

  heroIconButton: {
  width: 46,
  height: 46,
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "transparent",
  borderWidth: 0,
},

heroBackIcon: {
  width: 34,
  height: 34,
},

heroActionIcon: {
  width: 32,
  height: 32,
},

  /**
   * HEADER ANTIGO
   * Mantive para não quebrar se ainda tiver algum trecho usando.
   */

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 12,
  },

  backButton: {
    borderWidth: 1,
    borderColor: "#7E6A3A",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },

  backButtonText: {
    color: "#DCC07C",
    fontWeight: "800",
  },

  headerCopy: {
    flex: 1,
  },

  resetButton: {
    borderWidth: 1,
    borderColor: "#7E6A3A",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginLeft: 8,
    alignSelf: "center",
  },

  resetButtonText: {
    color: "#DCC07C",
    fontWeight: "800",
    fontSize: 12,
  },

  /**
   * BUSCA
   */

  searchBox: {
    marginTop: 22,
    borderWidth: 1.5,
    borderColor: "#D6A45A",
    backgroundColor: "rgba(22, 17, 12, 0.88)",
    borderRadius: 18,
    minHeight: 58,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#D6A45A",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 8,
  },

  searchIcon: {
    color: "#E4B56D",
    fontSize: 34,
    marginRight: 12,
    marginTop: -2,
  },

  searchInput: {
    flex: 1,
    color: "#EFE7DB",
    fontSize: 16,
    paddingVertical: 0,
  },

  searchSpinner: {
    marginLeft: 10,
  },

  /**
   * COLEÇÕES EM ALTA
   */

  collectionsSection: {
    marginBottom: 24,
  },

  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },

  filterTitle: {
    color: "#DCC07C",
    fontWeight: "900",
    fontSize: 18,
    marginBottom: 7,
  },

  seeAllText: {
    color: "#D6A45A",
    fontWeight: "900",
    fontSize: 16,
  },

  collectionCard: {
    width: 168,
    height: 76,
    marginRight: 16,
    alignItems: "center",
    justifyContent: "center",
  },

  collectionCardActive: {
    transform: [{ scale: 1.04 }],
  },

  collectionImage: {
    width: "100%",
    height: 68,
  },

  collectionImageFallback: {
    width: "100%",
    height: 68,
    alignItems: "center",
    justifyContent: "center",
  },

  collectionFallbackText: {
    color: "#DCC07C",
    fontSize: 12,
    fontWeight: "900",
    textAlign: "center",
  },

  collectionModalItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  collectionModalLogo: {
    width: 40,
    height: 40,
    borderRadius: 6,
    marginRight: 10,
  },

  collectionModalLogoFallback: {
    width: 40,
    height: 40,
    borderRadius: 6,
    marginRight: 10,
    backgroundColor: "rgba(214, 164, 90, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },

  /**
   * FILTROS ANTIGOS
   * Mantidos para não quebrar se ainda existir algum Dropdown antigo.
   */

  filterBlock: {
    marginBottom: 10,
  },

  filterChip: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#4E3B26",
    backgroundColor: "#130F0B",
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
  },

  filterChipText: {
    color: "#C2AE94",
    fontSize: 12,
    fontWeight: "700",
  },

  dropdownButton: {
    alignItems: "flex-start",
  },

  sortBlock: {
    marginBottom: 12,
  },

  sortChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#4E3B26",
    backgroundColor: "#130F0B",
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
  },

  sortChipActive: {
    borderColor: "#D6A45A",
    backgroundColor: "rgba(214, 164, 90, 0.18)",
  },

  sortChipText: {
    color: "#C2AE94",
    fontSize: 12,
    fontWeight: "800",
  },

  sortChipTextActive: {
    color: "#F3DFC2",
  },

  /**
   * PAINEL DE RESULTADOS
   */

  resultsImageIcon: {
  width: 42,
  height: 42,
},

resultActionImageIcon: {
  width: 22,
  height: 22,
},

  resultsPanel: {
    borderWidth: 1,
    borderColor: "rgba(228, 181, 109, 0.32)",
    backgroundColor: "rgba(12, 10, 8, 0.84)",
    borderRadius: 22,
    padding: 14,
    marginTop: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 10,
  },

  resultsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(228, 181, 109, 0.16)",
  },

  resultsTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },

  resultsIcon: {
    color: "#E4B56D",
    fontSize: 30,
    fontWeight: "900",
  },

  resultsTitle: {
    color: "#F8F2E8",
    fontSize: 18,
    fontWeight: "900",
  },

  resultsCount: {
    color: "#B8AFA4",
    fontSize: 12,
    marginTop: 2,
  },

  resultsActions: {
    flexDirection: "row",
    gap: 8,
  },

  resultActionButton: {
    borderWidth: 1,
    borderColor: "#D6A45A",
    borderRadius: 14,
    paddingHorizontal: 4,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 1,
    backgroundColor: "rgba(214, 164, 90, 0.08)",
  },

  resultActionIcon: {
    color: "#E4B56D",
    fontSize: 15,
    fontWeight: "900",
  },

  resultActionText: {
    color: "#F3DFC2",
    fontSize: 10,
    fontWeight: "900",
  },

  activeFiltersRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingTop: 12,
    marginBottom: 10,
  },

  activeFilterChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(228, 181, 109, 0.58)",
    backgroundColor: "rgba(214, 164, 90, 0.14)",
    paddingHorizontal: 12,
    paddingVertical: 7,
  },

  activeFilterChipText: {
    color: "#F3DFC2",
    fontSize: 12,
    fontWeight: "800",
  },

  /**
   * ESTADOS
   */

  stateBox: {
    borderWidth: 1,
    borderColor: "rgba(214, 164, 90, 0.28)",
    backgroundColor: "rgba(18, 13, 9, 0.94)",
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
    marginBottom: 12,
  },

  stateTitle: {
    color: "#F8E9CE",
    fontSize: 18,
    fontWeight: "900",
  },

  stateText: {
    color: "#C9BA93",
    marginTop: 6,
    lineHeight: 20,
    fontSize: 14,
  },

  primaryButton: {
    marginTop: 12,
    borderRadius: 12,
    backgroundColor: "#D6A45A",
    paddingVertical: 11,
    alignItems: "center",
  },

  primaryButtonText: {
    color: "#15100A",
    fontWeight: "900",
  },

  /**
   * GRID E CARDS
   */

 grid: {
  marginTop: 18,
  paddingBottom: 8,
},

gridRow: {
  justifyContent: "space-between",
  marginBottom: 26,
},

  cardShell: {
    width: "49%",
  },

 cardImageWrap: {
  position: "relative",
  borderRadius: 14,
  overflow: "visible",
  backgroundColor: "transparent",
},

  cardImageLarge: {
  width: "100%",
  height: 235,
  resizeMode: "contain",
  backgroundColor: "transparent",
},

  imageFallbackLarge: {
    width: "100%",
    height: 235,
    backgroundColor: "#1B140E",
    alignItems: "center",
    justifyContent: "center",
  },

  imageFallbackText: {
    color: "#9F8E78",
    fontSize: 12,
  },

  wishlistFloatingButton: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(8, 8, 8, 0.72)",
    borderWidth: 1,
    borderColor: "rgba(228, 181, 109, 0.58)",
    shadowColor: "#E4B56D",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.28,
    shadowRadius: 6,
    elevation: 6,
  },

  wishlistFloatingButtonActive: {
    backgroundColor: "rgba(228, 181, 109, 0.20)",
    borderColor: "#E4B56D",
  },

  wishlistIconImage: {
    width: 34,
    height: 34,
  },

  wishlistIconOutline: {
    tintColor: "#E4B56D",
    opacity: 0.95,
  },

  cardInfoBox: {
    paddingTop: 10,
    paddingHorizontal: 4,
    paddingBottom: 4,
  },

  cardNameCompact: {
    color: "#FBF6EF",
    fontWeight: "900",
    fontSize: 16,
  },

  cardSetCompact: {
    color: "#D8B46D",
    fontSize: 13,
    marginTop: 4,
    minHeight: 32,
  },

  cardMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
    gap: 8,
  },

  cardCodeCompact: {
    color: "#A99B8C",
    fontSize: 12,
  },

  cardTypeCompact: {
    color: "#E4B56D",
    fontSize: 10,
    fontWeight: "900",
    maxWidth: "62%",
    textAlign: "center",
    borderWidth: 1,
    borderColor: "rgba(228, 181, 109, 0.42)",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },

  /**
   * MODAIS PADRÃO
   */

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.70)",
    justifyContent: "center",
    alignItems: "center",
  },

  modalContainer: {
    width: Math.min(Dimensions.get("window").width - 40, 400),
    maxHeight: 420,
    backgroundColor: "#100B08",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(214, 164, 90, 0.22)",
  },

  modalItem: {
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.04)",
  },

  modalItemText: {
    color: "#E6DCC8",
    fontWeight: "700",
  },

  /**
   * BOTTOM SHEET FILTRO / ORDENAÇÃO
   */

  bottomSheet: {
    width: "100%",
    maxHeight: "82%",
    marginTop: "auto",
    backgroundColor: "#100B08",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 26,
    borderWidth: 1,
    borderColor: "rgba(214, 164, 90, 0.22)",
  },

  sheetHandle: {
    alignSelf: "center",
    width: 48,
    height: 5,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.18)",
    marginBottom: 14,
  },

  sheetTitle: {
    color: "#F8F2E8",
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 16,
  },

  sheetSectionTitle: {
    color: "#DCC07C",
    fontSize: 15,
    fontWeight: "900",
    marginBottom: 10,
    marginTop: 8,
  },

  optionWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 10,
  },

  optionChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#4E3B26",
    backgroundColor: "#130F0B",
    paddingHorizontal: 13,
    paddingVertical: 9,
  },

  optionChipActive: {
    borderColor: "#D6A45A",
    backgroundColor: "rgba(214, 164, 90, 0.18)",
  },

  optionChipText: {
    color: "#C2AE94",
    fontSize: 13,
    fontWeight: "800",
  },

  optionChipTextActive: {
    color: "#F3DFC2",
  },

  sheetActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },

  sheetSecondaryButton: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(228, 181, 109, 0.38)",
    paddingVertical: 12,
    alignItems: "center",
  },

  sheetSecondaryButtonText: {
    color: "#DCC07C",
    fontWeight: "900",
  },

  sheetPrimaryButton: {
  height: 50,
  borderRadius: 26,
  marginTop: 26,
  marginBottom: 10,
  backgroundColor: "#E4B56D",
  alignItems: "center",
  justifyContent: "center",
  shadowColor: "#E4B56D",
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.25,
  shadowRadius: 10,
  elevation: 6,
},

sheetPrimaryButtonText: {
  color: "#120D08",
  fontSize: 18,
  fontWeight: "900",
},
});