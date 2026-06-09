import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import BASE_URL from "../../apiService/api";
import { ListarCatalogo } from "../services/CatalogService";
import { UpsertWishlistItem } from "../services/WishlistService";
import type { Card, ExploreFilter, UsuarioApi } from "../types/explore";
import { CartaAtendeFiltros, FILTRO_TODOS, OpcoesUnicas } from "../utils/BuscaUtils";

const AUTH_SESSION_STORAGE_KEY = "estante:authUser:v1";

const filtrosIniciais: ExploreFilter = {
  query: "",
  colecao: FILTRO_TODOS,
  pokemon: FILTRO_TODOS,
  tipo: FILTRO_TODOS,
};

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
  const [resultados, setResultados] = useState<Card[]>([]);
  const [filtros, setFiltros] = useState<ExploreFilter>(filtrosIniciais);
  const [salvandoCardId, setSalvandoCardId] = useState("");

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

      const cartas = await ListarCatalogo();
      setCatalogo(cartas);
      setResultados(cartas.filter((card) => CartaAtendeFiltros(card, filtrosIniciais)));
    } catch {
      setErro("Nao foi possivel carregar o catalogo.");
      setCatalogo([]);
      setResultados([]);
    } finally {
      setCarregando(false);
    }
  }, [router]);

  useEffect(() => {
    void CarregarExplorar();
  }, [CarregarExplorar]);

  useEffect(() => {
    let ativo = true;

    const AplicarFiltros = async () => {
      if (ativo) {
        setResultados(catalogo.filter((card) => CartaAtendeFiltros(card, filtros)));
      }
    };

    void AplicarFiltros();

    return () => {
      ativo = false;
    };
  }, [catalogo, filtros]);

  const opcoesColecao = useMemo(() => OpcoesUnicas(catalogo, "colecao"), [catalogo]);
  const opcoesPokemon = useMemo(() => OpcoesUnicas(catalogo, "pokemon"), [catalogo]);
  const opcoesTipo = useMemo(() => OpcoesUnicas(catalogo, "tipo"), [catalogo]);

  const AtualizarFiltro = (campo: keyof ExploreFilter, valor: string) => {
    setFiltros((atual) => ({
      ...atual,
      [campo]: valor,
    }));
  };

  const AdicionarWishlist = async (cardId: string) => {
    if (!userId) {
      Alert.alert("Sessao expirada", "Faca login novamente.");
      router.replace("/");
      return;
    }

    setSalvandoCardId(cardId);
    try {
      await UpsertWishlistItem(userId, cardId);
      Alert.alert("Wishlist", "Carta adicionada a sua Wishlist.");
    } catch {
      Alert.alert("Erro", "Nao foi possivel adicionar a carta a Wishlist.");
    } finally {
      setSalvandoCardId("");
    }
  };

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
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Voltar</Text>
          </TouchableOpacity>
          <View style={styles.headerCopy}>
            <Text style={styles.title}>Explorar</Text>
            <Text style={styles.subtitle}>Busque cartas e monte sua Wishlist.</Text>
          </View>
        </View>

        <View style={styles.searchBox}>
          <TextInput
            value={filtros.query}
            onChangeText={(valor) => AtualizarFiltro("query", valor)}
            style={styles.searchInput}
            placeholder="Nome ou codigo"
            placeholderTextColor="#9A8E80"
            autoCapitalize="none"
          />
        </View>

        <FiltroLinha titulo="Colecao" opcoes={opcoesColecao} valor={filtros.colecao} onChange={(valor) => AtualizarFiltro("colecao", valor)} />
        <FiltroLinha titulo="Pokemon" opcoes={opcoesPokemon} valor={filtros.pokemon} onChange={(valor) => AtualizarFiltro("pokemon", valor)} />
        <FiltroLinha titulo="Tipo" opcoes={opcoesTipo} valor={filtros.tipo} onChange={(valor) => AtualizarFiltro("tipo", valor)} />

        {erro ? (
          <View style={styles.stateBox}>
            <Text style={styles.stateTitle}>Catalogo indisponivel</Text>
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

        <View style={styles.grid}>
          {resultados.map((card) => (
            <View key={card.id} style={styles.card}>
              <TouchableOpacity
                onPress={() =>
                  router.push({
                    pathname: "/card-detail",
                    params: { cardId: card.id },
                  })
                }
              >
                {card.imageUrl ? (
                  <Image source={{ uri: card.imageUrl }} style={styles.cardImage} />
                ) : (
                  <View style={styles.imageFallback}>
                    <Text style={styles.imageFallbackText}>Sem imagem</Text>
                  </View>
                )}
                <Text style={styles.cardName} numberOfLines={2}>
                  {card.nome}
                </Text>
                <Text style={styles.cardMeta}>{card.codigo}</Text>
                <Text style={styles.cardMeta}>{card.colecao}</Text>
                <Text style={styles.cardBadge}>{card.pokemon} / {card.tipo}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.wishlistButton}
                onPress={() => void AdicionarWishlist(card.id)}
                disabled={salvandoCardId === card.id}
              >
                <Text style={styles.wishlistButtonText}>
                  {salvandoCardId === card.id ? "Salvando..." : "Wishlist"}
                </Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

type FiltroLinhaProps = {
  titulo: string;
  opcoes: string[];
  valor: string;
  onChange: (valor: string) => void;
};

function FiltroLinha({ titulo, opcoes, valor, onChange }: FiltroLinhaProps) {
  return (
    <View style={styles.filterBlock}>
      <Text style={styles.filterTitle}>{titulo}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {opcoes.map((opcao) => {
          const ativo = opcao === valor;
          return (
            <TouchableOpacity
              key={`${titulo}-${opcao}`}
              style={[styles.filterChip, ativo && styles.filterChipActive]}
              onPress={() => onChange(opcao)}
            >
              <Text style={[styles.filterChipText, ativo && styles.filterChipTextActive]}>
                {opcao}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
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
  content: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 32,
  },
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
  title: {
    color: "#F8F2E8",
    fontSize: 28,
    fontWeight: "900",
  },
  subtitle: {
    color: "#B8AFA4",
    marginTop: 2,
  },
  searchBox: {
    borderWidth: 1,
    borderColor: "#745437",
    backgroundColor: "rgba(20, 14, 9, 0.9)",
    borderRadius: 12,
    minHeight: 46,
    paddingHorizontal: 12,
    justifyContent: "center",
    marginBottom: 12,
  },
  searchInput: {
    color: "#EFE7DB",
    fontSize: 15,
  },
  filterBlock: {
    marginBottom: 10,
  },
  filterTitle: {
    color: "#DCC07C",
    fontWeight: "800",
    marginBottom: 7,
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
  filterChipActive: {
    borderColor: "#D6A45A",
    backgroundColor: "rgba(214, 164, 90, 0.18)",
  },
  filterChipText: {
    color: "#C2AE94",
    fontSize: 12,
    fontWeight: "700",
  },
  filterChipTextActive: {
    color: "#F3DFC2",
  },
  stateBox: {
    borderWidth: 1,
    borderColor: "rgba(214, 164, 90, 0.28)",
    backgroundColor: "rgba(18, 13, 9, 0.94)",
    borderRadius: 12,
    padding: 14,
    marginTop: 8,
    marginBottom: 12,
  },
  stateTitle: {
    color: "#F8E9CE",
    fontSize: 16,
    fontWeight: "900",
  },
  stateText: {
    color: "#C9BA93",
    marginTop: 6,
    lineHeight: 19,
  },
  primaryButton: {
    marginTop: 12,
    borderRadius: 10,
    backgroundColor: "#7E6A3A",
    paddingVertical: 10,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#1A130A",
    fontWeight: "900",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: 4,
  },
  card: {
    width: "48.5%",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(214, 164, 90, 0.24)",
    backgroundColor: "rgba(18, 13, 9, 0.94)",
    padding: 10,
    marginBottom: 10,
  },
  cardImage: {
    width: "100%",
    height: 150,
    borderRadius: 9,
    backgroundColor: "#0E0A07",
    resizeMode: "cover",
  },
  imageFallback: {
    width: "100%",
    height: 150,
    borderRadius: 9,
    backgroundColor: "#1B140E",
    alignItems: "center",
    justifyContent: "center",
  },
  imageFallbackText: {
    color: "#9F8E78",
    fontSize: 12,
  },
  cardName: {
    color: "#FBF6EF",
    fontWeight: "900",
    fontSize: 13,
    minHeight: 34,
    marginTop: 8,
  },
  cardMeta: {
    color: "#B39E82",
    fontSize: 11,
    marginTop: 3,
  },
  cardBadge: {
    color: "#E4B56D",
    fontSize: 11,
    marginTop: 6,
    fontWeight: "800",
  },
  wishlistButton: {
    marginTop: 10,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "#D6A45A",
    backgroundColor: "rgba(214, 164, 90, 0.15)",
    paddingVertical: 8,
    alignItems: "center",
  },
  wishlistButtonText: {
    color: "#F3DFC2",
    fontSize: 12,
    fontWeight: "900",
  },
});
