import * as AuthSession from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import { GoogleAuthProvider, signInWithCredential } from "firebase/auth";
import React, { useEffect } from "react";
import { Button } from "react-native";
import { auth } from "../utils/firebase";

export default function GoogleLoginButton({ onLogin }) {
  // PRVO: generiši redirectUri kao varijablu
  const redirectUri = AuthSession.makeRedirectUri({ useProxy: true });
  console.log("Redirect URI:", redirectUri);

  // KORISTI redirectUri varijablu (NE inline!)
  const [request, response, promptAsync] = Google.useAuthRequest({
    expoClientId: "155800248896-51ehg5s08tc0l578tr8gkqpocf7djaij.apps.googleusercontent.com",
    androidClientId: "155800248896-67r8mlejhbh8nid8hcunuluv81mr0l76.apps.googleusercontent.com",
    redirectUri, // varijabla!
    scopes: ["profile", "email"],
  });

  useEffect(() => {
    if (response?.type === "success") {
      const { id_token } = response.params;
      const credential = GoogleAuthProvider.credential(id_token);
      signInWithCredential(auth, credential)
        .then((userCredential) => {
          if (onLogin) onLogin(userCredential.user);
        })
        .catch((err) => {
          alert("Login greška: " + err.message);
        });
    }
  }, [response]);

  return (
    <Button
      disabled={!request}
      title="Prijavi se Google nalogom"
      onPress={() => promptAsync()}
    />
  );
}
