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
import { BuscarWishlist, RemoverWishlistItem } from "../services/WishlistService";
import { BuscarDetalheCartaTcgDex } from "../services/CatalogService";
import type { Card, WishlistItem, UsuarioApi } from "../types/explore";
import { NormalizarTexto } from "../utils/BuscaUtils";
import BASE_URL from "../../apiService/api";

const AUTH_SESSION_STORAGE_KEY = "estante:authUser:v1";

type WishlistRow = {
  item: WishlistItem;
  card: Card | null;
};

function MontarCardBaseWishlist(cardId: string): Card {
  const id = String(cardId || "").trim();
  const setId = id.includes("-") ? id.split("-")[0] : "";

  return {
    id,
    nome: "Carta desconhecida",
    pokemon: "Carta desconhecida",
    codigo: id,
    colecao: "",
    serie: "",
    tipo: "",
    raridade: "",
    imageUrl: "",
    setId,
    dataLancamento: null,
    raridadeRank: 0,
  } as Card;
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

export default function WishlistScreen() {
  const router = useRouter();
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [userId, setUserId] = useState("");
  const [wishlist, setWishlist] = useState<WishlistRow[]>([]);
  const [removendoId, setRemovendoId] = useState("");
  const [query, setQuery] = useState("");

  const carregarWishlist = useCallback(async () => {
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

    const itens = await BuscarWishlist(usuario.userId);

    const wishlistComCartas = await Promise.all(
      itens.map(async (item) => {
        try {
          const card = await BuscarDetalheCartaTcgDex(
  MontarCardBaseWishlist(item.cardId)
);

          return {
            item,
            card,
          };
        } catch (error) {
          console.log("Erro ao buscar carta da wishlist:", item.cardId, error);

          return {
            item,
            card: null,
          };
        }
      }),
    );

    setWishlist(wishlistComCartas);
  } catch (error) {
    console.log("Erro ao carregar wishlist:", error);
    setErro("Nao foi possivel carregar a wishlist.");
    setWishlist([]);
  } finally {
    setCarregando(false);
  }
}, [router]);

  useEffect(() => {
    void carregarWishlist();
  }, [carregarWishlist]);

  const filtrarWishlist = useMemo(() => {
    const termo = NormalizarTexto(query);
    return wishlist.filter(({ item, card }) => {
      if (!termo) {
        return true;
      }

      const nome = NormalizarTexto(card?.nome || "");
      const codigo = NormalizarTexto(card?.codigo || item.cardId);
const id = NormalizarTexto(item.cardId);
      const colecao = NormalizarTexto(card?.colecao || "");

      return (
  nome.includes(termo) ||
  codigo.includes(termo) ||
  id.includes(termo) ||
  colecao.includes(termo)
);
    });
  }, [query, wishlist]);

  const removerItem = async (itemId: string) => {
    setRemovendoId(itemId);

    try {
      await RemoverWishlistItem(itemId);
      setWishlist((anterior) => anterior.filter((linha) => linha.item.id !== itemId));
    } catch {
      Alert.alert("Erro", "Nao foi possivel remover o item da Wishlist.");
    } finally {
      setRemovendoId("");
    }
  };

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
          <Text style={styles.title}>Wishlist</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.searchBox}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            style={styles.searchInput}
            placeholder="Buscar na Wishlist"
            placeholderTextColor="#9A8E80"
            autoCapitalize="none"
          />
        </View>

        {erro ? (
          <View style={styles.stateBox}>
            <Text style={styles.stateTitle}>Erro ao carregar</Text>
            <Text style={styles.stateText}>{erro}</Text>
            <TouchableOpacity style={styles.primaryButton} onPress={() => void carregarWishlist()}>
              <Text style={styles.primaryButtonText}>Tentar novamente</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {carregando ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color="#E4B56D" />
            <Text style={styles.loadingText}>Carregando Wishlist...</Text>
          </View>
        ) : null}

        {!carregando && !erro && filtrarWishlist.length === 0 ? (
          <View style={styles.stateBox}>
            <Text style={styles.stateTitle}>Wishlist vazia</Text>
            <Text style={styles.stateText}>Adicione cartas a partir de Explorar para ver aqui.</Text>
          </View>
        ) : null}

        <View style={styles.grid}>
          {filtrarWishlist.map(({ item, card }) => (
            <View key={item.id} style={styles.card}>
              <TouchableOpacity
                onPress={() =>
                  router.push({
                    pathname: "/card-detail",
                    params: {
                      cardId: item.cardId,
                      origem: "wishlist",
                      wishlistItemId: item.id,
                    },
                  })
                }
              >
                {card?.imageUrl ? (
                  <Image source={{ uri: card.imageUrl }} style={styles.cardImage} />
                ) : (
                  <View style={styles.imageFallback}>
                    <Text style={styles.imageFallbackText}>Sem imagem</Text>
                  </View>
                )}
                <Text style={styles.cardName} numberOfLines={2}>
                  {card?.nome || "Carta desconhecida"}
                </Text>
                <Text style={styles.cardMeta}>{card?.codigo || item.cardId}</Text>
               <Text
  style={styles.cardBadge}
  numberOfLines={1}
  ellipsizeMode="tail"
>
  {MontarLinhaColecaoArtista(card)}
</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => void removerItem(item.id)}
                disabled={removendoId === item.id}
              >
                <Text style={styles.removeButtonText}>
                  {removendoId === item.id ? "Removendo..." : "Remover"}
                </Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

function LimitarTextoWishlist(texto: string, limite: number) {
  if (!texto) return "";

  if (texto.length <= limite) {
    return texto;
  }

  return `${texto.slice(0, Math.max(0, limite - 3))}...`;
}

function MontarLinhaColecaoArtista(card: Card | null) {
  if (!card) {
    return "Card nao encontrado";
  }

  const colecao = card.colecao || "Sem coleção";

  const artista =
    card.artista ||
    (card as any).artist ||
    (card as any).illustrator ||
    "Artista desconhecido";

  // Aqui a coleção sempre fica menor para sobrar espaço para o artista
  let limiteColecao = 20;

  if (artista.length >= 16) {
    limiteColecao = 10;
  } else if (artista.length >= 10) {
    limiteColecao = 12;
  }

  const colecaoFormatada = LimitarTextoWishlist(colecao, limiteColecao);

  return `${colecaoFormatada} • ${artista}`;
}

const styles = StyleSheet.create({
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
  title: {
    color: "#F8F2E8",
    fontSize: 28,
    fontWeight: "900",
  },
  headerSpacer: {
    flex: 1,
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
  loadingWrap: {
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginVertical: 16,
  },
  loadingText: {
    color: "#F8E9CE",
    fontWeight: "700",
  },
  stateBox: {
    borderWidth: 1,
    borderColor: "rgba(214, 164, 90, 0.28)",
    backgroundColor: "rgba(18, 13, 9, 0.94)",
    borderRadius: 12,
    padding: 14,
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
  width: "100%",
},

  cardBadgeRow: {
  flexDirection: "row",
  alignItems: "center",
  marginTop: 6,
  width: "100%",
},

cardBadgeCollection: {
  color: "#E4B56D",
  fontSize: 11,
  fontWeight: "800",
  flexShrink: 1,
  maxWidth: "58%",
},

cardBadgeSeparator: {
  color: "#E4B56D",
  fontSize: 11,
  fontWeight: "800",
},

cardBadgeName: {
  color: "#E4B56D",
  fontSize: 11,
  fontWeight: "800",
  flexShrink: 0,
  maxWidth: "42%",
},
  removeButton: {
    marginTop: 10,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "#D6A45A",
    backgroundColor: "rgba(214, 164, 90, 0.15)",
    paddingVertical: 8,
    alignItems: "center",
  },
  removeButtonText: {
    color: "#F3DFC2",
    fontSize: 12,
    fontWeight: "900",
  },
});
