// START: Uvoz potrebnog za rewarded ad
import { useEffect, useRef, useState } from "react";
import { createRewardedAdInstance, RewardedAdEventType } from "../utils/ads";
// END: Uvoz za rewarded ad

import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import {
  ActivityIndicator,
  Modal,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Toast from "react-native-toast-message";

import { useDukati } from "../context/DukatiContext";
import { useTreasureRef } from "../context/TreasureRefContext";

export default function AdRewardModal({ visible = true, onClose, onFlyCoin }) {
  const [loading, setLoading] = useState(false);
  const [coinAnim, setCoinAnim] = useState(false);

  const [adReady, setAdReady] = useState(false); // da li je reklama spremna
  const [adError, setAdError] = useState(null);

  const [lastWatched, setLastWatched] = useState(null); // FE cooldown
  const rewardGiven = useRef(false); // da ne dodeli reward dvaput

  const adButtonRef = useRef(null);
  const treasureRef = useTreasureRef();

  const { dukati, dodeliDukatePrekoBackenda, fetchDukatiSaServera } = useDukati();

  // Callback koji prikazuje "+30 dukata" i "U redu" dugme nakon flying coin animacije
  const handleCoinAnim = () => setCoinAnim(true);

  // START: Nova logika za rewarded ad instance
  const rewardedRef = useRef(null);

  useEffect(() => {
    let isMounted = true;
    rewardGiven.current = false;
    if (visible) {
      setLoading(true);
      setAdReady(false);
      setAdError(null);

      // --- Nova logika učitavanja reklame ---
      try {
        // Očisti prethodnu instancu ako postoji
        if (rewardedRef.current) {
          rewardedRef.current = null;
        }

        const rewarded = createRewardedAdInstance();
        rewardedRef.current = rewarded;

        // Kad se reklama učita, dozvoli klik
        const loadedListener = rewarded.addAdEventListener(
          RewardedAdEventType.LOADED,
          () => {
            if (isMounted) {
              setAdReady(true);
              setLoading(false);
            }
          }
        );

        // Greška pri učitavanju
        const errorListener = rewarded.addAdEventListener(
          RewardedAdEventType.ERROR,
          (err) => {
            if (isMounted) {
              setAdError(err);
              setLoading(false);
              setAdReady(false);
            }
            Toast.show({
              type: "error",
              text1: "Greška sa reklamom!",
              text2: err.message,
              position: "bottom",
            });
          }
        );

        rewarded.load();

        return () => {
          loadedListener && loadedListener();
          errorListener && errorListener();
          isMounted = false;
        };
      } catch (err) {
        setAdError(err);
        setLoading(false);
        setAdReady(false);
      }
    }
  }, [visible]);
  // END: Loadovanje rewarded ad

  // START: Prikaz reklame i flying coin nakon uspeha
  const handleWatchAd = async () => {
    const now = Date.now();
    if (lastWatched && now - lastWatched < 20_000) {
      Toast.show({
        type: "info",
        text1: "Morate sačekati",
        text2: "Možete gledati reklamu na svakih 20 sekundi.",
        position: "bottom",
        visibilityTime: 2000,
      });
      return;
    }
    if (!adReady) {
      Toast.show({
        type: "info",
        text1: "Reklama nije spremna",
        text2: "Pokušajte ponovo za par sekundi.",
        position: "bottom",
        visibilityTime: 2000,
      });
      return;
    }
    setLoading(true);
    setAdError(null);

    try {
      rewardGiven.current = false; // reset za svaki prikaz
      const rewarded = rewardedRef.current;

      if (!rewarded) throw new Error("Rewarded ad nije inicijalizovan!");

      // Dodaj event listenere za prikaz i nagradu
      const earnedListener = rewarded.addAdEventListener(
        RewardedAdEventType.EARNED_REWARD,
        (reward) => {
          if (!rewardGiven.current) {
            rewardGiven.current = true;
            adButtonRef.current?.measureInWindow?.((startX, startY, width, height) => {
              treasureRef.current?.measureInWindow?.((endX, endY, endWidth, endHeight) => {
                if (onFlyCoin) {
                  onFlyCoin(
                    { x: startX + width / 2, y: startY + height / 2 },
                    { x: endX + endWidth / 2, y: endY + endHeight / 2 },
                    handleCoinAnim
                  );
                }
              });
            });
          }
        }
      );

      const closedListener = rewarded.addAdEventListener(
        RewardedAdEventType.CLOSED,
        () => {
          earnedListener && earnedListener();
          closedListener && closedListener();
          setAdReady(false);
        }
      );

      rewarded.show();
      setLastWatched(now);
      setAdReady(false);
    } catch (err) {
      setAdError(err);
      Toast.show({
        type: "error",
        text1: "Greška!",
        text2: err.message || "Došlo je do greške sa reklamom.",
        position: "bottom",
      });
    } finally {
      setLoading(false);
    }
  };
  // END: Prikaz reklame i flying coin

  // START: Nova handleCoinComplete logika sa toast-om i proverom (ostaje tvoja backend nagrada)
  const handleCoinComplete = async () => {
    let sound;
    let stariBrojDukata = dukati;
    try {
      const noviBroj = await dodeliDukatePrekoBackenda(50, "ad_reward");
      if (fetchDukatiSaServera) await fetchDukatiSaServera();

      if (noviBroj === stariBrojDukata) {
        Toast.show({
          type: "info",
          text1: "Morate sačekati",
          text2: "Možete gledati reklamu na svakih 20 sekundi.",
          position: "bottom",
        });
      } else {
        const res = await Audio.Sound.createAsync(
          require("../assets/sounds/bling.mp3")
        );
        sound = res.sound;
        await sound.playAsync();
      }
    } catch (e) {
      Toast.show({
        type: "error",
        text1: "Greška!",
        text2: e.message || "Došlo je do greške.",
        position: "bottom",
      });
    } finally {
      if (sound) await sound.unloadAsync();
      setCoinAnim(false);
      setLoading(false);
      onClose();
    }
  };
  // END: Nova handleCoinComplete logika

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.3)",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <View
          style={{
            backgroundColor: "#18181b",
            borderRadius: 18,
            padding: 26,
            width: 340,
            alignItems: "center",
            elevation: 20,
            minHeight: 210,
            position: "relative",
          }}
        >
          {/* X dugme */}
          <TouchableOpacity
            onPress={onClose}
            style={{
              position: "absolute",
              top: 14,
              right: 14,
              zIndex: 20,
              backgroundColor: "#fbbf24",
              borderRadius: 16,
              width: 32,
              height: 32,
              alignItems: "center",
              justifyContent: "center",
              elevation: 3,
            }}
          >
            <Text style={{ color: "#222", fontWeight: "bold", fontSize: 22 }}>×</Text>
          </TouchableOpacity>

          <Text
            style={{
              color: "#fff",
              fontWeight: "bold",
              fontSize: 20,
              marginBottom: 18,
              textAlign: "center",
            }}
          >
            Gledaj reklamu za dukate
          </Text>

          {/* Dugme za pokretanje reklame */}
          {!loading && !coinAnim && (
            <TouchableOpacity
              ref={adButtonRef}
              style={{
                backgroundColor: adReady ? "#facc15" : "#e5e7eb",
                borderRadius: 10,
                paddingHorizontal: 36,
                paddingVertical: 13,
                marginTop: 12,
                alignSelf: "center",
                marginBottom: 4,
                minWidth: 180,
                opacity: adReady ? 1 : 0.5,
              }}
              onPress={handleWatchAd}
              disabled={!adReady}
            >
              <Text style={{ color: "#222", fontWeight: "bold", fontSize: 17 }}>
                {adReady ? "Pogledaj reklamu za 30 dukata" : "Reklama se učitava..."}
              </Text>
            </TouchableOpacity>
          )}

          {/* Loading animacija */}
          {loading && !coinAnim && (
            <View style={{ alignItems: "center", marginTop: 24 }}>
              <ActivityIndicator color="#facc15" size="large" />
              <Text
                style={{
                  color: "#facc15",
                  fontWeight: "bold",
                  fontSize: 15,
                  marginTop: 12,
                }}
              >
                {adReady ? "Prikazivanje reklame..." : "Učitavanje reklame..."}
              </Text>
            </View>
          )}

          {/* Animacija novčića + "U redu" dugme */}
          {coinAnim && (
            <View style={{ alignItems: "center", marginTop: 22 }}>
              <MaterialCommunityIcons name="coin" size={54} color="#ffd700" />
              <Text
                style={{
                  color: "#ffd700",
                  fontWeight: "bold",
                  fontSize: 19,
                  marginTop: 6,
                }}
              >
                +30 dukata!
              </Text>
              <TouchableOpacity
                style={{
                  marginTop: 18,
                  backgroundColor: "#facc15",
                  borderRadius: 12,
                  paddingVertical: 9,
                  paddingHorizontal: 34,
                  alignSelf: "center",
                }}
                onPress={handleCoinComplete}
              >
                <Text
                  style={{
                    color: "#222",
                    fontWeight: "bold",
                    fontSize: 17,
                  }}
                >
                  U redu
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Greška sa reklamom */}
          {adError && (
            <Text style={{ color: "red", marginTop: 14, textAlign: "center" }}>
              Došlo je do greške sa reklamom. Pokušajte ponovo kasnije.
            </Text>
          )}
        </View>
      </View>
    </Modal>
  );
}
