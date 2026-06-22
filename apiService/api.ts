import { Platform } from "react-native";

/**
 * Web e celular não enxergam o localhost do mesmo jeito.
 * - Web: o navegador roda na sua máquina, então localhost funciona.
 * - Android emulator: 10.0.2.2 aponta para a máquina host.
 * - Celular físico: use o IP da sua máquina na mesma rede Wi-Fi.
 */
const API_PORT = "3000";
const API_HOST_WEB = "localhost";
const API_HOST_ANDROID_EMULATOR = "10.0.2.2";

// Se estiver usando celular físico e já existe um IP funcionando, coloque ele aqui.
// Exemplo: "192.168.0.25"
const API_HOST_CELULAR_FISICO = API_HOST_ANDROID_EMULATOR;

const BASE_URL =
  Platform.OS === "web"
    ? `http://10.0.43.210:${API_PORT}`    
    : `http://10.0.43.210:${API_PORT}`;

export default BASE_URL;
