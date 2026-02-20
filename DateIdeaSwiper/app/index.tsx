import { View } from "react-native";
import Swiper from "react-native-deck-swiper";
import DateCard from "./components/DateCard";
import dates from "./data/dates";

export default function Home() {
  return (
    <View style={{ flex: 1 }}>
      <Swiper
        cards={dates}
        renderCard={(card) => <DateCard item={card} />}
        onSwipedRight={(i) => console.log("Liked:", dates[i].title)}
        onSwipedLeft={(i) => console.log("Passed:", dates[i].title)}
        stackSize={3}
        backgroundColor="#f2f2f2"
      />
    </View>
  );
}
