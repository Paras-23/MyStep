// src/screens/RegisterScreen.js
import { useState } from "react";
import { Button, TextInput, View } from "react-native";

export default function RegisterScreen({ navigation }) {
  const [name, setName] = useState("");
  const [gpn, setGpn] = useState("");
  const [phone, setPhone] = useState("");

  const register = async () => {
    navigation.replace("Main");
    // await addDoc(collection(db, "users"), {
    //   name,
    //   gpn,
    //   phone,
    //   steps: Math.floor(Math.random() * 5000),
    //   teamId: null,
    // });

    // navigation.replace("Main");
  };

  return (
    <View style={{ padding: 20 }}>
      <TextInput placeholder="Name" onChangeText={setName} />
      <TextInput placeholder="GPN" onChangeText={setGpn} />
      <TextInput placeholder="Number" onChangeText={setPhone} />
      <Button title="Register" onPress={register} />
    </View>
  );
}
