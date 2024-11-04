import { useEffect, useState } from "react";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Accelerometer } from "expo-sensors";
import { Vibration, Platform } from "react-native";
import { StyleSheet, Text, TouchableOpacity, View, Button } from "react-native";
import Slider from "@react-native-community/slider";

// Constantes para detecção de chacoalhada
const SHAKE_THRESHOLD = 1.5; // Força mínima para detectar uma chacoalhada
const SHAKE_DELAY = 1000; // Delay entre detecções de chacoalhada (em milissegundos)

const MORSE_SOS = [0.3, 0.3, 0.3, 0.9, 0.9, 0.9, 0.3, 0.3, 0.3]; // Padrão de tempo do S.O.S em segundos

export default function App() {
  // Hooks para gerenciar permissões da câmera
  const [permission, requestPermission] = useCameraPermissions();

  // Estados para controlar diferentes aspectos da lanterna e sensores
  const [flashOn, setFlashOn] = useState(false); // Estado da lanterna (ligada/desligada)
  const [isStrobeOn, setIsStrobeOn] = useState(false); // Modo estroboscópio (ativo/inativo)
  const [isSosOn, setIsSosOn] = useState(false); // Modo S.O.S (ativo/inativo)
  const [lastShake, setLastShake] = useState(0); // Timestamp da última chacoalhada
  const [data, setData] = useState({ x: 0, y: 0, z: 0 }); // Dados do acelerômetro
  const [intensity, setIntensity] = useState(0.5); // Intensidade da lanterna (0.1 a 1.0)
  const [isShake, setIsShake] = useState(true);

  // Efeito para monitorar o acelerômetro e detectar chacoalhadas
  useEffect(() => {
    // Define intervalo de atualização do acelerômetro (100ms)
    Accelerometer.setUpdateInterval(100);

    // Inscreve no listener do acelerômetro
    const subscription = Accelerometer.addListener((accelerometerData) => {
      setData(accelerometerData);

      // Calcula a força total do movimento usando o teorema de Pitágoras 3D
      const { x, y, z } = accelerometerData;
      const totalForce = Math.sqrt(x * x + y * y + z * z);
      const now = Date.now();

      // Se detectar chacoalhada, alterna o estado da lanterna
      if (
        totalForce > SHAKE_THRESHOLD &&
        now - lastShake > SHAKE_DELAY &&
        isShake
      ) {
        setLastShake(now);
        setFlashOn((prevState) => !prevState);
        Vibration.vibrate(200);
      }
    });

    // Limpa o listener quando o componente é desmontado
    return () => {
      subscription && subscription.remove();
    };
  }, [lastShake, isShake]);

  // Efeito para controlar o modo estroboscópio
  useEffect(() => {
    let strobeInterval: NodeJS.Timeout | undefined;

    if (isStrobeOn) {
      // Alterna a lanterna a cada 100ms quando o modo estroboscópio está ativo
      strobeInterval = setInterval(() => {
        setFlashOn((prev) => !prev);
      }, 100);
    } else {
      // Limpa o intervalo e desliga a lanterna quando desativa o modo estroboscópio
      clearInterval(strobeInterval);
      setFlashOn(false);
    }

    return () => clearInterval(strobeInterval);
  }, [isStrobeOn]);

  // Função para executar o sinal de S.O.S em código Morse
  const playSosSignal = () => {
    setIsSosOn(true); // Ativa o modo S.O.S e desativa os outros modos
    let index = 0;

    const sosInterval = setInterval(() => {
      if (index < MORSE_SOS.length) {
        setFlashOn((prev) => !prev); // Alterna o estado da lanterna conforme o padrão Morse
        index++;
      } else {
        clearInterval(sosInterval); // Termina o padrão S.O.S
        setFlashOn(false); // Garante que a lanterna esteja desligada ao final
        setIsSosOn(false); // Desativa o modo S.O.S
      }
    }, MORSE_SOS[index] * 1000); // Define a duração do flash conforme o padrão
  };

  // Função para controlar a intensidade da lanterna
  const handleIntensityChange = (value: number) => {
    setIntensity(value);
  };

  // Renderiza tela de carregamento enquanto verifica permissões
  if (!permission) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>Carregando...</Text>
      </View>
    );
  }

  // Renderiza tela de solicitação de permissão
  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>
          Precisamos da sua permissão para acessar a lanterna
        </Text>
        <Button onPress={requestPermission} title="Permitir acesso" />
      </View>
    );
  }

  // Renderiza a interface principal do aplicativo
  return (
    <View style={styles.container}>
      {/* CameraView invisível usado para controlar a lanterna */}
      <CameraView style={styles.hiddenCamera} enableTorch={flashOn} />

      <View style={styles.contentContainer}>
        {/* Interface do modo estroboscópio */}
        {isStrobeOn || isSosOn ? (
          <>
            <Text style={styles.statusText}>
              Modo {isStrobeOn ? "Estroboscópio" : "S.O.S"}
            </Text>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: "#bebebe" }]}
              activeOpacity={1}
            >
              <Text style={styles.buttonText}>
                {isStrobeOn ? "Estroboscópio Ativado" : "S.O.S Ativado"}
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            {/* Interface do modo normal */}
            <Text style={styles.statusText}>
              Lanterna {flashOn ? "Ligada" : "Desligada"}
            </Text>

            <TouchableOpacity
              style={[
                styles.button,
                { backgroundColor: flashOn ? "#f44336" : "#4CAF50" },
              ]}
              onPress={() => {
                setFlashOn(!flashOn);
                Vibration.vibrate(100);
              }}
              disabled={isSosOn} // Desativa se o S.O.S estiver ativo
            >
              <Text style={styles.buttonText}>
                {flashOn ? "Desligar Lanterna" : "Ligar Lanterna"}
              </Text>
            </TouchableOpacity>

            {/* Controle de intensidade (apenas Android) */}
            {Platform.OS === "android" && flashOn && (
              <View style={styles.sliderContainer}>
                <Text style={styles.sliderText}>
                  Nota: O controle de intensidade não está disponível nesta
                  versão
                </Text>
                <Slider
                  style={styles.slider}
                  minimumValue={0.1}
                  maximumValue={1}
                  step={0.1}
                  value={intensity}
                  onValueChange={handleIntensityChange}
                  minimumTrackTintColor="#FFFFFF"
                  maximumTrackTintColor="#000000"
                  thumbTintColor="#FFFFFF"
                  disabled={false}
                />
              </View>
            )}
          </>
        )}

        {/* Botão para alternar modo estroboscópio */}
        {isSosOn ? (
          <TouchableOpacity
            style={[styles.button, { backgroundColor: "#bebebe" }]}
            activeOpacity={1}
          >
            <Text style={styles.buttonText}>S.O.S Ativado</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[
              styles.button,
              { backgroundColor: isStrobeOn ? "#ffd900" : "#1E90FF" },
            ]}
            onPress={() => setIsStrobeOn((prev) => !prev)}
            disabled={isSosOn} // Desativa se o S.O.S estiver ativo
          >
            <Text style={styles.buttonText}>
              {isStrobeOn ? "Desativar Estroboscópio" : "Ativar Estroboscópio"}
            </Text>
          </TouchableOpacity>
        )}

        {/* Botão para emitir sinal de S.O.S */}
        <TouchableOpacity
          style={[
            styles.button,
            { backgroundColor: isSosOn ? "#ff5100" : "#483D8B" },
          ]}
          onPress={playSosSignal}
          disabled={isSosOn} // Desativa se o S.O.S estiver ativo
        >
          <Text style={styles.buttonText}>
            {isSosOn ? "Emitindo S.O.S..." : "Emitir Sinal S.O.S"}
          </Text>
        </TouchableOpacity>

        {/* Botão para ativa/desativar chacoalhar */}
        <TouchableOpacity
          onPress={() => setIsShake((prev) => !prev)}
          style={[
            styles.button,
            { backgroundColor: isShake ? "#a74dc2" : "#b93d81" },
          ]}
        >
          <Text style={styles.buttonText}>
            {isShake ? "Desativar Chacoalhar" : "Ativar Chacoalhar"}
          </Text>
        </TouchableOpacity>

        {/* Debug do Accelerometer */}
        <Text style={styles.debugText}>
          x: {data.x.toFixed(2)}, y: {data.y.toFixed(2)}, z: {data.z.toFixed(2)}
        </Text>
      </View>
    </View>
  );
}

// Estilos da aplicação
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  hiddenCamera: {
    width: 1,
    height: 1,
    position: "absolute",
    opacity: 0,
  },
  contentContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    gap: 20,
  },
  message: {
    textAlign: "center",
    paddingBottom: 10,
    color: "#fff",
    fontSize: 16,
  },
  button: {
    padding: 20,
    borderRadius: 10,
    width: "100%",
    alignItems: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
  },
  debugText: {
    color: "#fff",
    fontSize: 14,
    opacity: 0.7,
  },
  statusText: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
  },
  instructionText: {
    color: "#fff",
    fontSize: 16,
    opacity: 0.8,
    textAlign: "center",
  },
  sliderContainer: {
    width: "100%",
    alignItems: "center",
    marginTop: 10,
  },
  sliderText: {
    color: "#fff",
    fontSize: 14,
    marginBottom: 10,
    textAlign: "center",
    opacity: 0.8,
  },
  slider: {
    width: "100%",
    height: 40,
  },
});
