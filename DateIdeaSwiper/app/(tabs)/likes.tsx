import { View, Text, FlatList } from "react-native";
import { useLikes } from "../../store/LikesContext";

export default function LikesScreen() {
  const { liked } = useLikes();

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <FlatList
        data={liked}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Text style={{ fontSize: 20, marginBottom: 10 }}>
            {item.title}
          </Text>
        )}
      />
    </View>
  );
}