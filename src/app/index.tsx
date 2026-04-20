// app/index.tsx
import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import BASE_URL from '../../apiService/api';

type AuthMode = 'login' | 'cadastro';


import AsyncStorage from '@react-native-async-storage/async-storage';

const AUTH_SESSION_STORAGE_KEY = 'estante:authUser:v1';

type ApiUser = {
  id?: string | number;
  usuario: string;
  senha: string;
};

export default function LoginScreen() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [senhaVisivel, setSenhaVisivel] = useState(false);
  const [confirmarVisivel, setConfirmarVisivel] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const tituloAcao = useMemo(() => (mode === 'login' ? 'Entrar' : 'Cadastrar'), [mode]);

  const handleLogin = async () => {
    const usuarioTrim = usuario.trim();

    if (!usuarioTrim || !senha) {
      Alert.alert('Campos obrigatorios', 'Informe usuario e senha.');
      return;
    }

    setLoading(true);

    try {
      const resposta = await fetch(`${BASE_URL}/users?usuario=${encodeURIComponent(usuarioTrim)}`);

      if (!resposta.ok) {
        throw new Error('Falha ao consultar usuarios');
      }

      const usuarios = (await resposta.json()) as ApiUser[];
      const usuarioEncontrado = usuarios.find(
        (item) => item.usuario?.toLowerCase() === usuarioTrim.toLowerCase() && item.senha === senha
      );

      if (!usuarioEncontrado) {
        Alert.alert('Login invalido', 'Usuario ou senha incorretos.');
        return;
      }

      await AsyncStorage.setItem(AUTH_SESSION_STORAGE_KEY, usuarioEncontrado.usuario);
      router.push({
        pathname: '/home',
        params: { nome: usuarioEncontrado.usuario },
      });
    } catch {
      Alert.alert('Erro', 'Nao foi possivel fazer login. Verifique o json-server.');
    } finally {
      setLoading(false);
    }
  };

  const handleCadastro = async () => {
    const usuarioTrim = usuario.trim();

    if (!usuarioTrim || !senha || !confirmarSenha) {
      Alert.alert('Campos obrigatorios', 'Preencha usuario, senha e confirmar senha.');
      return;
    }

    if (senha !== confirmarSenha) {
      Alert.alert('Erro', 'As senhas nao conferem.');
      return;
    }

    if (senha.length < 4) {
      Alert.alert('Erro', 'A senha deve ter pelo menos 4 caracteres.');
      return;
    }

    setLoading(true);

    try {
      const checkResposta = await fetch(
        `${BASE_URL}/users?usuario=${encodeURIComponent(usuarioTrim)}`
      );

      if (!checkResposta.ok) {
        throw new Error('Falha ao verificar usuario existente');
      }

      const usuariosExistentes = (await checkResposta.json()) as ApiUser[];
      const usuarioJaExiste = usuariosExistentes.some(
        (item) => item.usuario?.toLowerCase() === usuarioTrim.toLowerCase()
      );

      if (usuarioJaExiste) {
        Alert.alert('Cadastro invalido', 'Esse usuario ja existe. Escolha outro nome.');
        return;
      }

      const resposta = await fetch(`${BASE_URL}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          usuario: usuarioTrim,
          senha,
          cards: [],
          collections: [],
          photoFolders: [
            { id: 'favoritas', nome: 'Cartas favoritas', fotos: [] },
            { id: 'binder', nome: 'Binder', fotos: [] },
            { id: 'outras', nome: 'Outras', fotos: [] },
          ],
        }),
      });

      if (!resposta.ok) {
        throw new Error('Falha ao cadastrar usuario');
      }

      Alert.alert('Sucesso', 'Cadastro realizado! Agora faca login.');
      setMode('login');
      setSenha('');
      setConfirmarSenha('');
      setUsuario('');
    } catch {
      Alert.alert('Erro', 'Nao foi possivel cadastrar. Verifique o json-server.');
    } finally {
      setLoading(false);
    }
  };

  const handleMainAction = () => {
    if (loading) {
      return;
    }
    if (mode === 'login') {
      handleLogin();
      return;
    }
    handleCadastro();
  };

  const switchMode = () => {
    setMode((prev) => (prev === 'login' ? 'cadastro' : 'login'));
    setSenha('');
    setConfirmarSenha('');
  };

  return (
    <LinearGradient
      colors={['#070707', '#100d05', '#171204']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 24 : 0}
      >
        <View style={styles.card}>
          <LinearGradient
            pointerEvents="none"
            colors={[
              'rgba(212, 175, 55, 0.2)',
              'rgba(212, 175, 55, 0.11)',
              'rgba(212, 175, 55, 0.04)',
              'transparent',
            ]}
            locations={[0, 0.35, 0.72, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.goldGlowTop}
          />
          <LinearGradient
            pointerEvents="none"
            colors={[
              'rgba(212, 175, 55, 0.18)',
              'rgba(212, 175, 55, 0.1)',
              'rgba(212, 175, 55, 0.03)',
              'transparent',
            ]}
            locations={[0, 0.38, 0.74, 1]}
            start={{ x: 1, y: 1 }}
            end={{ x: 0, y: 0 }}
            style={styles.goldGlowBottom}
          />

          <ScrollView
            style={styles.contentLayer}
            contentContainerStyle={styles.contentLayerInner}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.hero}>
              <View style={styles.logo} pointerEvents="none">
                <Image source={require('../../assets/logoestante.png')} style={styles.logoimagem} />
              </View>
              <View style={styles.heroTexto}>
                <Text style={styles.titulo}>Treinador, sua coleção te aguarda!</Text>
                <Text style={styles.subtitulo}>
                  {mode === 'login' ? 'Faca login para continuar' : 'Crie sua conta para começar'}
                </Text>
              </View>
              <View style={styles.ilustracao} pointerEvents="none">
                <Image source={require('../../assets/cartapokemon.png')} style={styles.imagem} />
              </View>
            </View>

            <View style={styles.inputWrapper}>
              <Text style={styles.label}>Usuário</Text>
              <TextInput
                style={styles.input}
                placeholder="Digite seu usuário"
                placeholderTextColor="#aaa"
                value={usuario}
                onChangeText={setUsuario}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputWrapper}>
              <Text style={styles.label}>Senha</Text>
              <View style={styles.senhaContainer}>
                <TextInput
                  style={styles.inputSenha}
                  placeholder="Digite sua senha"
                  placeholderTextColor="#aaa"
                  value={senha}
                  onChangeText={setSenha}
                  secureTextEntry={!senhaVisivel}
                />
                <TouchableOpacity onPress={() => setSenhaVisivel(!senhaVisivel)} style={styles.olhoBtn}>
                  <Text style={styles.olhoIcon}>{senhaVisivel ? '🙈' : '👁️'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {mode === 'cadastro' && (
              <View style={styles.inputWrapper}>
                <Text style={styles.label}>Confirmar senha</Text>
                <View style={styles.senhaContainer}>
                  <TextInput
                    style={styles.inputSenha}
                    placeholder="Confirme sua senha"
                    placeholderTextColor="#aaa"
                    value={confirmarSenha}
                    onChangeText={setConfirmarSenha}
                    secureTextEntry={!confirmarVisivel}
                  />
                  <TouchableOpacity
                    onPress={() => setConfirmarVisivel(!confirmarVisivel)}
                    style={styles.olhoBtn}
                  >
                    <Text style={styles.olhoIcon}>{confirmarVisivel ? '🙈' : '👁️'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <TouchableOpacity style={styles.botao} onPress={handleMainAction} disabled={loading}>
              <LinearGradient
                colors={[
                  'rgba(212, 184, 106, 0.2)',
                  'rgba(229, 200, 120, 0.4)',
                  'rgba(201, 179, 102, 0.6)',
                ]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={styles.botaoGradient}
              >
                <Text style={styles.botaoTexto}>{loading ? 'Carregando...' : tituloAcao}</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryActionButton} onPress={switchMode}>
              <Text style={styles.secondaryActionText}>
                {mode === 'login' ? 'Nao tem conta? Cadastre-se' : 'Ja tem conta? Voltar para login'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 0,
  },
  card: {
    width: '100%',
    height: '82%',
    alignSelf: 'center',
    backgroundColor: '#151516',
    borderRadius: 24,
    padding: 24,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    paddingHorizontal: 20,
    paddingTop: 28,
    position: 'relative',
    overflow: 'hidden',
  },
  contentLayer: {
    zIndex: 2,
    flex: 1,
  },
  contentLayerInner: {
    paddingBottom: 24,
  },
  logo: {
    position: 'absolute',
    top: -120,
    left: 36,
    zIndex: 3,
  },
  logoimagem: {
    width: 230,
    height: 100,
    resizeMode: 'contain',
    opacity: 0.7,
  },
  goldGlowTop: {
    position: 'absolute',
    top: -170,
    left: -92,
    width: 330,
    height: 330,
    borderRadius: 999,
    opacity: 0.6,
    zIndex: 1,
  },
  goldGlowBottom: {
    position: 'absolute',
    bottom: -122,
    right: -88,
    width: 350,
    height: 330,
    borderRadius: 999,
    opacity: 0.2,
    zIndex: 1,
  },
  hero: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 120,
    marginBottom: -40,
  },
  heroTexto: {
    marginBottom: 1,
    width: '58%',
  },
  titulo: {
    fontSize: 28,
    fontWeight: '900',
    color: '#fff',
    textAlign: 'left',
    width: '100%',
    lineHeight: 30,
    marginBottom: 8,
  },
  subtitulo: {
    fontSize: 14,
    color: '#f2f2f2',
    textAlign: 'left',
    width: '100%',
    marginBottom: 0,
  },
  label: {
    color: '#e2e8f0',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  inputWrapper: {
    marginBottom: 16,
    zIndex: 10,
    position: 'relative',
  },
  input: {
    backgroundColor: '#282827',
    color: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#2e3000',
  },
  senhaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#282827',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2e3000',
  },
  inputSenha: {
    flex: 1,
    color: '#e2e8f0',
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  botao: {
    borderRadius: 999,
    overflow: 'hidden',
    marginTop: 12,
    shadowColor: '#e9d358c4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.32,
    shadowRadius: 10,
    elevation: 6,
    zIndex: 10,
    position: 'relative',
  },
  botaoGradient: {
    width: '100%',
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 999,
  },
  botaoTexto: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  olhoBtn: {
    paddingHorizontal: 12,
  },
  olhoIcon: {
    fontSize: 20,
  },
  secondaryActionButton: {
    marginTop: 14,
    alignItems: 'center',
  },
  secondaryActionText: {
    color: '#dfc57e',
    fontSize: 13,
    fontWeight: '600',
  },
  ilustracao: {
    width: '42%',
    alignItems: 'flex-end',
    marginBottom: -50,
  },
  imagem: {
    marginRight: -14,
    width: 300,
    height: 265,
    resizeMode: 'contain',
    opacity: 0.6,
  },
});
