import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import BASE_URL from "../../apiService/api";
import { BuscarCartaPorId } from "../services/CatalogService";
import {
  BuscarWishlist,
  RemoverWishlistItem,
  UpsertWishlistItem,
} from "../services/WishlistService";
import type { Card, UsuarioApi } from "../types/explore";

const AUTH_SESSION_STORAGE_KEY = "estante:authUser:v1";

function ObterImagemAltaQualidade(imageUrl?: string) {
  const url = String(imageUrl || "").trim();

  if (!url) {
    return "";
  }

  if (url.includes("/high.png") || url.includes("/high.webp")) {
    return url;
  }

  if (url.includes("/low.png")) {
    return url.replace("/low.png", "/high.png");
  }

  if (url.includes("/low.webp")) {
    return url.replace("/low.webp", "/high.webp");
  }

  if (url.includes("/low")) {
    return url.replace(/\/low\/?$/i, "/high.png");
  }

  if (url.includes("assets.tcgdex.net") && !url.match(/\.(webp|png|jpg|jpeg)$/i)) {
    return `${url.replace(/\/$/, "")}/high.png`;
  }

  return url;
}

async function BuscarUserId() {
  const usuarioSessao = (await AsyncStorage.getItem(AUTH_SESSION_STORAGE_KEY))?.trim() || "";

  if (!usuarioSessao) {
    return "";
  }

  const resposta = await fetch(`${BASE_URL}/users?usuario=${encodeURIComponent(usuarioSessao)}`);

  if (!resposta.ok) {
    throw new Error("Falha ao carregar usuario");
  }

  const usuarios = (await resposta.json()) as UsuarioApi[];
  const usuario = usuarios.find(
    (item) => item.usuario?.toLowerCase() === usuarioSessao.toLowerCase(),
  );

  return usuario?.id === undefined || usuario?.id === null ? "" : String(usuario.id);
}

export default function CardDetailScreen() {
  const router = useRouter();
  const { cardId, origem, wishlistItemId } = useLocalSearchParams<{
    cardId?: string;
    origem?: string;
    wishlistItemId?: string;
  }>();

  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [userId, setUserId] = useState("");
  const [card, setCard] = useState<Card | null>(null);
  const [wishlistItemAtualId, setWishlistItemAtualId] = useState("");
  const [estaNaWishlist, setEstaNaWishlist] = useState(false);

  const veioDaWishlist = origem === "wishlist";

  const SincronizarWishlistDaCarta = useCallback(
    async (idUsuario: string, idCarta: string) => {
      const itensWishlist = await BuscarWishlist(idUsuario);
      const itemEncontrado = itensWishlist.find(
        (item) => String(item.cardId) === String(idCarta),
      );

      const idEncontrado =
        itemEncontrado?.id !== undefined && itemEncontrado?.id !== null
          ? String(itemEncontrado.id)
          : "";

      setWishlistItemAtualId(idEncontrado);
      setEstaNaWishlist(!!idEncontrado);

      return idEncontrado;
    },
    [],
  );

  const CarregarDetalhe = useCallback(async () => {
    setCarregando(true);

    try {
      const idUsuario = await BuscarUserId();

      if (!idUsuario) {
        Alert.alert("Sessao expirada", "Faca login novamente.");
        router.replace("/");
        return;
      }

      setUserId(idUsuario);

      if (!cardId) {
        setCard(null);
        setEstaNaWishlist(false);
        setWishlistItemAtualId("");
        return;
      }

      const detalheCarta = await BuscarCartaPorId(String(cardId));
      setCard(detalheCarta);

      if (wishlistItemId) {
        setWishlistItemAtualId(String(wishlistItemId));
        setEstaNaWishlist(true);
      }

      await SincronizarWishlistDaCarta(idUsuario, String(cardId));
    } catch (error) {
      console.log("Erro ao carregar detalhe:", error);
      Alert.alert("Erro", "Nao foi possivel carregar o detalhe da carta.");
    } finally {
      setCarregando(false);
    }
  }, [cardId, wishlistItemId, router, SincronizarWishlistDaCarta]);

  useEffect(() => {
    void CarregarDetalhe();
  }, [CarregarDetalhe]);

  const AdicionarWishlist = async () => {
    if (!userId || !card?.id) {
      Alert.alert("Erro", "Carta ou usuario invalido.");
      return;
    }

    if (estaNaWishlist) {
      return;
    }

    setSalvando(true);

    try {
      const itemCriado = await UpsertWishlistItem(userId, card.id);

      if (itemCriado?.id !== undefined && itemCriado?.id !== null) {
        setWishlistItemAtualId(String(itemCriado.id));
      } else {
        await SincronizarWishlistDaCarta(userId, card.id);
      }

      setEstaNaWishlist(true);
      Alert.alert("Wishlist", "Carta adicionada a sua Wishlist.");
    } catch (error) {
      console.log("Erro ao adicionar wishlist:", error);
      Alert.alert("Erro", "Nao foi possivel adicionar a carta a Wishlist.");
    } finally {
      setSalvando(false);
    }
  };

  const RemoverDaWishlist = async () => {
    if (!userId || !card?.id) {
      Alert.alert("Erro", "Carta ou usuario invalido.");
      return;
    }

    setSalvando(true);

    try {
      let itemId = String(wishlistItemAtualId || wishlistItemId || "").trim();

      if (!itemId) {
        itemId = await SincronizarWishlistDaCarta(userId, card.id);
      }

      if (!itemId) {
        Alert.alert("Erro", "Nao encontrei esse item na sua Wishlist.");
        return;
      }

      await RemoverWishlistItem(itemId);
      setWishlistItemAtualId("");
      setEstaNaWishlist(false);

      Alert.alert("Wishlist", "Carta removida da sua Wishlist.", [
        {
          text: "OK",
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      console.log("Erro ao remover wishlist:", error);
      Alert.alert("Erro", "Nao foi possivel remover a carta da Wishlist.");
    } finally {
      setSalvando(false);
    }
  };

  if (carregando) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator color="#E4B56D" />
        <Text style={styles.loadingText}>Carregando carta...</Text>
      </View>
    );
  }

  const imagemCarta = ObterImagemAltaQualidade(card?.imageUrl);

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
          <Text style={styles.title}>Detalhe</Text>
          <View style={styles.headerSpacer} />
        </View>

        {!card ? (
          <View style={styles.stateBox}>
            <Text style={styles.stateTitle}>Carta nao encontrada</Text>
            <Text style={styles.stateText}>Volte para Explorar e selecione outra carta.</Text>
          </View>
        ) : (
          <View style={styles.detailCard}>
            {imagemCarta ? (
              <Image
                key={imagemCarta}
                source={{ uri: imagemCarta }}
                style={styles.cardImage}
                resizeMode="contain"
              />
            ) : (
              <View style={styles.imageFallback}>
                <Text style={styles.imageFallbackText}>Sem imagem</Text>
              </View>
            )}

            <Text style={styles.cardName}>{card.nome || "Carta sem nome"}</Text>

            <InfoLinha label="Codigo" valor={card.codigo} />
            <InfoLinha label="Colecao" valor={card.colecao} />
            <InfoLinha label="Pokemon" valor={card.pokemon} />
            <InfoLinha label="Tipo" valor={card.tipo} />
            <InfoLinha label="Raridade" valor={card.raridade || "Nao informada"} />
            <InfoLinha label="Artista" valor={card.artista || "Nao informado"} />

            {veioDaWishlist ? (
              <TouchableOpacity
                style={[styles.primaryButton, styles.removeWishlistButton]}
                onPress={() => void RemoverDaWishlist()}
                disabled={salvando}
              >
                <Text style={[styles.primaryButtonText, styles.removeWishlistButtonText]}>
                  {salvando ? "Removendo..." : "Remover da Wishlist"}
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  estaNaWishlist && styles.primaryButtonWishlistActive,
                ]}
                onPress={() => void AdicionarWishlist()}
                disabled={salvando || estaNaWishlist}
              >
                <Text style={styles.primaryButtonText}>
                  {salvando
                    ? "Salvando..."
                    : estaNaWishlist
                      ? "Adicionada à Wishlist"
                      : "Adicionar à Wishlist"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>
    </LinearGradient>
  );
}

function InfoLinha({ label, valor }: { label: string; valor?: string }) {
  return (
    <View style={styles.infoBox}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{valor || "Nao informado"}</Text>
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
    justifyContent: "space-between",
    marginBottom: 16,
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
    fontSize: 22,
    fontWeight: "900",
  },
  headerSpacer: {
    width: 58,
  },
  stateBox: {
    borderWidth: 1,
    borderColor: "rgba(214, 164, 90, 0.28)",
    backgroundColor: "rgba(18, 13, 9, 0.94)",
    borderRadius: 12,
    padding: 14,
  },
  stateTitle: {
    color: "#F8E9CE",
    fontSize: 16,
    fontWeight: "900",
  },
  stateText: {
    color: "#C9BA93",
    marginTop: 6,
  },
  detailCard: {
    borderWidth: 1,
    borderColor: "rgba(214, 164, 90, 0.24)",
    backgroundColor: "rgba(18, 13, 9, 0.94)",
    borderRadius: 14,
    padding: 12,
  },
  cardImage: {
    width: "100%",
    height: 480,
    borderRadius: 12,
    backgroundColor: "#0E0A07",
    resizeMode: "contain",
  },
  imageFallback: {
    width: "100%",
    height: 260,
    borderRadius: 12,
    backgroundColor: "#1B140E",
    alignItems: "center",
    justifyContent: "center",
  },
  imageFallbackText: {
    color: "#9F8E78",
  },
  cardName: {
    color: "#FBF6EF",
    fontSize: 22,
    fontWeight: "900",
    marginTop: 12,
    marginBottom: 8,
  },
  infoBox: {
    borderWidth: 1,
    borderColor: "rgba(214, 164, 90, 0.18)",
    backgroundColor: "#130F0B",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 8,
  },
  infoLabel: {
    color: "#B39E82",
    fontSize: 11,
    fontWeight: "700",
  },
  infoValue: {
    color: "#F3DFC2",
    fontSize: 14,
    fontWeight: "800",
    marginTop: 2,
  },
  primaryButton: {
    marginTop: 14,
    borderRadius: 10,
    backgroundColor: "#7E6A3A",
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(228, 181, 109, 0.40)",
  },
  primaryButtonWishlistActive: {
    backgroundColor: "#E4B56D",
    borderColor: "#F8D894",
    shadowColor: "#E4B56D",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.24,
    shadowRadius: 10,
    elevation: 6,
  },
  removeWishlistButton: {
    borderColor: "#A63A2D",
    backgroundColor: "rgba(166, 58, 45, 0.30)",
  },
  primaryButtonText: {
    color: "#1A130A",
    fontWeight: "900",
  },
  removeWishlistButtonText: {
    color: "#F5B5AB",
  },
});
