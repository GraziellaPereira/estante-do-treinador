import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { safeLog } from "../utils/safeLog";
import BASE_URL from "../../apiService/api";
import {
  BuscarCartaPorCodigo,
  BuscarCartasPorColecao,
  BuscarDetalheCartaTcgDex,
} from "../services/CatalogService";
import type { Card } from "../types/explore";
import DateTimePicker from "@react-native-community/datetimepicker";

type ShelfMode = "padrao" | "todas" | "set";
type SortMode = "recentes" | "nome" | "set";
type Rarity = string;

type CardItem = {
  id: string;
  cardId?: string;
  catalogCardId?: string;
  nome: string;
  set: string;
  numero: string;
  raridade: Rarity;
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
};

type PokemonFavoritoItem = {
  nome: string;
  totalCartas: number;
  totalNaEstante: number;
  totalSets: number;
  percentualDaEstante: number;
  ultimaAtualizacao: string;
  cartas: CardItem[];
  cartaDestaque: CardItem | null;
};

type SetDashboardItem = {
  setKey: string;
  nome: string;
  setId?: string;
  logoUrl?: string;
  cartasUsuario: number;
  totalSetCards: number;
  percentualCompleto: number;
  ultimaAtualizacao: string;
  cartas: CardItem[];
};

type UserCollection = {
  id: string;
  nome: string;
  cardIds: string[];
  coverImageUrl?: string;
  createdAt: string;
};

type PhotoItem = {
  id: string;
  titulo: string;
  imageUrl: string;
};

type PhotoFolder = {
  id: string;
  nome: string;
  fotos: PhotoItem[];
};

type NewCardDraft = {
  codigo: string;
  capturadaEm: string;
};

const AUTH_SESSION_STORAGE_KEY = "estante:authUser:v1";

type ApiUser = {
  id?: string | number;
  usuario: string;
  senha: string;
};

type ApiCollection = {
  id: string;
  userId: string;
  nome: string;
  createdAt: string;
  coverImageUrl?: string;
};

type CollectionLink = {
  id: string;
  collectionId: string;
  cardId: string;
};

type ApiFolder = {
  id: string;
  userId: string;
  nome: string;
};

type ApiPhoto = {
  id: string;
  userId: string;
  folderId: string;
  titulo: string;
  imageUrl: string;
};

const DEFAULT_PHOTO_FOLDERS: PhotoFolder[] = [
  { id: "favoritas", nome: "Cartas favoritas", fotos: [] },
  { id: "binder", nome: "Binder", fotos: [] },
  { id: "outras", nome: "Outras", fotos: [] },
];

const NAV_ITEMS = [
  { key: "home", label: "Estante" },
  { key: "explorar", label: "Explorar" },
  { key: "wishlist", label: "Wishlist" },
];

const rarityOrder: Record<string, number> = {
  "Não informada": 0,
  "Sem raridade": 0,

  Comum: 10,
  Incomum: 20,
  Rara: 30,

  "Rara Dupla": 40,
  "Rara ACE SPEC": 50,

  "Ultra Rara": 60,
  "Rara Ultra": 60,

  "Ilustração Rara": 70,
  "Ilustração Rara Especial": 80,

  "Rara Hiper": 90,
  "Rara Secreta": 90,
  Dourada: 90,

  Promo: 95,
};

const emptyDraft: NewCardDraft = {
  codigo: "",
  capturadaEm: "",
};

function NormalizarTextoHome(valor?: string) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function ConverterRaridadeHome(raridade?: string): Rarity {
  const r = String(raridade || "").toLowerCase();

  if (r.includes("promo")) return "Promo";
  if (r.includes("ultra")) return "Ultra Rara";
  if (r.includes("rare") || r.includes("rara") || r.includes("holo")) return "Rara";
  if (r.includes("uncommon") || r.includes("incomum")) return "Incomum";
  if (r.includes("common") || r.includes("comum")) return "Comum";

  return "Comum";
}

function ObterRankRaridadeHome(raridade?: string) {
  const r = NormalizarTextoHome(raridade || "");

  if (!r || r.includes("sem raridade") || r.includes("nao informada")) {
    return 0;
  }

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

  if (
    r.includes("special illustration rare") ||
    r.includes("special illustration") ||
    r.includes("ilustracao rara especial") ||
    r.includes("ilustracao especial")
  ) {
    return 80;
  }

  if (
    r.includes("illustration rare") ||
    r.includes("illustration") ||
    r.includes("ilustracao rara") ||
    r.includes("ilustracao")
  ) {
    return 70;
  }

  if (
    r.includes("ultra rare") ||
    r.includes("rara ultra") ||
    r.includes("ultra")
  ) {
    return 60;
  }

  if (
    r.includes("ace spec") ||
    r.includes("acespec") ||
    r.includes("ace")
  ) {
    return 50;
  }

  if (
    r.includes("double rare") ||
    r.includes("rara dupla") ||
    r.includes("dupla")
  ) {
    return 40;
  }

  if (
    r.includes("rare") ||
    r.includes("rara") ||
    r.includes("holo")
  ) {
    return 30;
  }

  if (
    r.includes("uncommon") ||
    r.includes("incomum")
  ) {
    return 20;
  }

  if (
    r.includes("common") ||
    r.includes("comum")
  ) {
    return 10;
  }

  if (r.includes("promo")) {
    return 95;
  }

  return rarityOrder[raridade || ""] || 0;
}

function ObterImagemAltaHome(imageUrl?: string) {
  const url = String(imageUrl || "").trim();

  if (!url) return "";

  if (url.includes("/high.png") || url.includes("/high.webp")) {
    return url;
  }

  if (url.includes("/low.png")) {
    return url.replace("/low.png", "/high.png");
  }

  if (url.includes("/low.webp")) {
    return url.replace("/low.webp", "/high.webp");
  }

  if (url.includes("assets.tcgdex.net") && !url.match(/\.(webp|png|jpg|jpeg)$/i)) {
    return `${url.replace(/\/$/, "")}/high.png`;
  }

  return url;
}

function NormalizarImagemSetTcgDex(url?: string) {
  const cleanUrl = String(url || "").trim();

  if (!cleanUrl) {
    return "";
  }

  if (cleanUrl.match(/\.(webp|png|jpg|jpeg)$/i)) {
    return cleanUrl;
  }

  return `${cleanUrl.replace(/\/$/, "")}.png`;
}

function ObterLogoSetHome(carta: any) {
  return NormalizarImagemSetTcgDex(
    carta?.setLogoUrl ||
      carta?.logoUrl ||
      carta?.logo ||
      carta?.set?.logo ||
      carta?.set?.symbol ||
      "",
  );
}

function InferirLogoSetPelaImagemCarta(imageUrl?: string) {
  const url = String(imageUrl || "").trim();

  if (!url.includes("assets.tcgdex.net")) {
    return "";
  }

  // Exemplo:
  // https://assets.tcgdex.net/pt/me/me04/090/high.png
  // vira:
  // https://assets.tcgdex.net/pt/me/me04/logo.png
  const match = url.match(
    /^(https:\/\/assets\.tcgdex\.net\/[^/]+\/[^/]+\/[^/]+)\/[^/]+\/(?:high|low)\.(png|webp|jpg|jpeg)$/i,
  );

  if (!match?.[1]) {
    return "";
  }

  return `${match[1]}/logo.png`;
}

function ResolverLogoSetHome(cartasDoSet: CardItem[]) {
  const cartaComLogo = cartasDoSet.find((card) => !!card.setLogoUrl);

  if (cartaComLogo?.setLogoUrl) {
    return NormalizarImagemSetTcgDex(cartaComLogo.setLogoUrl);
  }

  const cartaComImagemTcgDex = cartasDoSet.find((card) =>
    String(card.imageUrl || "").includes("assets.tcgdex.net"),
  );

  return InferirLogoSetPelaImagemCarta(cartaComImagemTcgDex?.imageUrl);
}

function ObterSetIdPelaImagemHome(imageUrl?: string) {
  const url = String(imageUrl || "").trim();

  const match = url.match(
    /assets\.tcgdex\.net\/[^/]+\/[^/]+\/([^/]+)/i,
  );

  return match?.[1] || "";
}

function ObterSetIdHome(carta: any) {
  return String(
    carta?.setId ||
      carta?.set?.id ||
      ObterSetIdPelaImagemHome(carta?.imageUrl) ||
      "",
  ).trim();
}

function ObterChaveSetHome(card: CardItem) {
  return String(
    card.setId ||
      ObterSetIdPelaImagemHome(card.imageUrl) ||
      card.set ||
      "sem-set",
  ).trim();
}

async function BuscarTotalRealSetHome(card: CardItem) {
  const setId = String(
    card.setId ||
      ObterSetIdPelaImagemHome(card.imageUrl) ||
      "",
  ).trim();

  if (!setId) {
    return 0;
  }

  try {
    const cartasDoSet = await BuscarCartasPorColecao(setId);

    return Array.isArray(cartasDoSet) ? cartasDoSet.length : 0;
  } catch (error) {
    safeLog("Erro ao buscar total real do set na Home:", {
      setId,
      set: card.set,
      error,
    });

    return 0;
  }
}

function ObterTotalSetCardsHome(carta: any, codigoCard: string) {
  return (
    Number(carta?.totalSetCards) ||
    Number(carta?.set?.cardCount?.total) ||
    Number(carta?.cardCount?.total) ||
    Number(carta?.set?.cardCount?.official) ||
    Number(carta?.cardCount?.official) ||
    ObterTotalSetPeloCodigo(carta?.codigo || codigoCard)
  );
}

function LimparNomePokemonHome(nomeCarta: string) {
  const nomeOriginal = String(nomeCarta || "").trim();

  if (!nomeOriginal) {
    return "Desconhecido";
  }

  const nomeLimpo = nomeOriginal
    .replace(/\s*\([^)]*\)/g, "")
    .replace(/^M\s+/i, "")
    .replace(/\b(ex|gx|vmax|vstar|v-union|v|mega|break|radiant|radiante)\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  return nomeLimpo || nomeOriginal;
}

function MontarPokemonFavorito(
  cards: CardItem[],
  sessionSeed: number,
): PokemonFavoritoItem | null {
  if (cards.length === 0) {
    return null;
  }

  const mapa = new Map<string, CardItem[]>();

  for (const card of cards) {
    const nomePokemon = LimparNomePokemonHome(card.nome);
    const chave = nomePokemon.toLowerCase();

    if (!mapa.has(chave)) {
      mapa.set(chave, []);
    }

    mapa.get(chave)!.push(card);
  }

  const grupos = Array.from(mapa.entries())
    .map(([_, cartasDoPokemon]) => {
      const cartasOrdenadas = [...cartasDoPokemon].sort(
        (a, b) => Date.parse(b.capturadaEm) - Date.parse(a.capturadaEm),
      );

      const nome = LimparNomePokemonHome(cartasOrdenadas[0]?.nome || "");
      const totalCartas = cartasDoPokemon.length;
      const totalSets = new Set(
        cartasDoPokemon.map((card) => card.set).filter(Boolean),
      ).size;

      const percentualDaEstante = Math.round((totalCartas / cards.length) * 100);

      const indiceDestaque =
        cartasOrdenadas.length > 0 ? sessionSeed % cartasOrdenadas.length : 0;

      return {
        nome,
        totalCartas,
        totalNaEstante: cards.length,
        totalSets,
        percentualDaEstante,
        ultimaAtualizacao: cartasOrdenadas[0]?.capturadaEm || "",
        cartas: cartasOrdenadas,
        cartaDestaque: cartasOrdenadas[indiceDestaque] || null,
      };
    })
    .sort((a, b) => {
      if (b.totalCartas !== a.totalCartas) {
        return b.totalCartas - a.totalCartas;
      }

      return Date.parse(b.ultimaAtualizacao) - Date.parse(a.ultimaAtualizacao);
    });

  return grupos[0] || null;
}

function FormatarDataHome(dataIso?: string) {
  if (!dataIso) {
    return "Não informada";
  }

  const data = new Date(dataIso);

  if (Number.isNaN(data.getTime())) {
    return "Não informada";
  }

  return data.toLocaleDateString("pt-BR");
}

function ObterTotalSetPeloCodigo(numero?: string) {
  const partes = String(numero || "").split("/");

  if (partes.length < 2) {
    return 0;
  }

  const total = Number(partes[1].replace(/\D/g, ""));

  return Number.isNaN(total) ? 0 : total;
}

function MontarDashboardSets(
  cards: CardItem[],
  totaisReaisPorSet: Record<string, number> = {},
): SetDashboardItem[] {
  const mapa = new Map<string, CardItem[]>();

  for (const card of cards) {
    const chave = ObterChaveSetHome(card);

    if (!mapa.has(chave)) {
      mapa.set(chave, []);
    }

    mapa.get(chave)!.push(card);
  }

  return Array.from(mapa.entries())
    .map(([setKey, cartasDoSet]) => {
      const primeira = cartasDoSet[0];

      const totalSetCardsApi = Number(totaisReaisPorSet[setKey] || 0);

      const totalSetCardsSalvo = Math.max(
        ...cartasDoSet.map((card) => Number(card.totalSetCards || 0)),
        0,
      );

      const totalSetCardsPeloCodigo = Math.max(
        ...cartasDoSet.map((card) => ObterTotalSetPeloCodigo(card.numero)),
        0,
      );

      const totalSetCards =
        totalSetCardsApi || totalSetCardsSalvo || totalSetCardsPeloCodigo;

      const cartasUsuario = cartasDoSet.length;

      const percentualCompleto =
        totalSetCards > 0
          ? Math.round((cartasUsuario / totalSetCards) * 100)
          : 0;

      const cartasOrdenadas = [...cartasDoSet].sort(
        (a, b) => Date.parse(b.capturadaEm) - Date.parse(a.capturadaEm),
      );

      return {
        setKey,
        nome: primeira?.set || "Set sem nome",
        setId: primeira?.setId || ObterSetIdPelaImagemHome(primeira?.imageUrl),
        logoUrl: ResolverLogoSetHome(cartasDoSet),
        cartasUsuario,
        totalSetCards,
        percentualCompleto,
        ultimaAtualizacao: cartasOrdenadas[0]?.capturadaEm || "",
        cartas: cartasOrdenadas,
      };
    })
    .sort((a, b) => {
      if (b.cartasUsuario !== a.cartasUsuario) {
        return b.cartasUsuario - a.cartasUsuario;
      }

      return b.percentualCompleto - a.percentualCompleto;
    });
}

function HomeDashboardCard({
  pokemon,
  totalCartas,
  totalColecoes,
  totalSets,
  onPressPokemon,
}: {
  pokemon: PokemonFavoritoItem | null;
  totalCartas: number;
  totalColecoes: number;
  totalSets: number;
  onPressPokemon: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.dashboardCard}
      activeOpacity={0.9}
      onPress={onPressPokemon}
    >
      <View style={styles.dashboardLeft}>
        <Text style={styles.dashboardLabel}>Dashboard</Text>

        <Text style={styles.dashboardSmallLabel}>Pokémon favorito</Text>

        <Text style={styles.dashboardPokemonName} numberOfLines={1}>
          {pokemon?.nome || "Nenhum ainda"}
        </Text>

        <View style={styles.dashboardStatsGrid}>
          <View style={styles.dashboardStatBox}>
            <Text style={styles.dashboardStatNumber}>
              {pokemon?.totalCartas || 0}
            </Text>
            <Text style={styles.dashboardStatLabel}>Cartas de {pokemon?.nome || "Pokémon"}</Text>
          </View>

          <View style={styles.dashboardStatBox}>
            <Text style={styles.dashboardStatNumber}>{totalCartas}</Text>
            <Text style={styles.dashboardStatLabel}>Cartas na estante</Text>
          </View>

          <View style={styles.dashboardStatBox}>
            <Text style={styles.dashboardStatNumber}>{totalColecoes}</Text>
            <Text style={styles.dashboardStatLabel}>Coleções criadas</Text>
          </View>

          <View style={styles.dashboardStatBox}>
            <Text style={styles.dashboardStatNumber}>{totalSets}</Text>
            <Text style={styles.dashboardStatLabel}>Sets</Text>
          </View>
        </View>
      </View>

      <View style={styles.dashboardPokemonImageWrap}>
        {pokemon?.cartaDestaque?.imageUrl ? (
          <Image
            source={{ uri: pokemon.cartaDestaque.imageUrl }}
            style={styles.dashboardPokemonImage}
            resizeMode="contain"
          />
        ) : (
          <View style={styles.dashboardPokemonFallback}>
            <Text style={styles.dashboardPokemonFallbackText}>?</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

function SetDestaqueCard({
  setItem,
  onPressVerMais,
}: {
  setItem: SetDashboardItem | null;
  onPressVerMais: () => void;
}) {
  if (!setItem) {
    return (
      <View style={styles.featuredSetCard}>
        <Text style={styles.featuredSetLabel}>Set em destaque</Text>
        <Text style={styles.featuredSetName}>Nenhum set ainda</Text>
        <Text style={styles.featuredSetMeta}>
          Adicione cartas para acompanhar seu progresso.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.featuredSetCard}>
      <View style={styles.featuredSetHeader}>
        <View style={styles.featuredSetInfo}>
          <Text style={styles.featuredSetLabel}>Set em destaque</Text>
          <Text style={styles.featuredSetName} numberOfLines={1}>
            {setItem.nome}
          </Text>

          <Text style={styles.featuredSetMeta}>
            {setItem.cartasUsuario}/{setItem.totalSetCards || "?"} cartas
          </Text>

          <Text style={styles.featuredSetDate}>
            Última atualização: {FormatarDataHome(setItem.ultimaAtualizacao)}
          </Text>
        </View>

        <View style={styles.featuredSetLogoBox}>
          {setItem.logoUrl ? (
            <Image
              source={{ uri: setItem.logoUrl }}
              style={styles.featuredSetLogo}
              resizeMode="contain"
            />
          ) : (
            <Text style={styles.featuredSetLogoFallback}>SET</Text>
          )}
        </View>
      </View>

      <View style={styles.featuredSetProgressRow}>
        <Text style={styles.featuredSetPercent}>
          {setItem.percentualCompleto}%
        </Text>

        <View style={styles.featuredSetProgressTrack}>
          <View
            style={[
              styles.featuredSetProgressFill,
              { width: `${Math.max(5, setItem.percentualCompleto)}%` },
            ]}
          />
        </View>
      </View>

      <TouchableOpacity style={styles.featuredSetButton} onPress={onPressVerMais}>
        <Text style={styles.featuredSetButtonText}>Ver mais sets</Text>
        <Text style={styles.featuredSetButtonIcon}>›</Text>
      </TouchableOpacity>
    </View>
  );
}

function SetsDashboardModal({
  visible,
  sets,
  onClose,
  onOpenSet,
}: {
  visible: boolean;
  sets: SetDashboardItem[];
  onClose: () => void;
  onOpenSet: (setName: string) => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.setsModalOverlay}>
        <View style={styles.setsModalCard}>
          <View style={styles.setsModalHeader}>
            <View>
              <Text style={styles.setsModalTitle}>Todos os sets</Text>
              <Text style={styles.setsModalSubtitle}>
                {sets.length} set{sets.length === 1 ? "" : "s"} em progresso
              </Text>
            </View>

            <TouchableOpacity onPress={onClose} style={styles.setsModalCloseButton}>
              <Text style={styles.setsModalCloseText}>Fechar</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {sets.map((setItem) => (
              <View key={setItem.setKey} style={styles.setsListCard}>
                <View style={styles.setsListHeader}>
                  <View style={styles.setsListInfo}>
                    <Text style={styles.setsListLabel}>Set</Text>

                    <Text style={styles.setsListName} numberOfLines={1}>
                      {setItem.nome}
                    </Text>

                    <Text style={styles.setsListMeta}>
                      {setItem.cartasUsuario}/{setItem.totalSetCards || "?"} cartas
                    </Text>

                    <Text style={styles.setsListDate}>
                      Última atualização: {FormatarDataHome(setItem.ultimaAtualizacao)}
                    </Text>
                  </View>

                  <View style={styles.setsListLogoBox}>
                    {setItem.logoUrl ? (
                      <Image
                        source={{ uri: setItem.logoUrl }}
                        style={styles.setsListLogo}
                        resizeMode="contain"
                      />
                    ) : (
                      <Text style={styles.setsListLogoFallback}>SET</Text>
                    )}
                  </View>
                </View>

                <View style={styles.setsListProgressRow}>
                  <Text style={styles.setsListPercent}>
                    {setItem.percentualCompleto}%
                  </Text>

                  <View style={styles.setsListProgressTrack}>
                    <View
                      style={[
                        styles.setsListProgressFill,
                        {
                          width: `${Math.max(
                            5,
                            Math.min(100, setItem.percentualCompleto),
                          )}%`,
                        },
                      ]}
                    />
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.setsListButton}
                  onPress={() => onOpenSet(setItem.nome)}
                >
                  <Text style={styles.setsListButtonText}>Ver cartas desse set</Text>
                  <Text style={styles.setsListButtonIcon}>›</Text>
                </TouchableOpacity>
              </View>
            ))}

            {sets.length === 0 && (
              <Text style={styles.emptyText}>
                Nenhum set encontrado na sua estante.
              </Text>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function CollectionTrapezoidCover({
  images,
  customCoverUrl,
}: {
  images: string[];
  customCoverUrl?: string;
}) {
  if (customCoverUrl) {
    return (
      <Image
        source={{ uri: customCoverUrl }}
        style={styles.collectionTrapezoidCustomCover}
        resizeMode="cover"
      />
    );
  }

  const safeImages = images.slice(0, 3);

  while (safeImages.length < 3) {
    safeImages.push("");
  }

  return (
    <View style={styles.collectionTrapezoidWrap}>
      {safeImages.map((uri, index) => (
        <View
          key={`${uri}-${index}`}
          style={[
            styles.collectionTrapezoidSlice,
            index === 0 && styles.collectionTrapezoidLeft,
            index === 1 && styles.collectionTrapezoidCenter,
            index === 2 && styles.collectionTrapezoidRight,
          ]}
        >
          {uri ? (
            <Image
              source={{ uri }}
              style={styles.collectionTrapezoidImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.collectionTrapezoidEmpty} />
          )}
        </View>
      ))}
    </View>
  );
}

function FormatarDataInputHome(dataIso?: string) {
  if (!dataIso) {
    return "";
  }

  const [ano, mes, dia] = dataIso.split("-");

  if (!ano || !mes || !dia) {
    return dataIso;
  }

  return `${dia}/${mes}/${ano}`;
}

export default function HomeScreen() {
  const { nome } = useLocalSearchParams<{ nome: string }>();
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [authUserName, setAuthUserName] = useState("");
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [remoteLoaded, setRemoteLoaded] = useState(false);
  const userName = authUserName || "Treinador";

  const [mode, setMode] = useState<ShelfMode>("padrao");
  const [sortMode, setSortMode] = useState<SortMode>("recentes");
  const [query, setQuery] = useState("");
  const [selectedSet, setSelectedSet] = useState("Todos");
  const [rarityFilter, setRarityFilter] = useState<Rarity | "Todas">("Todas");

  const [cards, setCards] = useState<CardItem[]>([]);
  const [collections, setCollections] = useState<UserCollection[]>([]);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [selectedCollectionId, setSelectedCollectionId] = useState<
    string | null
  >(null);
  const [collectionSearch, setCollectionSearch] = useState("");
  const [isCreateCollectionModalOpen, setIsCreateCollectionModalOpen] =
    useState(false);

  const [isAddCardModalOpen, setIsAddCardModalOpen] = useState(false);
  const [newCardDraft, setNewCardDraft] = useState<NewCardDraft>(emptyDraft);
  const [buscandoCarta, setBuscandoCarta] = useState(false);
  const [salvandoCarta, setSalvandoCarta] = useState(false);
  const [mensagemAddCard, setMensagemAddCard] = useState("");
  const [cartaEncontrada, setCartaEncontrada] = useState<Card | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [folderSearch, setFolderSearch] = useState('');
  const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(false);
  const [photoFolders, setPhotoFolders] = useState<PhotoFolder[]>(
    DEFAULT_PHOTO_FOLDERS,
  );
  const [newFolderName, setNewFolderName] = useState("");
  const [pendingPhotoToName, setPendingPhotoToName] = useState<{
    folderId: string;
    imageUrl: string;
  } | null>(null);
  const [pendingPhotoTitle, setPendingPhotoTitle] = useState("");
  const [photoPreview, setPhotoPreview] = useState<{
    folderId: string;
    photo: PhotoItem;
  } | null>(null);
  const [photoRenameTarget, setPhotoRenameTarget] = useState<{
    folderId: string;
    photoId: string;
  } | null>(null);
  const [photoRenameValue, setPhotoRenameValue] = useState("");
  const [selectedCard, setSelectedCard] = useState<CardItem | null>(null);

  const [favoriteSessionSeed, setFavoriteSessionSeed] = useState(Date.now());
  const [isSetsModalOpen, setIsSetsModalOpen] = useState(false);

  const [totaisReaisPorSet, setTotaisReaisPorSet] = useState<
  Record<string, number>
>({});

  useEffect(() => {
    const validateSession = async () => {
      const routeUser = (nome || "").trim();
      try {
        if (routeUser) {
          setAuthUserName(routeUser);
          await AsyncStorage.setItem(AUTH_SESSION_STORAGE_KEY, routeUser);
          return;
        }

        const savedUser =
          (await AsyncStorage.getItem(AUTH_SESSION_STORAGE_KEY)) || "";
        const normalizedSavedUser = savedUser.trim();
        if (normalizedSavedUser) {
          setAuthUserName(normalizedSavedUser);
          return;
        }

        Alert.alert(
          "Sessão expirada",
          "Nenhum login salvo foi encontrado. Faça login novamente.",
        );
        router.replace("/");
      } finally {
        setAuthChecked(true);
      }
    };

    validateSession();
  }, [nome, router]);

  useEffect(() => {
  let cancelado = false;

  const carregarTotaisReaisDosSets = async () => {
    if (cards.length === 0) {
      setTotaisReaisPorSet({});
      return;
    }

    const grupos = new Map<string, CardItem[]>();

    for (const card of cards) {
      const chave = ObterChaveSetHome(card);

      if (!grupos.has(chave)) {
        grupos.set(chave, []);
      }

      grupos.get(chave)!.push(card);
    }

    const proximosTotais: Record<string, number> = {};

    for (const [setKey, cartasDoSet] of grupos.entries()) {
      const primeiraCarta = cartasDoSet[0];

      if (!primeiraCarta) {
        continue;
      }

      const totalReal = await BuscarTotalRealSetHome(primeiraCarta);

      if (totalReal > 0) {
        proximosTotais[setKey] = totalReal;
        continue;
      }

      const totalSalvo = Math.max(
        ...cartasDoSet.map((card) => Number(card.totalSetCards || 0)),
        0,
      );

      if (totalSalvo > 0) {
        proximosTotais[setKey] = totalSalvo;
      }
    }

    if (!cancelado) {
      setTotaisReaisPorSet(proximosTotais);
    }
  };

  void carregarTotaisReaisDosSets();

  return () => {
    cancelado = true;
  };
}, [cards]);

  useEffect(() => {
    const loadUserState = async () => {
      if (!authUserName) {
        setRemoteLoaded(false);
        return;
      }

      setRemoteLoaded(false);

      try {
        const resposta = await fetch(
          `${BASE_URL}/users?usuario=${encodeURIComponent(authUserName)}`,
        );

        if (!resposta.ok) {
          throw new Error("Falha ao carregar dados do usuário");
        }

        const usuarios = (await resposta.json()) as ApiUser[];
        const usuario = usuarios.find(
          (item) => item.usuario?.toLowerCase() === authUserName.toLowerCase(),
        );

        if (!usuario || usuario.id === undefined || usuario.id === null) {
          Alert.alert(
            "Sessão inválida",
            "Usuário não encontrado. Faça login novamente.",
          );
          router.replace("/");
          return;
        }

        const userId = String(usuario.id);
        setAuthUserId(userId);
        setFavoriteSessionSeed(Date.now());

        const [cardsRes, collectionsRes, linksRes, foldersRes, photosRes] =
          await Promise.all([
            fetch(`${BASE_URL}/cards?userId=${encodeURIComponent(userId)}`),
            fetch(
              `${BASE_URL}/collections?userId=${encodeURIComponent(userId)}`,
            ),
            fetch(`${BASE_URL}/collectionCards`),
            fetch(`${BASE_URL}/folders?userId=${encodeURIComponent(userId)}`),
            fetch(`${BASE_URL}/photos?userId=${encodeURIComponent(userId)}`),
          ]);

        if (
          !cardsRes.ok ||
          !collectionsRes.ok ||
          !linksRes.ok ||
          !foldersRes.ok ||
          !photosRes.ok
        ) {
          throw new Error("Falha ao carregar recursos do usuário");
        }

        const parsedCards = (await cardsRes.json()) as CardItem[];
        const apiCollections = (await collectionsRes.json()) as ApiCollection[];
        const collectionLinks = (await linksRes.json()) as CollectionLink[];
        const apiFolders = (await foldersRes.json()) as ApiFolder[];
        const apiPhotos = (await photosRes.json()) as ApiPhoto[];

        const missingDefaultFolders = DEFAULT_PHOTO_FOLDERS.filter(
          (defaultFolder) =>
            !apiFolders.some(
              (folder) =>
                folder.nome.trim().toLowerCase() ===
                defaultFolder.nome.trim().toLowerCase(),
            ),
        );

        const createdDefaultFolders: ApiFolder[] = [];
        await Promise.all(
          missingDefaultFolders.map(async (defaultFolder) => {
            const defaultFolderId = `folder-${userId}-${defaultFolder.id}`;
            const createFolderRes = await fetch(`${BASE_URL}/folders`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                id: defaultFolderId,
                userId,
                nome: defaultFolder.nome,
              }),
            });

            if (createFolderRes.ok) {
              createdDefaultFolders.push({
                id: defaultFolderId,
                userId,
                nome: defaultFolder.nome,
              });
            }
          }),
        );

        const mergedApiFolders = [...apiFolders, ...createdDefaultFolders];

        const parsedCollections: UserCollection[] = apiCollections.map(
          (collection) => ({
            id: collection.id,
            nome: collection.nome,
            createdAt: collection.createdAt,
            coverImageUrl: collection.coverImageUrl,
            cardIds: collectionLinks
              .filter((link) => link.collectionId === collection.id)
              .map((link) => link.cardId),
          }),
        );

        const defaultFolderOrder = new Map(
          DEFAULT_PHOTO_FOLDERS.map((folder, index) => [
            folder.nome.toLowerCase(),
            index,
          ]),
        );

        const parsedFolders: PhotoFolder[] = mergedApiFolders
          .map((folder) => ({
            id: folder.id,
            nome: folder.nome,
            fotos: apiPhotos
              .filter((photo) => photo.folderId === folder.id)
              .map((photo) => ({
                id: photo.id,
                titulo: photo.titulo,
                imageUrl: photo.imageUrl,
              })),
          }))
          .sort((a, b) => {
            const aOrder = defaultFolderOrder.get(a.nome.toLowerCase());
            const bOrder = defaultFolderOrder.get(b.nome.toLowerCase());

            if (aOrder !== undefined && bOrder !== undefined) {
              return aOrder - bOrder;
            }
            if (aOrder !== undefined) {
              return -1;
            }
            if (bOrder !== undefined) {
              return 1;
            }
            return a.nome.localeCompare(b.nome);
          });

        setCards(parsedCards);
        setCollections(parsedCollections);
        setPhotoFolders(parsedFolders);
      } catch {
        Alert.alert(
          "Erro",
          "Não foi possível carregar os dados da sua estante.",
        );
      } finally {
        setRemoteLoaded(true);
      }
    };

    loadUserState();
  }, [authUserName, router]);

  const uniqueSets = useMemo(() => {
    return [
      "Todos",
      ...Array.from(new Set(cards.map((card) => card.set))).filter(Boolean),
    ];
  }, [cards]);


  
  const filteredCards = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    let list = cards.filter((card) => {
      const matchesQuery =
        !normalizedQuery ||
        card.nome.toLowerCase().includes(normalizedQuery) ||
        card.numero.toLowerCase().includes(normalizedQuery) ||
        card.raridade.toLowerCase().includes(normalizedQuery);

      const matchesSet = selectedSet === "Todos" || card.set === selectedSet;
      const matchesRarity =
        rarityFilter === "Todas" || card.raridade === rarityFilter;

      return matchesQuery && matchesSet && matchesRarity;
    });

    if (sortMode === "recentes") {
      list = [...list].sort((a, b) =>
        b.capturadaEm.localeCompare(a.capturadaEm),
      );
    }
    if (sortMode === "nome") {
      list = [...list].sort((a, b) => a.nome.localeCompare(b.nome));
    }
    if (sortMode === "set") {
      list = [...list].sort(
        (a, b) => a.set.localeCompare(b.set) || a.nome.localeCompare(b.nome),
      );
    }

    return list;
  }, [cards, query, selectedSet, rarityFilter, sortMode]);

  const cardsRecentes = useMemo(() => {
    return [...cards]
      .sort((a, b) => b.capturadaEm.localeCompare(a.capturadaEm))
      .slice(0, 8);
  }, [cards]);

  const pokemonFavorito = useMemo(() => {
  return MontarPokemonFavorito(cards, favoriteSessionSeed);
}, [cards, favoriteSessionSeed]);

const dashboardSets = useMemo(() => {
  return MontarDashboardSets(cards, totaisReaisPorSet);
}, [cards, totaisReaisPorSet]);

const setDestaque = dashboardSets[0] || null;

  const sectionsBySet = useMemo(() => {
    return uniqueSets
      .filter((setName) => setName !== "Todos")
      .map((setName) => ({
        nome: setName,
        cards: filteredCards.filter((card) => card.set === setName),
      }))
      .filter((section) => section.cards.length > 0);
  }, [filteredCards, uniqueSets]);

  const selectedCollection = useMemo(() => {
    return collections.find((c) => c.id === selectedCollectionId) || null;
  }, [collections, selectedCollectionId]);

  const selectedCollectionCards = useMemo(() => {
    if (!selectedCollection) {
      return [];
    }
    const cardMap = new Map(cards.map((card) => [card.id, card]));
    return selectedCollection.cardIds
      .map((id) => cardMap.get(id))
      .filter(Boolean) as CardItem[];
  }, [cards, selectedCollection]);

  const cardsById = useMemo(
    () => new Map(cards.map((card) => [card.id, card])),
    [cards],
  );

  const filteredCollections = useMemo(() => {
    const q = collectionSearch.trim().toLowerCase();
    if (!q) {
      return collections;
    }
    return collections.filter((c) => c.nome.toLowerCase().includes(q));
  }, [collectionSearch, collections]);

  const filteredPhotoFolders = useMemo(() => {
    const q = folderSearch.trim().toLowerCase();
    if (!q) {
      return photoFolders;
    }
    return photoFolders.filter((f) => f.nome.toLowerCase().includes(q));
  }, [folderSearch, photoFolders]);

  const pickImageFromGallery = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Permissão necessária",
        "Permita acesso à galeria para selecionar uma imagem.",
      );
      return null;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.8,
    });

    if (result.canceled) {
      return null;
    }

    return result.assets[0].uri;
  };

  const pickImageFromCamera = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Permissão necessária",
        "Permita acesso à camera para tirar uma foto.",
      );
      return null;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.8,
    });
    if (result.canceled) {
      return null;
    }

    return result.assets[0].uri;
  };

  const handleSelecionarDataCaptura = (_event: any, selectedDate?: Date) => {
  setShowDatePicker(false);

  if (!selectedDate) {
    return;
  }

  const dataFormatada = selectedDate.toISOString().slice(0, 10);

  setNewCardDraft((prev) => ({
    ...prev,
    capturadaEm: dataFormatada,
  }));
};

  const handleDateInputChange = (e: any) => {
    const value = e?.target?.value;
    if (!value) return;
    setNewCardDraft((prev) => ({ ...prev, capturadaEm: value }));
    setShowDatePicker(false);
  };
  const handleSaveCard = async () => {
  if (salvandoCarta || buscandoCarta) {
    return;
  }

  setMensagemAddCard("");

  const codigoCard = newCardDraft.codigo.trim();
  const capturadaEmDate = newCardDraft.capturadaEm.trim();

  if (!codigoCard || !capturadaEmDate) {
    Alert.alert(
      "Campos obrigatórios",
      "Informe o código da carta e a data de captura.",
    );
    return;
  }

  const parsedDate = new Date(`${capturadaEmDate}T12:00:00`);

  if (Number.isNaN(parsedDate.getTime())) {
    Alert.alert("Data inválida", "Use o formato AAAA-MM-DD.");
    return;
  }

  if (!authUserId) {
    Alert.alert("Erro", "Usuário não identificado para salvar carta.");
    return;
  }

  setSalvandoCarta(true);
  setMensagemAddCard("Salvando carta...");

  try {
    const carta = cartaEncontrada || (await handleBuscarCartaPorCodigo());

    if (!carta) {
      setMensagemAddCard("Busque uma carta válida antes de salvar.");
      return;
    }

    const catalogCardId = String(carta.id || "").trim();
    const numeroCarta = String(carta.codigo || codigoCard).trim();

    const cardExists = cards.some((card) => {
      const mesmoCatalogo =
        String(card.catalogCardId || card.cardId || "") === catalogCardId;
      const mesmoNumero =
        String(card.numero || "").toLowerCase() === numeroCarta.toLowerCase();

      return mesmoCatalogo || mesmoNumero;
    });

    if (cardExists) {
      Alert.alert("Carta duplicada", "Essa carta já existe na sua estante.");
      setMensagemAddCard("Essa carta já existe na sua estante.");
      return;
    }

    const totalSetCards = ObterTotalSetCardsHome(carta, codigoCard);

    const raridadeFinal = ConverterRaridadeHome(
      carta.raridade || (carta as any).rarity || "",
    );

    const safeCatalogId = catalogCardId || numeroCarta || String(Date.now());
    const idCartaNaEstante = `card-${authUserId}-${safeCatalogId}`
      .replace(/[^a-zA-Z0-9_-]/g, "-")
      .replace(/-+/g, "-");

    const newCard: CardItem = {
      id: idCartaNaEstante,
      cardId: safeCatalogId,
      catalogCardId: safeCatalogId,
      nome: carta.nome || "Carta sem nome",
      numero: numeroCarta,
      set: carta.colecao || (carta as any).set?.name || "Sem coleção",
      raridade: raridadeFinal,
      raridadeRank:
        Number((carta as any).raridadeRank || (carta as any).rarityRank || 0) ||
        ObterRankRaridadeHome(raridadeFinal),
      imageUrl: ObterImagemAltaHome(carta.imageUrl),
      capturadaEm: parsedDate.toISOString(),

      setId: ObterSetIdHome(carta),
      setLogoUrl: ObterLogoSetHome(carta),
      totalSetCards,

      pokemon: (carta as any).pokemon || carta.nome || "N/A",
      tipo: (carta as any).tipo || "",
      categoria: (carta as any).categoria || "",
      artista: (carta as any).artista || "",
      serie: (carta as any).serie || "",
    };

    const resposta = await fetch(`${BASE_URL}/cards`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...newCard,
        userId: authUserId,
      }),
    });

    const textoResposta = await resposta.text().catch(() => "");

    if (!resposta.ok) {
      safeLog("Erro ao salvar carta na API:", {
        status: resposta.status,
        body: textoResposta,
      });
      throw new Error(
        textoResposta || `Falha ao salvar carta. Status ${resposta.status}`,
      );
    }

    const savedCard = textoResposta
      ? ({ ...newCard, ...JSON.parse(textoResposta) } as CardItem)
      : newCard;

    setCards((prev) => [savedCard, ...prev]);
    setIsAddCardModalOpen(false);
    setNewCardDraft(emptyDraft);
    setCartaEncontrada(null);
    setShowDatePicker(false);
    setMensagemAddCard("");
    Alert.alert("Sucesso", "Carta salva na estante.");
  } catch (error) {
    safeLog("Erro ao salvar carta:", error);
    setMensagemAddCard("Não foi possível salvar a carta. Confira se o json-server está rodando e se a carta já não existe.");
    Alert.alert("Erro", "Não foi possível salvar a carta.");
  } finally {
    setSalvandoCarta(false);
  }
};

  const handleBuscarCartaPorCodigo = async () => {
  const codigoCard = newCardDraft.codigo.trim();

  if (!codigoCard) {
    Alert.alert("Código obrigatório", "Digite o código da carta para buscar.");
    return null;
  }

  setMensagemAddCard("");
  setBuscandoCarta(true);
  setCartaEncontrada(null);

  try {
    const resultados = await BuscarCartaPorCodigo(codigoCard);

    if (resultados.length === 0) {
      Alert.alert(
        "Carta não encontrada",
        "Não encontrei nenhuma carta com esse código. Tente usar o formato 002/131 ou o ID da carta.",
      );
      return null;
    }

    const primeiraCarta = resultados[0];
    const detalhe = await BuscarDetalheCartaTcgDex(primeiraCarta);

    setCartaEncontrada(detalhe);

    return detalhe;
  } catch (error) {
    safeLog("Erro ao buscar carta:", error);
    Alert.alert("Erro", "Não foi possível buscar a carta pelo código.");
    return null;
  } finally {
    setBuscandoCarta(false);
  }
};

  const handleDeleteCollection = async (collectionId: string) => {
    if (!authUserId) {
      Alert.alert("Erro", "Usuario nao identificado para excluir colecao.");
      return;
    }

    try {
      const linksRes = await fetch(
        `${BASE_URL}/collectionCards?collectionId=${encodeURIComponent(collectionId)}`,
      );
      if (linksRes.ok) {
        const links = (await linksRes.json()) as CollectionLink[];
        await Promise.all(
          links.map(async (link) => {
            const deleteLinkRes = await fetch(
              `${BASE_URL}/collectionCards/${encodeURIComponent(link.id)}`,
              {
                method: "DELETE",
              },
            );
            if (!deleteLinkRes.ok && deleteLinkRes.status !== 404) {
              throw new Error("Falha ao deletar vinculo da colecao");
            }
          }),
        );
      }

      const collectionLookupRes = await fetch(
        `${BASE_URL}/collections?userId=${encodeURIComponent(authUserId)}&id=${encodeURIComponent(collectionId)}`,
      );

      if (collectionLookupRes.ok) {
        const foundCollections = (await collectionLookupRes.json()) as ApiCollection[];
        if (foundCollections.length > 0) {
          const collectionRes = await fetch(
            `${BASE_URL}/collections/${encodeURIComponent(foundCollections[0].id)}`,
            {
              method: "DELETE",
            },
          );

          if (!collectionRes.ok && collectionRes.status !== 404) {
            throw new Error("Falha ao deletar colecao");
          }
        }
      }
    } catch {
      Alert.alert("Erro", "Nao foi possivel excluir a colecao.");
      return;
    }

    setCollections((prev) => prev.filter((c) => c.id !== collectionId));
    setSelectedCollectionId((current) =>
      current === collectionId ? null : current,
    );
  };

  const handleConfirmDeleteCollection = (
    collectionId: string,
    collectionName: string,
  ) => {
    Alert.alert(
      "Excluir colecao",
      `Deseja excluir a colecao "${collectionName}"?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: () => {
            void handleDeleteCollection(collectionId);
          },
        },
      ],
    );
  };

  const handleCreateCollection = async () => {
    const nomeColecao = newCollectionName.trim();
    if (!nomeColecao) {
      Alert.alert("Erro", "Digite um nome para a colecao.");
      return false;
    }

    if (!authUserId) {
      Alert.alert("Erro", "Usuário não identificado para criar coleção.");
      return false;
    }

    const collection: UserCollection = {
      id: "collection-" + Date.now(),
      nome: nomeColecao,
      cardIds: [],
      createdAt: new Date().toISOString(),
    };

    try {
      const resposta = await fetch(`${BASE_URL}/collections`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: collection.id,
          userId: authUserId,
          nome: collection.nome,
          createdAt: collection.createdAt,
        }),
      });

      if (!resposta.ok) {
        throw new Error("Falha ao criar colecao");
      }
    } catch {
      Alert.alert("Erro", "Nao foi possivel criar a colecao.");
      return false;
    }

    setCollections((prev) => [collection, ...prev]);
    setNewCollectionName("");
    return true;
  };

  const toggleCardInCollection = async (collectionId: string, cardId: string) => {
    const targetCollection = collections.find((c) => c.id === collectionId);
    if (!targetCollection) {
      return;
    }

    const exists = targetCollection.cardIds.includes(cardId);

    try {
      if (exists) {
        const linksRes = await fetch(
          `${BASE_URL}/collectionCards?collectionId=${encodeURIComponent(collectionId)}&cardId=${encodeURIComponent(cardId)}`,
        );
        if (!linksRes.ok) {
          throw new Error("Falha ao carregar vinculos de colecao");
        }
        const links = (await linksRes.json()) as CollectionLink[];
        await Promise.all(
          links.map((link) =>
            fetch(`${BASE_URL}/collectionCards/${encodeURIComponent(link.id)}`, {
              method: "DELETE",
            }),
          ),
        );
      } else {
        const linkId = `cc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const createRes = await fetch(`${BASE_URL}/collectionCards`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: linkId,
            collectionId,
            cardId,
          }),
        });
        if (!createRes.ok) {
          throw new Error("Falha ao vincular carta na colecao");
        }
      }
    } catch {
      Alert.alert("Erro", "Nao foi possivel atualizar a colecao.");
      return;
    }

    setCollections((prev) =>
      prev.map((collection) => {
        if (collection.id !== collectionId) {
          return collection;
        }

        return {
          ...collection,
          cardIds: exists
            ? collection.cardIds.filter((id) => id !== cardId)
            : [cardId, ...collection.cardIds],
        };
      }),
    );
  };

  const handlePickCollectionCover = async (collectionId: string) => {
    const uri = await pickImageFromGallery();
    if (!uri) {
      return;
    }

    try {
      await fetch(`${BASE_URL}/collections/${encodeURIComponent(collectionId)}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          coverImageUrl: uri,
        }),
      });
    } catch {
      Alert.alert("Erro", "Nao foi possivel atualizar a capa.");
    }

    setCollections((prev) =>
      prev.map((collection) =>
        collection.id === collectionId
          ? { ...collection, coverImageUrl: uri }
          : collection,
      ),
    );
  };

  const getCollectionThumbs = (collection: UserCollection) => {
    const images = collection.cardIds
      .map((id) => cardsById.get(id)?.imageUrl)
      .filter(Boolean) as string[];
    return images.slice(0, 3);
  };

  const handleDeletePhotoFolder = async (folderId: string) => {
    if (!authUserId) {
      Alert.alert("Erro", "Usuario nao identificado para excluir pasta.");
      return;
    }

    try {
      const photosRes = await fetch(
        `${BASE_URL}/photos?userId=${encodeURIComponent(authUserId)}&folderId=${encodeURIComponent(folderId)}`,
      );
      if (photosRes.ok) {
        const photos = (await photosRes.json()) as ApiPhoto[];
        await Promise.all(
          photos.map(async (photo) => {
            const deletePhotoRes = await fetch(
              `${BASE_URL}/photos/${encodeURIComponent(photo.id)}`,
              {
                method: "DELETE",
              },
            );
            if (!deletePhotoRes.ok && deletePhotoRes.status !== 404) {
              throw new Error("Falha ao excluir foto da pasta");
            }
          }),
        );
      }

      const folderLookupRes = await fetch(
        `${BASE_URL}/folders?userId=${encodeURIComponent(authUserId)}&id=${encodeURIComponent(folderId)}`,
      );

      if (folderLookupRes.ok) {
        const foundFolders = (await folderLookupRes.json()) as ApiFolder[];
        if (foundFolders.length > 0) {
          const folderRes = await fetch(
            `${BASE_URL}/folders/${encodeURIComponent(foundFolders[0].id)}`,
            {
              method: "DELETE",
            },
          );
          if (!folderRes.ok && folderRes.status !== 404) {
            throw new Error("Falha ao excluir pasta");
          }
        }
      }
    } catch {
      Alert.alert("Erro", "Nao foi possivel excluir a pasta.");
      return;
    }

    setPhotoFolders((prev) => prev.filter((f) => f.id !== folderId));
    setPhotoPreview((current) => {
      if (!current) {
        return current;
      }
      return current.folderId === folderId ? null : current;
    });
    setPendingPhotoToName((current) => {
      if (!current) {
        return current;
      }
      return current.folderId === folderId ? null : current;
    });
    setPhotoRenameTarget((current) => {
      if (!current) {
        return current;
      }
      return current.folderId === folderId ? null : current;
    });
  };

  const handleConfirmDeletePhotoFolder = (
    folderId: string,
    folderName: string,
  ) => {
    Alert.alert(
      "Excluir pasta",
      `Deseja excluir a pasta "${folderName}" e todas as fotos dentro dela?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: () => {
            void handleDeletePhotoFolder(folderId);
          },
        },
      ],
    );
  };

  const handleCreateFolder = async () => {
    const trimmedName = newFolderName.trim();
    if (!trimmedName) {
      Alert.alert("Erro", "Digite um nome para a pasta.");
      return false;
    }

    const exists = photoFolders.some(
      (folder) => folder.nome.toLowerCase() === trimmedName.toLowerCase(),
    );
    if (exists) {
      Alert.alert("Erro", "Ja existe uma pasta com esse nome.");
      return false;
    }

    if (!authUserId) {
      Alert.alert("Erro", "Usuario nao identificado para criar pasta.");
      return false;
    }

    const folderId = "folder-" + Date.now();

    try {
      const resposta = await fetch(`${BASE_URL}/folders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: folderId,
          userId: authUserId,
          nome: trimmedName,
        }),
      });

      if (!resposta.ok) {
        throw new Error("Falha ao criar pasta");
      }
    } catch {
      Alert.alert("Erro", "Nao foi possivel criar a pasta.");
      return false;
    }

    setPhotoFolders((prev) => [
      ...prev,
      { id: folderId, nome: trimmedName, fotos: [] },
    ]);
    setNewFolderName("");
    return true;
  };

  const pushPhotoToFolder = async (
    folderId: string,
    imageUrl: string,
    title: string,
  ) => {
    if (!authUserId) {
      Alert.alert("Erro", "Usuario nao identificado para salvar foto.");
      return false;
    }

    const newPhoto: PhotoItem = {
      id: "photo-" + Date.now(),
      titulo: title,
      imageUrl,
    };

    try {
      const resposta = await fetch(`${BASE_URL}/photos`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: newPhoto.id,
          userId: authUserId,
          folderId,
          titulo: title,
          imageUrl,
        }),
      });
      if (!resposta.ok) {
        throw new Error("Falha ao salvar foto");
      }
    } catch {
      Alert.alert("Erro", "Nao foi possivel salvar a foto.");
      return false;
    }

    setPhotoFolders((prev) =>
      prev.map((folder) =>
        folder.id === folderId
          ? { ...folder, fotos: [newPhoto, ...folder.fotos] }
          : folder,
      ),
    );
    return true;
  };

  const handleAddPhotoFromGallery = async (folderId: string) => {
    const uri = await pickImageFromGallery();
    if (!uri) {
      return;
    }

    setPendingPhotoToName({ folderId, imageUrl: uri });
    setPendingPhotoTitle("");
  };

  const handleTakePhotoWithCamera = async (folderId: string) => {
    const uri = await pickImageFromCamera();
    if (!uri) {
      return;
    }

    setPendingPhotoToName({ folderId, imageUrl: uri });
    setPendingPhotoTitle("");
  };

  const handleSavePendingPhoto = async () => {
    if (!pendingPhotoToName) {
      return;
    }

    const title = pendingPhotoTitle.trim();
    if (!title) {
      Alert.alert("Nome obrigatorio", "Digite o nome da foto para salvar.");
      return;
    }

    const saved = await pushPhotoToFolder(
      pendingPhotoToName.folderId,
      pendingPhotoToName.imageUrl,
      title,
    );
    if (!saved) {
      return;
    }
    setPendingPhotoToName(null);
    setPendingPhotoTitle("");
  };

  const handleAddPhoto = (folderId: string) => {
    Alert.alert("Adicionar foto", "Escolha como deseja adicionar a foto.", [
      { text: "Galeria", onPress: () => handleAddPhotoFromGallery(folderId) },
      { text: "Camera", onPress: () => handleTakePhotoWithCamera(folderId) },
      { text: "Cancelar", style: "cancel" },
    ]);
  };

  const handleDeletePhoto = async (folderId: string, photoId: string) => {
    try {
      const resposta = await fetch(
        `${BASE_URL}/photos/${encodeURIComponent(photoId)}`,
        {
          method: "DELETE",
        },
      );
      if (!resposta.ok) {
        throw new Error("Falha ao excluir foto");
      }
    } catch {
      Alert.alert("Erro", "Nao foi possivel excluir a foto.");
      return;
    }

    setPhotoFolders((prev) =>
      prev.map((folder) =>
        folder.id === folderId
          ? {
              ...folder,
              fotos: folder.fotos.filter((photo) => photo.id !== photoId),
            }
          : folder,
      ),
    );

    setPhotoPreview((current) => {
      if (!current) {
        return current;
      }
      if (current.folderId === folderId && current.photo.id === photoId) {
        return null;
      }
      return current;
    });
  };

  const confirmDeletePhoto = (
    folderId: string,
    photoId: string,
    title: string,
  ) => {
    Alert.alert("Excluir foto", `Deseja excluir "${title}"?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Excluir",
        style: "destructive",
        onPress: () => {
          void handleDeletePhoto(folderId, photoId);
        },
      },
    ]);
  };

  const handleDeleteCard = async (cardId: string) => {
    try {
      const linksRes = await fetch(
        `${BASE_URL}/collectionCards?cardId=${encodeURIComponent(cardId)}`,
      );
      if (linksRes.ok) {
        const links = (await linksRes.json()) as CollectionLink[];
        await Promise.all(
          links.map((link) =>
            fetch(`${BASE_URL}/collectionCards/${encodeURIComponent(link.id)}`, {
              method: "DELETE",
            }),
          ),
        );
      }

      const cardRes = await fetch(`${BASE_URL}/cards/${encodeURIComponent(cardId)}`, {
        method: "DELETE",
      });
      if (!cardRes.ok) {
        throw new Error("Falha ao excluir carta");
      }
    } catch {
      Alert.alert("Erro", "Nao foi possivel excluir a carta.");
      return;
    }

    setCards((prev) => prev.filter((card) => card.id !== cardId));
    setCollections((prev) =>
      prev.map((collection) => ({
        ...collection,
        cardIds: collection.cardIds.filter((id) => id !== cardId),
      })),
    );
    setSelectedCard((current) => (current?.id === cardId ? null : current));
  };

  const confirmDeleteCard = (card: CardItem) => {
    if (Platform.OS === "web") {
      const confirmou =
        typeof window === "undefined"
          ? true
          : window.confirm(`Deseja excluir "${card.nome}" da estante?`);

      if (confirmou) {
        void handleDeleteCard(card.id);
      }

      return;
    }

    Alert.alert("Excluir carta", `Deseja excluir "${card.nome}" da estante?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Excluir",
        style: "destructive",
        onPress: () => {
          void handleDeleteCard(card.id);
        },
      },
    ]);
  };

  const openRenamePhoto = (
    folderId: string,
    photoId: string,
    currentTitle: string,
  ) => {
    setPhotoRenameTarget({ folderId, photoId });
    setPhotoRenameValue(currentTitle);
  };

  const handleRenamePhoto = async () => {
    const target = photoRenameTarget;
    if (!target) {
      return;
    }

    const trimmed = photoRenameValue.trim();
    if (!trimmed) {
      Alert.alert("Erro", "Digite um nome para a foto.");
      return;
    }

    try {
      const resposta = await fetch(
        `${BASE_URL}/photos/${encodeURIComponent(target.photoId)}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            titulo: trimmed,
          }),
        },
      );
      if (!resposta.ok) {
        throw new Error("Falha ao renomear foto");
      }
    } catch {
      Alert.alert("Erro", "Nao foi possivel renomear a foto.");
      return;
    }

    setPhotoFolders((prev) =>
      prev.map((folder) =>
        folder.id !== target.folderId
          ? folder
          : {
              ...folder,
              fotos: folder.fotos.map((photo) =>
                photo.id === target.photoId
                  ? { ...photo, titulo: trimmed }
                  : photo,
              ),
            },
      ),
    );

    setPhotoPreview((current) => {
      if (!current) {
        return current;
      }
      if (
        current.folderId === target.folderId &&
        current.photo.id === target.photoId
      ) {
        return { ...current, photo: { ...current.photo, titulo: trimmed } };
      }
      return current;
    });

    setPhotoRenameTarget(null);
    setPhotoRenameValue("");
  };

  const handleLogout = () => {
    Alert.alert("Sair da conta", "Deseja encerrar sua sessao?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Sair",
        style: "destructive",
        onPress: async () => {
          try {
            await AsyncStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
          } finally {
            setAuthUserName("");
            setAuthUserId(null);
            setRemoteLoaded(false);
            router.replace("/");
          }
        },
      },
    ]);
  };

  if (!authChecked || (authUserName && !remoteLoaded)) {
    return (
      <View style={styles.authLoadingWrap}>
        <Text style={styles.authLoadingText}>
          {!authChecked ? "Validando sessao..." : "Carregando sua estante..."}
        </Text>
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
      <View style={styles.glowTop} pointerEvents="none" />
      <View style={styles.glowBottom} pointerEvents="none" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.greeting}>Olá, {userName}!</Text>
            <Text style={styles.subGreeting}>
              Sua estante está pronta para ser explorada.
            </Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={handleLogout}>
  <Text style={styles.logoutButtonText}>Sair</Text>
            </TouchableOpacity>
          </View>
        </View>

        {mode !== "padrao" && (
  <View style={styles.searchBox}>
    <TextInput
      value={query}
      onChangeText={setQuery}
      placeholder="Pesquisar carta por nome ou codigo"
      placeholderTextColor="#9A8E80"
      style={styles.searchInput}
    />
    <Text style={styles.searchIcon}>⌕</Text>
  </View>
)}

        <View style={styles.modeRow}>
          <ModeChip
            label="Padrao"
            isActive={mode === "padrao"}
            onPress={() => setMode("padrao")}
          />
          <ModeChip
            label="Todas"
            isActive={mode === "todas"}
            onPress={() => setMode("todas")}
          />
          <ModeChip
            label="Por set"
            isActive={mode === "set"}
            onPress={() => setMode("set")}
          />
        </View>

        {mode === "padrao" && (
  <>
    <HomeDashboardCard
      pokemon={pokemonFavorito}
      totalCartas={cards.length}
      totalColecoes={collections.length}
      totalSets={dashboardSets.length}
      onPressPokemon={() => {
        if (!pokemonFavorito) {
          return;
        }

        setMode("todas");
        setQuery(pokemonFavorito.nome);
        setSelectedSet("Todos");
        setRarityFilter("Todas");
      }}
    />

    <SetDestaqueCard
  setItem={setDestaque}
  onPressVerMais={() => setIsSetsModalOpen(true)}
/>

    <View style={styles.sectionHeaderRow}>
      <View>
        <Text style={styles.sectionTitle}>Minhas coleções</Text>
        <Text style={styles.sectionSubtitle}>
          {`${collections.length} coleções criadas`}
        </Text>
      </View>

      <TouchableOpacity onPress={() => setIsCreateCollectionModalOpen(true)}>
        <Text style={styles.sectionAction}>Nova</Text>
      </TouchableOpacity>
    </View>

    <View style={styles.collectionSearchRow}>
      <View style={styles.collectionSearchBox}>
        <TextInput
          value={collectionSearch}
          onChangeText={setCollectionSearch}
          placeholder="Pesquisar coleção existente"
          placeholderTextColor="#9A8E80"
          style={styles.collectionSearchInput}
        />
        <Text style={styles.collectionSearchIcon}>⌕</Text>
      </View>
    </View>

    <View style={styles.collectionsGrid}>
      <TouchableOpacity
        style={styles.addCollectionCard}
        onPress={() => setIsCreateCollectionModalOpen(true)}
        activeOpacity={0.9}
      >
        <Text style={styles.addCollectionPlus}>+</Text>
        <Text style={styles.addCollectionLabel}>Nova coleção</Text>
      </TouchableOpacity>

      {filteredCollections.map((collection) => {
        const thumbs = getCollectionThumbs(collection);

        return (
          <TouchableOpacity
            key={collection.id}
            style={styles.collectionCard}
            onPress={() => setSelectedCollectionId(collection.id)}
          >
            <TouchableOpacity
              style={styles.collectionDeleteButton}
              onPress={() =>
                handleConfirmDeleteCollection(collection.id, collection.nome)
              }
            >
              <Text style={styles.collectionDeleteButtonText}>X</Text>
            </TouchableOpacity>

            <CollectionTrapezoidCover
              customCoverUrl={collection.coverImageUrl}
              images={thumbs}
            />

            <Text style={styles.collectionName} numberOfLines={1}>
              {collection.nome}
            </Text>

            <Text style={styles.collectionMeta}>
              {collection.cardIds.length} cartas
            </Text>

            <Text style={styles.collectionBadge}>Toque para abrir</Text>
          </TouchableOpacity>
        );
      })}

      {collections.length === 0 && (
        <Text style={styles.emptyText}>
          Crie sua primeira coleção acima.
        </Text>
      )}
    </View>

    <SectionTitle
      title="Cartas recentes"
      subtitle={`${cardsRecentes.length} adicionadas recentemente`}
    />

    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.horizontalList}
    >
      <TouchableOpacity
        style={[
          styles.cardTile,
          styles.cardTileCompact,
          styles.addRecentCardTile,
        ]}
        onPress={() => setIsAddCardModalOpen(true)}
        activeOpacity={0.9}
      >
        <View style={styles.addRecentCardInner}>
          <Text style={styles.addRecentCardPlus}>+</Text>
          <Text style={styles.addRecentCardLabel}>Adicionar carta</Text>
        </View>
      </TouchableOpacity>

      {cardsRecentes.map((card) => (
        <CardTile
          key={card.id}
          card={card}
          compact
          onPress={() => setSelectedCard(card)}
        />
      ))}
    </ScrollView>
  </>
)}

        {mode === "todas" && (
          <>
            <SectionTitle
              title="Todas as cartas"
              subtitle={`${filteredCards.length} cartas na estante`}
            />
            <View style={styles.grid}>
              {filteredCards.map((card) => (
                <TouchableOpacity
                  key={card.id}
                  style={styles.cardPhotoOnlyPressable}
                  activeOpacity={0.9}
                  onPress={() => setSelectedCard(card)}
                >
                  <Image
                    source={{ uri: card.imageUrl }}
                    style={styles.cardPhotoOnlyImage}
                    resizeMode="contain"
                  />
                </TouchableOpacity>
              ))}
            </View>
            {filteredCards.length === 0 && (
              <Text style={styles.emptyText}>Nenhuma carta encontrada.</Text>
            )}
          </>
        )}

        {mode === "set" && (
          <>
            <SectionTitle
              title={
                selectedSet === "Todos" ? "Por set" : `Set: ${selectedSet}`
              }
              subtitle={`${filteredCards.length} cartas visíveis`}
            />
            {sectionsBySet.map((section) => (
              <View key={section.nome} style={styles.setSection}>
                <Text style={styles.setSectionTitle}>{section.nome}</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.horizontalList}
                >
                  {section.cards.map((card) => (
                    <TouchableOpacity
                      key={card.id}
                      style={styles.setPhotoOnlyPressable}
                      activeOpacity={0.9}
                      onPress={() => setSelectedCard(card)}
                    >
                      <Image
                        source={{ uri: card.imageUrl }}
                        style={styles.setPhotoOnlyImage}
                        resizeMode="contain"
                      />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            ))}
            {sectionsBySet.length === 0 && (
              <Text style={styles.emptyText}>
                Nenhum set com cartas para os filtros atuais.
              </Text>
            )}
          </>
        )}
      </ScrollView>

     <Modal
  visible={isAddCardModalOpen}
  transparent
  animationType="fade"
  onRequestClose={() => {
    setIsAddCardModalOpen(false);
    setNewCardDraft(emptyDraft);
    setCartaEncontrada(null);
  }}
>
  <View style={styles.photoModalOverlay}>
    <View style={styles.photoRenameCard}>
      <Text style={styles.photoRenameTitle}>
        Adicionar carta à estante
      </Text>

      <TextInput
        value={newCardDraft.codigo}
        onChangeText={(value) => {
          setNewCardDraft((prev) => ({ ...prev, codigo: value }));
          setCartaEncontrada(null);
        }}
        placeholder="Código da carta. Ex: 002/131"
        placeholderTextColor="#9A8E80"
        style={styles.photoRenameInput}
        autoCapitalize="none"
      />

      <TouchableOpacity
        style={styles.pickImageButton}
        onPress={() => void handleBuscarCartaPorCodigo()}
        disabled={buscandoCarta}
      >
        <Text style={styles.pickImageText}>
          {buscandoCarta ? "Buscando..." : "Buscar carta"}
        </Text>
      </TouchableOpacity>

      {cartaEncontrada ? (
        <View style={styles.cardSearchPreview}>
          {cartaEncontrada.imageUrl ? (
            <Image
              source={{ uri: ObterImagemAltaHome(cartaEncontrada.imageUrl) }}
              style={styles.cardSearchPreviewImage}
              resizeMode="contain"
            />
          ) : null}

          <View style={styles.cardSearchPreviewInfo}>
            <Text style={styles.cardSearchPreviewTitle} numberOfLines={2}>
              {cartaEncontrada.nome || "Carta sem nome"}
            </Text>

            <Text style={styles.cardSearchPreviewText} numberOfLines={1}>
              {cartaEncontrada.codigo || newCardDraft.codigo}
            </Text>

            <Text style={styles.cardSearchPreviewText} numberOfLines={1}>
              {cartaEncontrada.colecao || "Sem coleção"}
            </Text>

            <Text style={styles.cardSearchPreviewText} numberOfLines={1}>
              {cartaEncontrada.raridade || "Sem raridade"}
            </Text>
          </View>
        </View>
      ) : null}

      {Platform.OS === "web" ? (
        <View style={styles.datePickerWebWrap}>
          <Text style={styles.datePickerWebLabel}>Data de captura</Text>

          {React.createElement("input", {
            type: "date",
            "data-testid": "input-data-captura",
            "aria-label": "Data de captura",
            value: newCardDraft.capturadaEm,
            onChange: handleDateInputChange,
            style: {
              width: "100%",
              minHeight: 44,
              borderRadius: 10,
              border: "1px solid #745437",
              backgroundColor: "rgba(20, 14, 9, 0.85)",
              color: "#EFE7DB",
              padding: "0 10px",
              fontSize: 13,
              fontWeight: 700,
              outline: "none",
              boxSizing: "border-box",
              marginBottom: 8,
            },
          })}
        </View>
      ) : (
        <>
          <TouchableOpacity
            style={styles.datePickerButton}
            onPress={() => setShowDatePicker(true)}
            activeOpacity={0.85}
          >
            <Text
              style={[
                styles.datePickerButtonText,
                !newCardDraft.capturadaEm && styles.datePickerPlaceholderText,
              ]}
            >
              {newCardDraft.capturadaEm
                ? FormatarDataInputHome(newCardDraft.capturadaEm)
                : "Data de captura"}
            </Text>

            <Text style={styles.datePickerIcon}>📅</Text>
          </TouchableOpacity>

          {showDatePicker && (
            <DateTimePicker
              value={
                newCardDraft.capturadaEm
                  ? new Date(`${newCardDraft.capturadaEm}T12:00:00`)
                  : new Date()
              }
              mode="date"
              display="default"
              onChange={handleSelecionarDataCaptura}
            />
          )}
        </>
      )}

      {mensagemAddCard ? (
        <Text style={styles.cardFormFeedback}>{mensagemAddCard}</Text>
      ) : null}

      <View style={styles.photoModalActions}>
        <TouchableOpacity
          style={styles.photoModalCloseButton}
          onPress={() => {
            setIsAddCardModalOpen(false);
            setNewCardDraft(emptyDraft);
            setCartaEncontrada(null);
          }}
        >
          <Text style={styles.photoModalCloseText}>Cancelar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.photoModalRenameButton}
          onPress={handleSaveCard}
          disabled={buscandoCarta || salvandoCarta}
        >
          <Text style={styles.photoModalRenameText}>
            {salvandoCarta ? "Salvando..." : buscandoCarta ? "Aguarde..." : "Salvar carta"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  </View>
</Modal>

<SetsDashboardModal
  visible={isSetsModalOpen}
  sets={dashboardSets}
  onClose={() => setIsSetsModalOpen(false)}
  onOpenSet={(setName) => {
    setIsSetsModalOpen(false);
    setMode("set");
    setSelectedSet(setName);
  }}
/>
      <Modal
        animationType="fade"
        transparent
        visible={isCreateCollectionModalOpen}
        onRequestClose={() => {
          setIsCreateCollectionModalOpen(false);
          setNewCollectionName("");
        }}
      >
        <View style={styles.photoModalOverlay}>
          <View style={styles.photoRenameCard}>
            <Text style={styles.photoRenameTitle}>Nova colecao</Text>

            <TextInput
              value={newCollectionName}
              onChangeText={setNewCollectionName}
              placeholder="Digite o nome da colecao"
              placeholderTextColor="#9A8E80"
              style={styles.photoRenameInput}
            />

            <View style={styles.photoModalActions}>
              <TouchableOpacity
                style={styles.photoModalCloseButton}
                onPress={() => {
                  setIsCreateCollectionModalOpen(false);
                  setNewCollectionName("");
                }}
              >
                <Text style={styles.photoModalCloseText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.photoModalRenameButton}
                onPress={async () => {
                  const created = await handleCreateCollection();
                  if (created) {
                    setIsCreateCollectionModalOpen(false);
                  }
                }}
              >
                <Text style={styles.photoModalRenameText}>Criar colecao</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={!!selectedCollection}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedCollectionId(null)}
      >
        <View style={styles.photoModalOverlay}>
          <View style={styles.collectionModalCard}>
            <Text style={styles.photoRenameTitle}>
              {selectedCollection?.nome}
            </Text>
            <Text style={styles.sectionSubtitle}>
              Adicione cartas ja cadastradas na estante.
            </Text>

            <View style={styles.collectionCoverRow}>
              <TouchableOpacity
                style={styles.photoModalRenameButton}
                onPress={() => {
                  if (!selectedCollection) {
                    return;
                  }
                  handlePickCollectionCover(selectedCollection.id);
                }}
              >
                <Text style={styles.photoModalRenameText}>Editar capa</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.collectionModalScroll}>
              {cards.map((card) => {
                const inCollection = !!selectedCollection?.cardIds.includes(
                  card.id,
                );
                return (
                  <View key={card.id} style={styles.collectionCardRow}>
                    <Image
                      source={{ uri: card.imageUrl }}
                      style={styles.collectionCardRowImage}
                    />
                    <View style={styles.collectionCardRowMeta}>
                      <Text style={styles.collectionCardRowTitle}>
                        {card.nome}
                      </Text>
                      <Text style={styles.collectionCardRowSub}>
                        {card.numero} • {card.set}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[
                        styles.collectionToggleButton,
                        inCollection && styles.collectionToggleButtonActive,
                      ]}
                      onPress={() =>
                        selectedCollection &&
                        toggleCardInCollection(selectedCollection.id, card.id)
                      }
                    >
                      <Text
                        style={[
                          styles.collectionToggleButtonText,
                          inCollection &&
                            styles.collectionToggleButtonTextActive,
                        ]}
                      >
                        {inCollection ? "Remover" : "Adicionar"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
              {cards.length === 0 && (
                <Text style={styles.emptyText}>
                  Adicione cartas antes de montar colecoes.
                </Text>
              )}
            </ScrollView>

            <View style={styles.photoModalActions}>
              <TouchableOpacity
                style={styles.photoModalCloseButton}
                onPress={() => setSelectedCollectionId(null)}
              >
                <Text style={styles.photoModalCloseText}>Fechar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="fade"
        transparent
        visible={!!photoPreview}
        onRequestClose={() => setPhotoPreview(null)}
      >
        <View style={styles.photoModalOverlay}>
          <View style={styles.photoModalCard}>
            <Image
              source={{ uri: photoPreview?.photo.imageUrl }}
              style={styles.photoModalImage}
            />
            <Text style={styles.photoModalTitle}>
              {photoPreview?.photo.titulo}
            </Text>
            <View style={styles.photoModalActions}>
              <TouchableOpacity
                style={styles.photoModalRenameButton}
                onPress={() =>
                  photoPreview &&
                  openRenamePhoto(
                    photoPreview.folderId,
                    photoPreview.photo.id,
                    photoPreview.photo.titulo,
                  )
                }
              >
                <Text style={styles.photoModalRenameText}>Renomear</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.photoModalDeleteButton}
                onPress={() =>
                  photoPreview &&
                  confirmDeletePhoto(
                    photoPreview.folderId,
                    photoPreview.photo.id,
                    photoPreview.photo.titulo,
                  )
                }
              >
                <Text style={styles.photoModalDeleteText}>Excluir</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.photoModalCloseButton}
                onPress={() => setPhotoPreview(null)}
              >
                <Text style={styles.photoModalCloseText}>Fechar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="fade"
        transparent
        visible={!!pendingPhotoToName}
        onRequestClose={() => {
          setPendingPhotoToName(null);
          setPendingPhotoTitle("");
        }}
      >
        <View style={styles.photoModalOverlay}>
          <View style={styles.photoRenameCard}>
            <Text style={styles.photoRenameTitle}>Nome da nova foto</Text>
            <TextInput
              value={pendingPhotoTitle}
              onChangeText={setPendingPhotoTitle}
              placeholder="Digite o nome da foto"
              placeholderTextColor="#9A8E80"
              style={styles.photoRenameInput}
            />
            <View style={styles.photoModalActions}>
              <TouchableOpacity
                style={styles.photoModalCloseButton}
                onPress={() => {
                  setPendingPhotoToName(null);
                  setPendingPhotoTitle("");
                }}
              >
                <Text style={styles.photoModalCloseText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.photoModalRenameButton}
                onPress={handleSavePendingPhoto}
              >
                <Text style={styles.photoModalRenameText}>Salvar foto</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="fade"
        transparent
        visible={!!photoRenameTarget}
        onRequestClose={() => {
          setPhotoRenameTarget(null);
          setPhotoRenameValue("");
        }}
      >
        <View style={styles.photoModalOverlay}>
          <View style={styles.photoRenameCard}>
            <Text style={styles.photoRenameTitle}>Renomear foto</Text>
            <TextInput
              value={photoRenameValue}
              onChangeText={setPhotoRenameValue}
              placeholder="Novo nome da foto"
              placeholderTextColor="#9A8E80"
              style={styles.photoRenameInput}
            />
            <View style={styles.photoModalActions}>
              <TouchableOpacity
                style={styles.photoModalCloseButton}
                onPress={() => {
                  setPhotoRenameTarget(null);
                  setPhotoRenameValue("");
                }}
              >
                <Text style={styles.photoModalCloseText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.photoModalRenameButton}
                onPress={handleRenamePhoto}
              >
                <Text style={styles.photoModalRenameText}>Salvar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="fade"
        transparent
        visible={!!selectedCard}
        onRequestClose={() => setSelectedCard(null)}
      >
        <View style={styles.photoModalOverlay}>
          <View style={styles.cardDetailsModalCard}>
            <Image
              source={{ uri: selectedCard?.imageUrl }}
              style={styles.cardDetailsImage}
            />
            <Text style={styles.cardDetailsTitle}>{selectedCard?.nome}</Text>

            <View style={styles.cardDetailsInfoWrap}>
              <Text style={styles.cardDetailsInfoLabel}>Codigo</Text>
              <Text style={styles.cardDetailsInfoValue}>
                {selectedCard?.numero}
              </Text>
            </View>

            <View style={styles.cardDetailsInfoWrap}>
              <Text style={styles.cardDetailsInfoLabel}>Raridade</Text>
              <Text style={styles.cardDetailsInfoValue}>
                {selectedCard?.raridade}
              </Text>
            </View>

            <View style={styles.cardDetailsInfoWrap}>
              <Text style={styles.cardDetailsInfoLabel}>Set</Text>
              <Text style={styles.cardDetailsInfoValue}>
                {selectedCard?.set}
              </Text>
            </View>

            <View style={styles.photoModalActions}>
              <TouchableOpacity
                style={styles.photoModalDeleteButton}
                onPress={() => selectedCard && confirmDeleteCard(selectedCard)}
              >
                <Text style={styles.photoModalDeleteText}>Excluir</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.photoModalCloseButton}
                onPress={() => setSelectedCard(null)}
              >
                <Text style={styles.photoModalCloseText}>Fechar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="fade"
        transparent
        visible={isCreateFolderModalOpen}
        onRequestClose={() => {
          setIsCreateFolderModalOpen(false);
          setNewFolderName("");
        }}
      >
        <View style={styles.photoModalOverlay}>
          <View style={styles.photoRenameCard}>
            <Text style={styles.photoRenameTitle}>Criar nova pasta</Text>

            <TextInput
              value={newFolderName}
              onChangeText={setNewFolderName}
              placeholder="Digite o nome da pasta"
              placeholderTextColor="#9A8E80"
              style={styles.photoRenameInput}
            />

            <View style={styles.photoModalActions}>
              <TouchableOpacity
                style={styles.photoModalCloseButton}
                onPress={() => {
                  setIsCreateFolderModalOpen(false);
                  setNewFolderName("");
                }}
              >
                <Text style={styles.photoModalCloseText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.photoModalRenameButton}
                onPress={async () => {
                  const created = await handleCreateFolder();
                  if (created) {
                    setIsCreateFolderModalOpen(false);
                    setNewFolderName("");
                  }
                }}
              >
                <Text style={styles.photoModalRenameText}>Criar pasta</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <View style={styles.bottomNav}>
        {NAV_ITEMS.map((item) => {
          const active = item.key === "home";
          return (
            <TouchableOpacity
              key={item.key}
              style={[styles.navItem, active && styles.navItemActive]}
              onPress={() => {
                if (!active) {
                  if (item.key === "explorar") {
                    router.push('/explore');
                    return;
                  }
                  if (item.key === "wishlist") {
                    router.push('/wishlist');
                    return;
                  }
                  Alert.alert(
                    "Em breve",
                    `${item.label} sera implementado em breve.`,
                  );
                }
              }}
            >
              <Text style={[styles.navLabel, active && styles.navLabelActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </LinearGradient>
  );
}

type ChipProps = {
  label: string;
  isActive: boolean;
  onPress: () => void;
};

function ModeChip({ label, isActive, onPress }: ChipProps) {
  return (
    <TouchableOpacity
      style={[styles.modeChip, isActive && styles.modeChipActive]}
      onPress={onPress}
    >
      <Text
        style={[styles.modeChipText, isActive && styles.modeChipTextActive]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function RarityChip({ label, isActive, onPress }: ChipProps) {
  const isPromo = label === "Promo";

  return (
    <TouchableOpacity
      style={[
        styles.rarityChip,
        isPromo && styles.rarityChipPromo,
        isActive && styles.rarityChipActive,
        isPromo && isActive && styles.rarityChipPromoActive,
      ]}
      onPress={onPress}
    >
      <Text
        style={[
          styles.rarityChipText,
          isPromo && styles.rarityChipTextPromo,
          isActive && styles.rarityChipTextActive,
          isPromo && isActive && styles.rarityChipTextPromoActive,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function PokemonFavoritoCard({
  pokemon,
  onPress,
}: {
  pokemon: PokemonFavoritoItem | null;
  onPress: () => void;
}) {
  if (!pokemon) {
    return (
      <View style={styles.favoritePokemonCard}>
        <View>
          <Text style={styles.favoritePokemonLabel}>Pokémon favorito</Text>
          <Text style={styles.favoritePokemonName}>Nenhuma carta ainda</Text>
          <Text style={styles.favoritePokemonSub}>
            Adicione cartas para descobrir seu favorito.
          </Text>
        </View>
      </View>
    );
  }

  const imagens = pokemon.cartas.slice(0, 3);

  return (
    <TouchableOpacity
      style={styles.favoritePokemonCard}
      activeOpacity={0.9}
      onPress={onPress}
    >
      <View style={styles.favoritePokemonInfo}>
        <Text style={styles.favoritePokemonLabel}>Pokémon favorito</Text>

        <Text style={styles.favoritePokemonName} numberOfLines={1}>
          {pokemon.nome}
        </Text>

        <Text style={styles.favoritePokemonSub}>
          {pokemon.totalCartas} cartas de {pokemon.totalNaEstante} na estante
        </Text>

        <Text style={styles.favoritePokemonSub}>
          Presente em {pokemon.totalSets} set{pokemon.totalSets === 1 ? "" : "s"}
        </Text>

        <Text style={styles.favoritePokemonUpdate}>
          Última atualização: {FormatarDataHome(pokemon.ultimaAtualizacao)}
        </Text>
      </View>

      <View style={styles.favoritePokemonRight}>
        <View style={styles.favoritePokemonPercentBadge}>
          <Text style={styles.favoritePokemonPercentText}>
            {pokemon.percentualDaEstante}%
          </Text>
        </View>

        <View style={styles.favoritePokemonImagesWrap}>
          {imagens.map((card, index) => (
            <Image
              key={`${card.id}-${index}`}
              source={{ uri: card.imageUrl }}
              style={[
                styles.favoritePokemonImage,
                index === 0 && styles.favoritePokemonImageLeft,
                index === 1 && styles.favoritePokemonImageCenter,
                index === 2 && styles.favoritePokemonImageRight,
              ]}
              resizeMode="cover"
            />
          ))}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const getRarityBadgeStyle = (rarity: Rarity) => {
  if (rarity === "Promo") {
    return {
      backgroundColor: "#4E8FA5",
      textColor: "#06151C",
      borderColor: "#7EBACF",
    };
  }

  if (rarity === "Ultra Rara") {
    return {
      backgroundColor: "#D48552",
      textColor: "#221106",
      borderColor: "#E4A06D",
    };
  }

  return {
    backgroundColor: "#D6A45A",
    textColor: "#24190D",
    borderColor: "#E6BF80",
  };
};

function SectionTitle({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionSubtitle}>{subtitle}</Text>
    </View>
  );
}

function CardTile({
  card,
  compact = false,
  fullImage = false,
  onPress,
}: {
  card: CardItem;
  compact?: boolean;
  fullImage?: boolean;
  onPress?: () => void;
}) {
  const Container = onPress ? TouchableOpacity : View;
  const rarityBadge = getRarityBadgeStyle(card.raridade);

  return (
    <Container
      style={[styles.cardTile, compact && styles.cardTileCompact]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <LinearGradient
        colors={["rgba(212, 170, 90, 0.14)", "rgba(30, 20, 10, 0.85)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.cardTileInner}
      >
        <Image
          source={{ uri: card.imageUrl }}
          style={[styles.cardImage, fullImage && styles.cardImageFull]}
          resizeMode={fullImage ? "contain" : "cover"}
        />
        <Text style={styles.cardName} numberOfLines={1}>
          {card.nome}
        </Text>
        <Text style={styles.cardSet} numberOfLines={1}>
          {card.set}
        </Text>
        <Text style={styles.cardMeta}>{card.numero}</Text>
        <Text
          style={[
            styles.cardBadge,
            {
              backgroundColor: rarityBadge.backgroundColor,
              color: rarityBadge.textColor,
              borderColor: rarityBadge.borderColor,
            },
          ]}
        >
          {card.raridade}
        </Text>
      </LinearGradient>
    </Container>
  );
}

const styles = StyleSheet.create({

  datePickerWebWrap: {
  marginBottom: 8,
},

datePickerWebLabel: {
  color: "#9A8E80",
  fontSize: 12,
  fontWeight: "700",
  marginBottom: 6,
},

  sectionHeaderRow: {
  marginTop: 18,
  marginBottom: 10,
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "flex-end",
},

sectionAction: {
  color: "#E4B56D",
  fontSize: 13,
  fontWeight: "900",
},

dashboardCard: {
  marginTop: 14,
  marginBottom: 14,
  borderWidth: 1,
  borderColor: "rgba(228, 181, 109, 0.32)",
  backgroundColor: "rgba(18, 13, 9, 0.95)",
  borderRadius: 22,
  padding: 14,
  flexDirection: "row",
  overflow: "hidden",
},

dashboardLeft: {
  flex: 1,
  paddingRight: 10,
},

dashboardLabel: {
  color: "#E4B56D",
  fontSize: 12,
  fontWeight: "900",
  textTransform: "uppercase",
  letterSpacing: 1,
},

dashboardSmallLabel: {
  color: "#B39E82",
  fontSize: 12,
  marginTop: 10,
  fontWeight: "700",
},

setsModalOverlay: {
  flex: 1,
  backgroundColor: "rgba(0, 0, 0, 0.82)",
  justifyContent: "flex-end",
  paddingHorizontal: 12,
  paddingBottom: 18,
},

setsModalCard: {
  maxHeight: "84%",
  borderRadius: 24,
  borderWidth: 1,
  borderColor: "rgba(228, 181, 109, 0.28)",
  backgroundColor: "#100B08",
  padding: 16,
},

setsModalHeader: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 14,
},

setsModalTitle: {
  color: "#F8F2E8",
  fontSize: 24,
  fontWeight: "900",
},

setsModalSubtitle: {
  color: "#B39E82",
  fontSize: 12,
  marginTop: 3,
  fontWeight: "700",
},

setsModalCloseButton: {
  borderRadius: 999,
  borderWidth: 1,
  borderColor: "rgba(228, 181, 109, 0.32)",
  paddingHorizontal: 12,
  paddingVertical: 8,
  backgroundColor: "rgba(214, 164, 90, 0.12)",
},

setsModalCloseText: {
  color: "#F3DFC2",
  fontSize: 12,
  fontWeight: "900",
},

setsListCard: {
  borderRadius: 18,
  borderWidth: 1,
  borderColor: "rgba(228, 181, 109, 0.20)",
  backgroundColor: "rgba(18, 13, 9, 0.96)",
  padding: 14,
  marginBottom: 12,
},

setsListHeader: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
},

setsListInfo: {
  flex: 1,
  paddingRight: 12,
},

datePickerButton: {
  borderWidth: 1,
  borderColor: "#745437",
  backgroundColor: "rgba(20, 14, 9, 0.85)",
  borderRadius: 10,
  minHeight: 44,
  paddingHorizontal: 10,
  marginBottom: 8,
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
},

datePickerButtonText: {
  color: "#EFE7DB",
  fontSize: 13,
  fontWeight: "700",
},

datePickerPlaceholderText: {
  color: "#9A8E80",
  fontWeight: "500",
},

datePickerIcon: {
  fontSize: 16,
  marginLeft: 8,
},

setsListLabel: {
  color: "#E4B56D",
  fontSize: 11,
  fontWeight: "900",
  textTransform: "uppercase",
  letterSpacing: 1,
},

setsListName: {
  color: "#F8F2E8",
  fontSize: 22,
  fontWeight: "900",
  marginTop: 4,
},

setsListMeta: {
  color: "#D4C0A0",
  fontSize: 13,
  fontWeight: "800",
  marginTop: 6,
},

setsListDate: {
  color: "#9F8E78",
  fontSize: 11,
  fontWeight: "700",
  marginTop: 4,
},

setsListLogoBox: {
  width: 104,
  height: 72,
  borderRadius: 14,
  borderWidth: 1,
  borderColor: "rgba(228, 181, 109, 0.18)",
  backgroundColor: "rgba(8, 6, 4, 0.55)",
  alignItems: "center",
  justifyContent: "center",
  padding: 8,
},

setsListLogo: {
  width: "100%",
  height: "100%",
},

setsListLogoFallback: {
  color: "#E4B56D",
  fontSize: 14,
  fontWeight: "900",
},

setsListProgressRow: {
  flexDirection: "row",
  alignItems: "center",
  marginTop: 14,
},

setsListPercent: {
  color: "#F8E9CE",
  fontSize: 22,
  fontWeight: "900",
  width: 64,
},

setsListProgressTrack: {
  flex: 1,
  height: 8,
  borderRadius: 999,
  backgroundColor: "#24190D",
  overflow: "hidden",
},

setsListProgressFill: {
  height: "100%",
  borderRadius: 999,
  backgroundColor: "#E4B56D",
},

setsListButton: {
  marginTop: 14,
  height: 42,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: "#D6A45A",
  backgroundColor: "rgba(214, 164, 90, 0.14)",
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
},

setsListButtonText: {
  color: "#F3DFC2",
  fontSize: 13,
  fontWeight: "900",
},

setsListButtonIcon: {
  color: "#E4B56D",
  fontSize: 24,
  marginLeft: 8,
  marginTop: -2,
},

dashboardPokemonName: {
  color: "#F8F2E8",
  fontSize: 28,
  fontWeight: "900",
  marginTop: 2,
},

dashboardStatsGrid: {
  flexDirection: "row",
  flexWrap: "wrap",
  marginTop: 12,
  gap: 8,
},

dashboardStatBox: {
  width: "47%",
  borderWidth: 1,
  borderColor: "rgba(228, 181, 109, 0.18)",
  backgroundColor: "rgba(8, 6, 4, 0.55)",
  borderRadius: 12,
  paddingVertical: 8,
  paddingHorizontal: 8,
},

dashboardStatNumber: {
  color: "#F8E9CE",
  fontSize: 20,
  fontWeight: "900",
},

dashboardStatLabel: {
  color: "#B39E82",
  fontSize: 10,
  marginTop: 2,
  fontWeight: "700",
},

dashboardPokemonImageWrap: {
  width: 104,
  alignItems: "center",
  justifyContent: "center",
},

dashboardPokemonImage: {
  width: 92,
  height: 128,
  borderRadius: 12,
  transform: [{ rotate: "-7deg" }],
},

dashboardPokemonFallback: {
  width: 92,
  height: 128,
  borderRadius: 12,
  backgroundColor: "#0E0A07",
  alignItems: "center",
  justifyContent: "center",
},

dashboardPokemonFallbackText: {
  color: "#E4B56D",
  fontSize: 28,
  fontWeight: "900",
},

featuredSetCard: {
  marginBottom: 18,
  borderWidth: 1,
  borderColor: "rgba(228, 181, 109, 0.30)",
  backgroundColor: "rgba(18, 13, 9, 0.95)",
  borderRadius: 22,
  padding: 14,
},

featuredSetHeader: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
},

featuredSetInfo: {
  flex: 1,
  paddingRight: 12,
},

featuredSetLabel: {
  color: "#E4B56D",
  fontSize: 12,
  fontWeight: "900",
  textTransform: "uppercase",
  letterSpacing: 1,
},

featuredSetName: {
  color: "#F8F2E8",
  fontSize: 24,
  fontWeight: "900",
  marginTop: 6,
},

featuredSetMeta: {
  color: "#D4C0A0",
  fontSize: 14,
  fontWeight: "800",
  marginTop: 8,
},

featuredSetDate: {
  color: "#9F8E78",
  fontSize: 11,
  fontWeight: "700",
  marginTop: 4,
},

featuredSetLogoBox: {
  width: 110,
  height: 72,
  borderRadius: 14,
  borderWidth: 1,
  borderColor: "rgba(228, 181, 109, 0.18)",
  backgroundColor: "rgba(8, 6, 4, 0.55)",
  alignItems: "center",
  justifyContent: "center",
  padding: 8,
},

featuredSetLogo: {
  width: "100%",
  height: "100%",
},

featuredSetLogoFallback: {
  color: "#E4B56D",
  fontSize: 14,
  fontWeight: "900",
},

featuredSetProgressRow: {
  flexDirection: "row",
  alignItems: "center",
  marginTop: 14,
},

featuredSetPercent: {
  color: "#F8E9CE",
  fontSize: 22,
  fontWeight: "900",
  width: 64,
},

featuredSetProgressTrack: {
  flex: 1,
  height: 8,
  borderRadius: 999,
  backgroundColor: "#24190D",
  overflow: "hidden",
},

featuredSetProgressFill: {
  height: "100%",
  borderRadius: 999,
  backgroundColor: "#E4B56D",
},

featuredSetButton: {
  marginTop: 14,
  height: 42,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: "#D6A45A",
  backgroundColor: "rgba(214, 164, 90, 0.14)",
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
},

featuredSetButtonText: {
  color: "#F3DFC2",
  fontSize: 13,
  fontWeight: "900",
},

featuredSetButtonIcon: {
  color: "#E4B56D",
  fontSize: 24,
  marginLeft: 8,
  marginTop: -2,
},

collectionTrapezoidWrap: {
  width: "100%",
  height: 98,
  borderRadius: 12,
  overflow: "hidden",
  flexDirection: "row",
  backgroundColor: "#0E0A07",
  marginBottom: 8,
},

collectionTrapezoidSlice: {
  flex: 1,
  overflow: "hidden",
  backgroundColor: "#1B140E",
},

collectionTrapezoidLeft: {
  transform: [{ skewX: "-8deg" }],
  marginRight: -10,
  zIndex: 1,
},

collectionTrapezoidCenter: {
  zIndex: 3,
  borderLeftWidth: 1,
  borderRightWidth: 1,
  borderColor: "rgba(228, 181, 109, 0.28)",
},

collectionTrapezoidRight: {
  transform: [{ skewX: "8deg" }],
  marginLeft: -10,
  zIndex: 2,
},

collectionTrapezoidImage: {
  width: "130%",
  height: "100%",
  marginLeft: -12,
},

collectionTrapezoidEmpty: {
  flex: 1,
  backgroundColor: "#1B140E",
},

collectionTrapezoidCustomCover: {
  width: "100%",
  height: 98,
  borderRadius: 12,
  marginBottom: 8,
},

cardSearchPreview: {
  flexDirection: "row",
  alignItems: "center",
  borderWidth: 1,
  borderColor: "rgba(214, 164, 90, 0.25)",
  backgroundColor: "rgba(18, 13, 9, 0.92)",
  borderRadius: 12,
  padding: 10,
  marginBottom: 10,
},

cardSearchPreviewImage: {
  width: 72,
  height: 100,
  borderRadius: 8,
  backgroundColor: "#0E0A07",
},

cardSearchPreviewInfo: {
  flex: 1,
  marginLeft: 10,
},

cardSearchPreviewTitle: {
  color: "#F8E9CE",
  fontSize: 14,
  fontWeight: "900",
},

cardSearchPreviewText: {
  color: "#B39E82",
  fontSize: 12,
  marginTop: 4,
  fontWeight: "700",
},

cardFormFeedback: {
  color: "#E4B56D",
  fontSize: 12,
  fontWeight: "700",
  marginTop: 2,
  marginBottom: 8,
},

  authLoadingWrap: {
    flex: 1,
    backgroundColor: "#090909",
    alignItems: "center",
    justifyContent: "center",
  },
  authLoadingText: {
    color: "#F8E9CE",
    fontSize: 16,
    fontWeight: "700",
  },
  screen: {
    flex: 1,
    backgroundColor: "#090909",
  },
  glowTop: {
    position: "absolute",
    width: 260,
    height: 260,
    borderRadius: 999,
    top: -120,
    left: -80,
    backgroundColor: "rgba(212, 170, 90, 0.25)",
  },
  glowBottom: {
    position: "absolute",
    width: 280,
    height: 280,
    borderRadius: 999,
    bottom: -120,
    right: -100,
    backgroundColor: "rgba(212, 170, 90, 0.12)",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 110,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  greeting: {
    fontSize: 34,
    color: "#F8F2E8",
    fontWeight: "900",
  },
  subGreeting: {
    marginTop: 4,
    fontSize: 13,
    color: "#B8AFA4",
  },
 logoutButton: {
  paddingHorizontal: 0,
  paddingVertical: 0,
},
  logoutButtonText: {
    color: "#F8C2B9",
    fontSize: 12,
    fontWeight: "800",
  },
  avatarButton: {
    width: 56,
  height: 56,
  borderRadius: 28,
  borderWidth: 1,
  borderColor: "#846544",
  backgroundColor: "rgba(232, 168, 95, 0.15)",
  justifyContent: "center",
  alignItems: "center",
  },
  avatarIcon: {
  color: "#E8C38B",
  fontSize: 9,
  fontWeight: "900",
  textAlign: "center",
},
  searchBox: {
    borderWidth: 1,
    borderColor: "#745437",
    backgroundColor: "rgba(20, 14, 9, 0.85)",
    borderRadius: 12,
    minHeight: 44,
    paddingHorizontal: 12,
    alignItems: "center",
    flexDirection: "row",
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    color: "#EFE7DB",
    fontSize: 14,
  },
  searchIcon: {
    color: "#B79762",
    fontSize: 17,
    marginLeft: 10,
  },
  modeRow: {
    flexDirection: "row",
    marginBottom: 10,
  },
  modeChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    marginRight: 8,
    backgroundColor: "rgba(44, 30, 17, 0.8)",
    borderWidth: 1,
    borderColor: "rgba(120, 90, 58, 0.35)",
  },
  modeChipActive: {
    backgroundColor: "rgba(216, 170, 102, 0.9)",
    borderColor: "#D6A45A",
  },
  modeChipText: {
    fontSize: 13,
    color: "#BFA88A",
    fontWeight: "700",
  },
  modeChipTextActive: {
    color: "#24190D",
  },
  toolsRow: {
    flexDirection: "row",
    marginBottom: 10,
  },
  toolChip: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#4E3B26",
    backgroundColor: "#130F0B",
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
  },
  toolChipActive: {
    borderColor: "#D6A45A",
    backgroundColor: "rgba(214, 164, 90, 0.12)",
  },
  toolChipText: {
    color: "#C2AE94",
    fontSize: 12,
    fontWeight: "600",
  },
  toolChipTextActive: {
    color: "#F0D9B7",
  },
  rarityChip: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#4E3B26",
    backgroundColor: "#130F0B",
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
  },
  rarityChipPromo: {
    borderColor: "rgba(126, 186, 207, 0.45)",
    backgroundColor: "rgba(8, 27, 34, 0.9)",
  },
  rarityChipActive: {
    borderColor: "#D6A45A",
    backgroundColor: "rgba(214, 164, 90, 0.16)",
  },
  rarityChipPromoActive: {
    borderColor: "#7EBACF",
    backgroundColor: "rgba(78, 143, 165, 0.22)",
  },
  rarityChipText: {
    color: "#C2AE94",
    fontSize: 12,
    fontWeight: "600",
  },
  rarityChipTextPromo: {
    color: "#A7CBD8",
  },
  rarityChipTextActive: {
    color: "#F0D9B7",
  },
  rarityChipTextPromoActive: {
    color: "#D5EDF6",
  },
  setRow: {
    marginBottom: 8,
  },
  setChip: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#4F3A25",
    backgroundColor: "#17110A",
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
  },
  setChipActive: {
    borderColor: "#E2B36C",
    backgroundColor: "rgba(226, 179, 108, 0.18)",
  },
  setChipText: {
    color: "#BCA789",
    fontSize: 12,
  },
  setChipTextActive: {
    color: "#F3DFC2",
    fontWeight: "700",
  },
  sectionHeader: {
    marginTop: 12,
    marginBottom: 8,
  },
  sectionTitle: {
    color: "#F8F2E8",
    fontSize: 26,
    fontWeight: "900",
  },
  sectionSubtitle: {
    color: "#B3A99A",
    fontSize: 12,
    marginTop: 3,
  },
  horizontalList: {
    paddingBottom: 8,
  },
  cardTile: {
    width: "31.5%",
    marginBottom: 10,
    marginRight: "2.7%",
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(214, 164, 90, 0.25)",
  },
  cardTileCompact: {
    width: 138,
    marginRight: 10,
  },
  cardTileInner: {
    padding: 10,
    minHeight: 178,
  },
  cardImage: {
    width: "100%",
    height: 88,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: "#1B140E",
  },
  cardImageFull: {
    height: 180,
    backgroundColor: "#0E0A07",
  },
  cardName: {
    color: "#FBF6EF",
    fontWeight: "800",
    fontSize: 13,
  },
  cardSet: {
    marginTop: 4,
    color: "#D0B897",
    fontSize: 11,
  },
  cardMeta: {
    marginTop: 6,
    color: "#9F8E78",
    fontSize: 10,
  },
  cardBadge: {
    marginTop: 10,
    alignSelf: "flex-start",
    fontWeight: "700",
    fontSize: 10,
    borderRadius: 999,
    borderWidth: 1,
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  collectionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  collectionCard: {
    width: "48.5%",
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(214, 164, 90, 0.22)",
    backgroundColor: "rgba(18, 13, 9, 0.92)",
  },
  collectionSearchBox: {
  borderWidth: 1,
  borderColor: "#745437",
  backgroundColor: "rgba(20, 14, 9, 0.85)",
  borderRadius: 12,
  minHeight: 42,
  paddingHorizontal: 12,
  flexDirection: "row",
  alignItems: "center",
},
collectionSearchInput: {
  flex: 1,
  color: "#EFE7DB",
  fontSize: 14,
},
collectionSearchIcon: {
  color: "#B79762",
  fontSize: 17,
  marginLeft: 10,
},
  collectionSearchRow: {
    marginBottom: 12,
  },
  addCollectionCard: {
    width: "48.5%",
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(214, 164, 90, 0.35)",
    backgroundColor: "rgba(22, 16, 11, 0.92)",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 156,
  },
  addCollectionPlus: {
    color: "#E4B56D",
    fontSize: 42,
    fontWeight: "800",
    lineHeight: 42,
  },
  addCollectionLabel: {
    color: "#F3DFC2",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 8,
  },
  collectionThumbWrap: {
    width: "100%",
    height: 86,
    borderRadius: 10,
    overflow: "hidden",
    marginBottom: 8,
    backgroundColor: "#1B140E",
  },
  collectionThumbImage: {
    width: "100%",
    height: "100%",
  },
  collectionThumbCollage: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "stretch",
  },
  collectionThumbSlice: {
    flex: 1,
    borderRightWidth: 1,
    borderRightColor: "rgba(0, 0, 0, 0.35)",
  },
  collectionThumbSliceSingle: {
    flex: 0,
    width: "62%",
  },
  collectionThumbSliceDouble: {
    flex: 0,
    width: "46%",
  },
  collectionThumbSliceLast: {
    borderRightWidth: 0,
  },
  collectionThumbSliceImage: {
    width: "100%",
    height: "100%",
  },
  collectionThumbPlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  collectionThumbPlaceholderText: {
    color: "#9F8E78",
    fontSize: 11,
  },
  collectionName: {
    color: "#F4ECE0",
    fontWeight: "800",
    fontSize: 13,
  },
  collectionMeta: {
    color: "#B39E82",
    fontSize: 11,
    marginTop: 6,
  },
  collectionBadge: {
    color: "#E4B56D",
    fontSize: 11,
    marginTop: 8,
    fontWeight: "700",
  },
  newFolderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  newFolderInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#745437",
    backgroundColor: "rgba(20, 14, 9, 0.85)",
    borderRadius: 12,
    minHeight: 42,
    paddingHorizontal: 12,
    color: "#EFE7DB",
    fontSize: 14,
  },
  addRecentCardTile: {
    borderWidth: 1,
    borderColor: "rgba(214, 164, 90, 0.35)",
    backgroundColor: "rgba(22, 16, 11, 0.92)",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 120,
  },
  addRecentCardInner: {
    alignItems: "center",
    justifyContent: "center",
  },
  addRecentCardPlus: {
    color: "#E4B56D",
    fontSize: 32,
    fontWeight: "800",
  },
  addRecentCardLabel: {
    color: "#F3DFC2",
    fontSize: 10,
    fontWeight: "600",
    marginTop: 4,
  },
  collectionDeleteButton: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: "rgba(166, 58, 45, 0.3)",
    borderWidth: 1,
    borderColor: "#A63A2D",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  collectionDeleteButtonText: {
    color: "#F5B5AB",
    fontSize: 14,
    fontWeight: "800",
  },
  folderSearchRow: {
  flexDirection: "row",
  alignItems: "center",
  marginBottom: 12,
},
folderSearchBox: {
  flex: 1,
  flexDirection: "row",
  alignItems: "center",
  borderWidth: 1,
  borderColor: "#745437",
  backgroundColor: "rgba(20, 14, 9, 0.85)",
  borderRadius: 12,
  minHeight: 42,
  paddingHorizontal: 12,
  marginBottom: 0,
},
folderAddButton: {
  width: 36,
  height: 36,
  borderRadius: 8,
  backgroundColor: "rgba(214, 164, 90, 0.25)",
  borderWidth: 1,
  borderColor: "#D6A45A",
  alignItems: "center",
  justifyContent: "center",
  marginLeft: 8,
},
  folderAddButtonText: {
    color: "#E4B56D",
    fontSize: 20,
    fontWeight: "700",
  },
  folderSearchInput: {
    flex: 1,
    color: "#EFE7DB",
    fontSize: 14,
  },
  addPhotoFolderCard: {
    width: "48.5%",
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(214, 164, 90, 0.35)",
    backgroundColor: "rgba(22, 16, 11, 0.92)",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 100,
  },
  folderDeleteButton: {
    position: "absolute",
    top: 8,
    right: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#A63A2D",
    backgroundColor: "rgba(166, 58, 45, 0.25)",
    paddingHorizontal: 8,
    paddingVertical: 6,
    zIndex: 10,
  },
  folderDeleteButtonText: {
    color: "#F5B5AB",
    fontSize: 11,
    fontWeight: "700",
  },
  photoFolderList: { marginBottom: 8 },
  photoFolderCard: {
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(214, 164, 90, 0.22)",
    backgroundColor: "rgba(18, 13, 9, 0.92)",
  },
  photoFolderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  photoFolderName: { color: "#F4ECE0", fontWeight: "800", fontSize: 14 },
  photoFolderMeta: { color: "#B39E82", fontSize: 11, marginTop: 4 },
  photoAddRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  addPhotoButton: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D6A45A",
    backgroundColor: "rgba(214, 164, 90, 0.15)",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  addPhotoButtonText: { color: "#F3DFC2", fontSize: 11, fontWeight: "700" },
  photoFolderEmpty: { color: "#B5A693", fontSize: 12, marginBottom: 2 },
  photoPreviewRow: { paddingBottom: 4 },
  photoPreviewCard: { width: 100, marginRight: 10, position: "relative" },
  photoPreviewPressable: { borderRadius: 10, overflow: "hidden" },
  photoPreviewImage: {
    width: 100,
    height: 74,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(214, 164, 90, 0.25)",
    backgroundColor: "#1B140E",
  },
  photoDeleteButton: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 999,
    backgroundColor: "rgba(20, 12, 8, 0.9)",
    borderWidth: 1,
    borderColor: "#D6A45A",
    alignItems: "center",
    justifyContent: "center",
  },
  photoDeleteButtonText: { color: "#F7DEB7", fontSize: 10, fontWeight: "900" },
  photoPreviewTitle: { marginTop: 6, color: "#D0B897", fontSize: 11 },
  photoModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.82)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  photoModalCard: {
    width: "100%",
    backgroundColor: "#16110C",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#6B4F2F",
    padding: 12,
  },
  photoModalImage: {
    width: "100%",
    height: 360,
    borderRadius: 12,
    resizeMode: "contain",
    backgroundColor: "#0E0A07",
  },
  photoModalTitle: {
    color: "#F8E9CE",
    fontSize: 14,
    fontWeight: "700",
    marginTop: 10,
  },
  photoModalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 12,
  },
  photoModalRenameButton: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D6A45A",
    backgroundColor: "rgba(214, 164, 90, 0.18)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
  },
  photoModalRenameText: { color: "#F3DFC2", fontSize: 12, fontWeight: "700" },
  photoModalDeleteButton: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#A63A2D",
    backgroundColor: "rgba(166, 58, 45, 0.2)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
  },
  photoModalDeleteText: { color: "#F5B5AB", fontSize: 12, fontWeight: "700" },
  photoModalCloseButton: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D6A45A",
    backgroundColor: "rgba(214, 164, 90, 0.18)",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  photoModalCloseText: { color: "#F3DFC2", fontSize: 12, fontWeight: "700" },
  cardDetailsModalCard: {
    width: "100%",
    backgroundColor: "#16110C",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#6B4F2F",
    padding: 12,
  },
  cardDetailsImage: {
    width: "100%",
    height: 360,
    borderRadius: 12,
    resizeMode: "contain",
    backgroundColor: "#0E0A07",
  },
  cardDetailsTitle: {
    color: "#F8E9CE",
    fontSize: 18,
    fontWeight: "800",
    marginTop: 10,
  },
  cardDetailsInfoWrap: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: "rgba(214, 164, 90, 0.24)",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "rgba(18, 13, 9, 0.92)",
  },
  cardDetailsInfoLabel: { color: "#B39E82", fontSize: 11 },
  cardDetailsInfoValue: {
    color: "#F3DFC2",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 2,
  },
  photoRenameCard: {
    width: "100%",
    backgroundColor: "#16110C",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#6B4F2F",
    padding: 12,
  },
  photoRenameTitle: {
    color: "#F8E9CE",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 10,
  },
  photoRenameInput: {
    borderWidth: 1,
    borderColor: "#745437",
    backgroundColor: "rgba(20, 14, 9, 0.85)",
    borderRadius: 10,
    minHeight: 40,
    paddingHorizontal: 10,
    color: "#EFE7DB",
    fontSize: 13,
    marginBottom: 8,
  },
  pickImageButton: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D6A45A",
    backgroundColor: "rgba(214, 164, 90, 0.18)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  pickImageText: { color: "#F3DFC2", fontSize: 12, fontWeight: "700" },
  newCardPreview: {
    width: "100%",
    height: 140,
    borderRadius: 10,
    marginBottom: 10,
    backgroundColor: "#1B140E",
  },
  raritySelector: { flexDirection: "row", flexWrap: "wrap", marginTop: 4 },
  rarityOption: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#4E3B26",
    backgroundColor: "#130F0B",
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginRight: 8,
    marginBottom: 8,
  },
  rarityOptionActive: {
    borderColor: "#D6A45A",
    backgroundColor: "rgba(214, 164, 90, 0.16)",
  },
  rarityOptionText: { color: "#C2AE94", fontSize: 11, fontWeight: "700" },
  rarityOptionTextActive: { color: "#F0D9B7" },
  favoritePokemonCard: {
  marginTop: 14,
  marginBottom: 18,
  borderWidth: 1,
  borderColor: "rgba(228, 181, 109, 0.28)",
  backgroundColor: "rgba(18, 13, 9, 0.94)",
  borderRadius: 20,
  padding: 14,
  flexDirection: "row",
  justifyContent: "space-between",
  overflow: "hidden",
},

favoritePokemonInfo: {
  flex: 1,
  paddingRight: 12,
},

favoritePokemonLabel: {
  color: "#E4B56D",
  fontSize: 12,
  fontWeight: "900",
  textTransform: "uppercase",
  letterSpacing: 0.6,
},

favoritePokemonName: {
  color: "#F8F2E8",
  fontSize: 26,
  fontWeight: "900",
  marginTop: 5,
},

favoritePokemonSub: {
  color: "#C9BA93",
  fontSize: 13,
  marginTop: 4,
  fontWeight: "600",
},

favoritePokemonUpdate: {
  color: "#8F7B61",
  fontSize: 11,
  marginTop: 8,
  fontWeight: "700",
},

favoritePokemonRight: {
  width: 132,
  alignItems: "flex-end",
  justifyContent: "space-between",
},

favoritePokemonPercentBadge: {
  borderWidth: 1,
  borderColor: "rgba(228, 181, 109, 0.35)",
  backgroundColor: "rgba(228, 181, 109, 0.14)",
  borderRadius: 999,
  paddingHorizontal: 10,
  paddingVertical: 5,
},

favoritePokemonPercentText: {
  color: "#F3DFC2",
  fontSize: 12,
  fontWeight: "900",
},

favoritePokemonImagesWrap: {
  width: 126,
  height: 94,
  marginTop: 8,
  position: "relative",
},

favoritePokemonImage: {
  position: "absolute",
  width: 56,
  height: 82,
  borderRadius: 8,
  borderWidth: 1,
  borderColor: "rgba(228, 181, 109, 0.35)",
  backgroundColor: "#0E0A07",
},

favoritePokemonImageLeft: {
  left: 0,
  top: 10,
  transform: [{ rotate: "-8deg" }],
  zIndex: 1,
},

favoritePokemonImageCenter: {
  left: 34,
  top: 0,
  transform: [{ rotate: "0deg" }],
  zIndex: 3,
},

favoritePokemonImageRight: {
  left: 68,
  top: 10,
  transform: [{ rotate: "8deg" }],
  zIndex: 2,
},
  collectionModalCard: {
    width: "100%",
    maxHeight: "80%",
    backgroundColor: "#16110C",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#6B4F2F",
    padding: 12,
  },
  collectionModalScroll: { marginTop: 10 },
  collectionCardRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(214, 164, 90, 0.22)",
    borderRadius: 10,
    padding: 8,
    marginBottom: 8,
    backgroundColor: "rgba(18, 13, 9, 0.92)",
  },
  collectionCardRowImage: {
    width: 52,
    height: 52,
    borderRadius: 8,
    backgroundColor: "#1B140E",
  },
  collectionCardRowMeta: { flex: 1, marginHorizontal: 8 },
  collectionCardRowTitle: { color: "#F8E9CE", fontSize: 12, fontWeight: "700" },
  collectionCardRowSub: { color: "#B39E82", fontSize: 10, marginTop: 3 },
  collectionToggleButton: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D6A45A",
    backgroundColor: "rgba(214, 164, 90, 0.15)",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  collectionToggleButtonActive: {
    borderColor: "#A63A2D",
    backgroundColor: "rgba(166, 58, 45, 0.2)",
  },
  collectionToggleButtonText: {
    color: "#F3DFC2",
    fontSize: 11,
    fontWeight: "700",
  },
  collectionToggleButtonTextActive: { color: "#F5B5AB" },
  collectionCoverRow: {
    flexDirection: "row",
    justifyContent: "flex-start",
    marginTop: 8,
  },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cardPhotoOnlyPressable: {
    width: "31.5%",
    marginBottom: 10,
    marginRight: "2.7%",
  },
  cardPhotoOnlyImage: {
    width: "100%",
    height: 190,
    backgroundColor: "transparent",
  },
  setPhotoOnlyPressable: { width: 138, marginRight: 10 },
  setPhotoOnlyImage: {
    width: "100%",
    height: 190,
    backgroundColor: "transparent",
  },
  setSection: { marginTop: 6, marginBottom: 4 },
  setSectionTitle: {
    color: "#F5EADF",
    fontWeight: "800",
    fontSize: 16,
    marginBottom: 8,
  },
  emptyText: { color: "#B5A693", marginTop: 8, marginBottom: 10 },
  bottomNav: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#5A4128",
    backgroundColor: "rgba(22, 15, 10, 0.95)",
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  navItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    paddingVertical: 10,
  },
  navItemActive: {
    backgroundColor: "rgba(228, 178, 99, 0.22)",
    borderWidth: 1,
    borderColor: "#D8A85D",
  },
  navLabel: { color: "#BCA486", fontWeight: "700", fontSize: 11 },
  navLabelActive: { color: "#F8E9CE" },
});
