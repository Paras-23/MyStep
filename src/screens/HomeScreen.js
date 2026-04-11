import { Pedometer } from "expo-sensors";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";

export default function HomeScreen() {
  const [steps, setSteps] = useState(0);
  const [isAvailable, setIsAvailable] = useState("checking");

  useEffect(() => {
    let subscription;

    Pedometer.isAvailableAsync().then(
      (result) => setIsAvailable(String(result)),
      (error) => setIsAvailable("false"),
    );

    // Real-time step tracking
    subscription = Pedometer.watchStepCount((result) => {
      setSteps(result.steps);
    });

    // Get today's total steps
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const end = new Date();

    Pedometer.getStepCountAsync(start, end)
      .then((result) => {
        setSteps(result.steps);
      })
      .catch(() => {
        setSteps(0);
      });

    return () => {
      subscription && subscription.remove();
    };
  }, []);

  return (
    <View style={{ padding: 20 }}>
      <View style={card}>
        <Text style={title}>Steps Today</Text>
        <Text style={value}>{steps}</Text>
        <Text style={small}>Sensor: {isAvailable}</Text>
      </View>

      <View style={card}>
        <Text style={title}>Heart Rate</Text>
        <Text style={value}>72 bpm</Text>
      </View>

      <View style={card}>
        <Text style={title}>Calories</Text>
        <Text style={value}>210 kcal</Text>
      </View>

      <View style={card}>
        <Text style={title}>Team Progress</Text>
        <Text style={value}>12,000 steps</Text>
      </View>
    </View>
  );
}

const card = {
  backgroundColor: "#eee",
  padding: 20,
  marginBottom: 12,
  borderRadius: 12,
};

const title = {
  fontSize: 16,
  color: "#555",
};

const value = {
  fontSize: 28,
  fontWeight: "bold",
  marginTop: 5,
};

const small = {
  fontSize: 12,
  color: "gray",
  marginTop: 5,
};
