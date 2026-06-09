import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import BASE_URL from '../../apiService/api';

const AUTH_SESSION_STORAGE_KEY = 'estante:authUser:v1';

type UsuarioApi = {
  id: string | number;
  usuario: string;
  senha?: string;
  nick?: string;
  avatarUrl?: string;
  bio?: string;
};

type FotoPerfilApi = {
  id: string;
  userId: string;
  folderId?: string;
  titulo?: string;
  imageUrl: string;
  createdAt?: string;
};

export default function ProfileScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ userId?: string }>();

  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [userId, setUserId] = useState<string>('');
  const [usuarioLogin, setUsuarioLogin] = useState('');
  const [nick, setNick] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [fotos, setFotos] = useState<FotoPerfilApi[]>([]);
  const [legendaNovaFoto, setLegendaNovaFoto] = useState('');

  const tituloHeader = useMemo(() => nick.trim() || usuarioLogin || 'Treinador', [nick, usuarioLogin]);

  const carregarPerfil = useCallback(async () => {
    setCarregando(true);
    try {
      const usuarioSessao = (await AsyncStorage.getItem(AUTH_SESSION_STORAGE_KEY))?.trim() || '';
      if (!usuarioSessao) {
        Alert.alert('Sessao expirada', 'Faca login novamente.');
        router.replace('/');
        return;
      }

      const respostaUsuario = await fetch(`${BASE_URL}/users?usuario=${encodeURIComponent(usuarioSessao)}`);
      if (!respostaUsuario.ok) {
        throw new Error('Falha ao carregar usuario');
      }

      const usuarios = (await respostaUsuario.json()) as UsuarioApi[];
      const usuario = usuarios.find((item) => item.usuario?.toLowerCase() === usuarioSessao.toLowerCase());

      if (!usuario || usuario.id === undefined || usuario.id === null) {
        Alert.alert('Sessao invalida', 'Usuario nao encontrado.');
        router.replace('/');
        return;
      }

      const idNormalizado = String(usuario.id);

      if (params.userId && params.userId !== idNormalizado) {
        Alert.alert('Acesso negado', 'Voce so pode visualizar o proprio perfil.');
        router.replace('/home');
        return;
      }

      setUserId(idNormalizado);
      setUsuarioLogin(usuario.usuario || '');
      setNick(usuario.nick || usuario.usuario || '');
      setBio(usuario.bio || '');
      setAvatarUrl(usuario.avatarUrl || '');

      const respostaFotos = await fetch(`${BASE_URL}/photos?userId=${encodeURIComponent(idNormalizado)}`);
      if (!respostaFotos.ok) {
        throw new Error('Falha ao carregar fotos');
      }

      const fotosUsuario = (await respostaFotos.json()) as FotoPerfilApi[];
      const fotosOrdenadas = [...fotosUsuario].sort((a, b) => {
        const dataA = a.createdAt || '';
        const dataB = b.createdAt || '';
        return dataB.localeCompare(dataA);
      });

      setFotos(fotosOrdenadas);
    } catch {
      Alert.alert('Erro', 'Nao foi possivel carregar o perfil.');
    } finally {
      setCarregando(false);
    }
  }, [params.userId, router]);

  useEffect(() => {
    carregarPerfil();
  }, [carregarPerfil]);

  const salvarPerfil = async () => {
    if (!userId) {
      Alert.alert('Erro', 'Usuario nao identificado.');
      return;
    }

    setSalvando(true);
    try {
      const resposta = await fetch(`${BASE_URL}/users/${encodeURIComponent(userId)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nick: nick.trim(),
          bio: bio.trim(),
          avatarUrl: avatarUrl.trim(),
        }),
      });

      if (!resposta.ok) {
        throw new Error('Falha ao salvar perfil');
      }

      Alert.alert('Sucesso', 'Perfil atualizado com sucesso.');
    } catch {
      Alert.alert('Erro', 'Nao foi possivel salvar o perfil.');
    } finally {
      setSalvando(false);
    }
  };

  const selecionarAvatar = async () => {
    const resposta = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9,
    });

    if (resposta.canceled || !resposta.assets?.length) {
      return;
    }

    const uri = resposta.assets[0]?.uri || '';
    if (!uri) {
      Alert.alert('Erro', 'Nao foi possivel carregar a imagem selecionada.');
      return;
    }

    setAvatarUrl(uri);
  };

  const publicarFoto = async () => {
    if (!userId) {
      Alert.alert('Erro', 'Usuario nao identificado para publicar foto.');
      return;
    }

    const resposta = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.9,
    });

    if (resposta.canceled || !resposta.assets?.length) {
      return;
    }

    const uri = resposta.assets[0]?.uri || '';
    if (!uri) {
      Alert.alert('Erro', 'Upload invalido: URL da imagem ausente.');
      return;
    }

    const novaFoto: FotoPerfilApi = {
      id: `profile-photo-${Date.now()}`,
      userId,
      folderId: 'perfil',
      titulo: legendaNovaFoto.trim() || 'Foto do perfil',
      imageUrl: uri,
      createdAt: new Date().toISOString(),
    };

    setSalvando(true);
    try {
      const salvar = await fetch(`${BASE_URL}/photos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(novaFoto),
      });

      if (!salvar.ok) {
        throw new Error('Falha ao publicar foto');
      }

      setFotos((anterior) => [novaFoto, ...anterior]);
      setLegendaNovaFoto('');
      Alert.alert('Sucesso', 'Foto publicada no seu perfil.');
    } catch {
      Alert.alert('Erro', 'Nao foi possivel publicar a foto.');
    } finally {
      setSalvando(false);
    }
  };

  if (carregando) {
    return (
      <View style={styles.loadingWrap}>
        <Text style={styles.loadingText}>Carregando perfil...</Text>
      </View>
    );
  }

  return (
    <LinearGradient
      colors={['#070707', '#0E0A07', '#15100A']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.screen}
    >
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Voltar</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Perfil</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.card}>
          <View style={styles.avatarRow}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarPlaceholderText}>{tituloHeader.slice(0, 1).toUpperCase()}</Text>
              </View>
            )}
            <View style={styles.userInfo}>
              <Text style={styles.name}>{tituloHeader}</Text>
              <Text style={styles.userLogin}>@{usuarioLogin || 'usuario'}</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.secondaryButton} onPress={selecionarAvatar}>
            <Text style={styles.secondaryButtonText}>Alterar avatar</Text>
          </TouchableOpacity>

          <Text style={styles.label}>Nick</Text>
          <TextInput
            value={nick}
            onChangeText={setNick}
            style={styles.input}
            placeholder="Seu nick"
            placeholderTextColor="#9A8E80"
          />

          <Text style={styles.label}>Bio</Text>
          <TextInput
            value={bio}
            onChangeText={setBio}
            style={[styles.input, styles.bioInput]}
            placeholder="Escreva sua bio"
            placeholderTextColor="#9A8E80"
            multiline
          />

          <TouchableOpacity style={styles.primaryButton} onPress={salvarPerfil} disabled={salvando}>
            <Text style={styles.primaryButtonText}>{salvando ? 'Salvando...' : 'Salvar perfil'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Feed de fotos</Text>
          <TextInput
            value={legendaNovaFoto}
            onChangeText={setLegendaNovaFoto}
            style={styles.input}
            placeholder="Legenda da nova foto"
            placeholderTextColor="#9A8E80"
          />
          <TouchableOpacity style={styles.primaryButton} onPress={publicarFoto} disabled={salvando}>
            <Text style={styles.primaryButtonText}>{salvando ? 'Publicando...' : 'Publicar foto'}</Text>
          </TouchableOpacity>

          {fotos.length === 0 ? (
            <Text style={styles.emptyText}>Voce ainda nao publicou fotos no perfil.</Text>
          ) : (
            <View style={styles.feedGrid}>
              {fotos.map((foto) => (
                <View key={foto.id} style={styles.photoCard}>
                  <Image source={{ uri: foto.imageUrl }} style={styles.photo} />
                  <Text style={styles.photoTitle} numberOfLines={1}>{foto.titulo || 'Foto do perfil'}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0B0B0B',
  },
  loadingText: {
    color: '#F2E6C8',
    fontSize: 16,
  },
  screen: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 22,
    paddingBottom: 28,
    gap: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  backButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#7E6A3A',
    borderRadius: 10,
  },
  backButtonText: {
    color: '#DCC07C',
    fontWeight: '700',
  },
  title: {
    color: '#F2E6C8',
    fontSize: 20,
    fontWeight: '800',
  },
  placeholder: {
    width: 62,
  },
  card: {
    borderWidth: 1,
    borderColor: '#3A2E17',
    borderRadius: 14,
    padding: 14,
    backgroundColor: 'rgba(18,14,9,0.95)',
    gap: 10,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 66,
    height: 66,
    borderRadius: 33,
    borderWidth: 1,
    borderColor: '#7E6A3A',
  },
  avatarPlaceholder: {
    width: 66,
    height: 66,
    borderRadius: 33,
    borderWidth: 1,
    borderColor: '#7E6A3A',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2D2312',
  },
  avatarPlaceholderText: {
    color: '#F2E6C8',
    fontSize: 24,
    fontWeight: '900',
  },
  userInfo: {
    flex: 1,
  },
  name: {
    color: '#F2E6C8',
    fontSize: 18,
    fontWeight: '800',
  },
  userLogin: {
    color: '#C9BA93',
  },
  label: {
    color: '#DCC07C',
    fontWeight: '700',
    marginTop: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#4A3A21',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
    color: '#F2E6C8',
    backgroundColor: '#1A130A',
  },
  bioInput: {
    minHeight: 84,
    textAlignVertical: 'top',
  },
  primaryButton: {
    marginTop: 6,
    borderRadius: 10,
    backgroundColor: '#7E6A3A',
    paddingVertical: 10,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#1A130A',
    fontWeight: '900',
  },
  secondaryButton: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#7E6A3A',
    paddingVertical: 9,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#DCC07C',
    fontWeight: '700',
  },
  sectionTitle: {
    color: '#F2E6C8',
    fontSize: 16,
    fontWeight: '800',
  },
  emptyText: {
    color: '#C9BA93',
  },
  feedGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  photoCard: {
    width: '48%',
    borderWidth: 1,
    borderColor: '#4A3A21',
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#1A130A',
  },
  photo: {
    width: '100%',
    height: 120,
    backgroundColor: '#0F0F0F',
  },
  photoTitle: {
    color: '#E8D8AF',
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 12,
  },
});
