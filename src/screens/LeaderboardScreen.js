// src/screens/LeaderboardScreen.js
import React, { useEffect, useState } from "react";
import { View, Text } from "react-native";
import { db } from "../../firebase";
import { collection, getDocs } from "firebase/firestore";

export default function LeaderboardScreen() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const fetch = async () => {
      const snapshot = await getDocs(collection(db, "users"));
      const data = snapshot.docs.map(doc => doc.data());
      data.sort((a, b) => b.steps - a.steps);
      setUsers(data);
    };
    fetch();
  }, []);

  return (
    <View style={{ padding: 20 }}>
      {users.map((u, i) => (
        <Text key={i}>
          #{i + 1} {u.name} - {u.steps}
        </Text>
      ))}
    </View>
  );
}